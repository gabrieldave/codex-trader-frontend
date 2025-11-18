'use client'

import { createClient } from '@/lib/supabase'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import toast, { Toaster } from 'react-hot-toast'
import { CODEX_PLANS } from '@/lib/plans'
import { processReferral } from '@/lib/referrals'
import { authorizedApiCall } from '@/lib/api'
import UsageSummary from '@/components/billing/UsageSummary'
import Link from 'next/link'
import PWAInstallButton from '@/components/PWAInstallButton'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

function Chat() {
  const [supabase] = useState(() => createClient())
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const router = useRouter()
  const selectedPlan = searchParams.get('plan')
  const referralCode = searchParams.get('ref') // Código de referido desde la URL
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [tokensRestantes, setTokensRestantes] = useState<number | null>(null)
  const [showReloadModal, setShowReloadModal] = useState(false)
  const [reloadAmount, setReloadAmount] = useState('10000')
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  
  // AbortController para cancelar peticiones activas (usamos ref para evitar problemas de closures)
  const currentAbortControllerRef = useRef<AbortController | null>(null)
  
  // Estados para conversaciones
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Array<{id: string, title: string, created_at: string, updated_at: string}>>([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  // Estado para controlar el menú hamburguesa (móvil)
  const [menuAbierto, setMenuAbierto] = useState(false)
  // Estado para controlar sidebar en escritorio (si el usuario lo cerró)
  const [sidebarCerradoDesktop, setSidebarCerradoDesktop] = useState(false)
  
  // Detectar tamaño de pantalla y ajustar sidebar solo al cargar
  useEffect(() => {
    const checkScreenSize = () => {
      // En escritorio (md: 768px+), verificar si el usuario cerró el sidebar antes
      if (window.innerWidth >= 768) {
        const wasClosed = sessionStorage.getItem('sidebarClosed') === 'true'
        setSidebarCerradoDesktop(wasClosed)
      } else {
        // En móvil, siempre cerrar el menú al cambiar a móvil
        setMenuAbierto(false)
      }
    }
    
    // Verificar al cargar
    checkScreenSize()
    
    // Escuchar cambios de tamaño
    window.addEventListener('resize', checkScreenSize)
    
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])
  
  // Estado para el modo de respuesta
  const [responseMode, setResponseMode] = useState<'fast' | 'deep'>('fast')
  
  // Estados para el formulario de login
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [isAuthLoading, setIsAuthLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Scroll automático al final de los mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Verificar el login del usuario y escuchar cambios
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error al obtener sesión:', error)
        }
        if (session) {
          console.log('✅ Sesión encontrada al cargar:', session.user.email)
          setUser(session.user)
          setAccessToken(session.access_token)
        } else {
          console.log('⚠️ No hay sesión al cargar la página')
        }
      } catch (err) {
        console.error('Error inesperado al verificar sesión:', err)
      }
      setLoading(false)
    }
    checkUser()

    // Variable para rastrear si ya enviamos el email de bienvenida
    let welcomeEmailSent = false
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔐 onAuthStateChange: event=${event}, hasSession=${!!session}, userEmail=${session?.user?.email || 'none'}`)
      
      if (session) {
        setUser(session.user)
        setAccessToken(session.access_token)
        
        // Si el usuario acaba de confirmar su email (SIGNED_IN después de confirmación)
        // o si hay parámetros de confirmación en la URL, notificar al backend
        const urlParams = new URLSearchParams(window.location.search)
        const emailConfirmed = urlParams.get('email_confirmed')
        const code = urlParams.get('code')
        const confirmed = urlParams.get('confirmed')
        
        console.log(`   URL params: email_confirmed=${emailConfirmed}, code=${!!code}, confirmed=${confirmed}`)
        
        // Detectar si es un nuevo registro (usuario recién confirmado)
        // Verificar si el usuario es nuevo (creado recientemente) o si hay parámetros de confirmación
        const userCreatedAt = session.user ? new Date(session.user.created_at).getTime() : 0
        const isRecentlyCreated = userCreatedAt > Date.now() - 300000 // Últimos 5 minutos (aumentado de 1 minuto)
        
        const isNewRegistration = (
          (event === 'SIGNED_IN' && (emailConfirmed === 'true' || code || confirmed === 'true')) ||
          (event === 'SIGNED_IN' && isRecentlyCreated) // Usuario creado recientemente
        )
        
        console.log(`   isNewRegistration: ${isNewRegistration}, welcomeEmailSent: ${welcomeEmailSent}`)
        
        if (isNewRegistration && session.access_token && !welcomeEmailSent) {
          console.log('✅ Usuario confirmado detectado en onAuthStateChange, notificando al backend para enviar email de bienvenida')
          welcomeEmailSent = true // Marcar como enviado para evitar duplicados
          
          try {
            console.log(`   Llamando a /users/notify-registration...`)
            const response = await authorizedApiCall('/users/notify-registration', {
              method: 'POST',
              body: JSON.stringify({})
            })
            
            console.log(`   Response status: ${response.status}`)
            
            if (response.ok) {
              const responseData = await response.json()
              console.log('✅ Email de bienvenida solicitado correctamente desde onAuthStateChange', responseData)
            } else {
              const errorText = await response.text()
              console.error('❌ Error al notificar registro:', response.status, errorText)
            }
          } catch (err) {
            console.error('❌ Error al notificar registro desde onAuthStateChange:', err)
            welcomeEmailSent = false // Permitir reintentar si falla
          }
        }
      } else {
        setUser(null)
        setAccessToken(null)
        setMessages([])
        setTokensRestantes(null)
        welcomeEmailSent = false // Reset cuando se cierra sesión
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  // Manejar mensajes de confirmación de email desde la URL
  useEffect(() => {
    const confirmed = searchParams.get('confirmed')
    const emailConfirmed = searchParams.get('email_confirmed')
    const code = searchParams.get('code') // Code PKCE de Supabase
    const error = searchParams.get('error')
    const message = searchParams.get('message')
    const checkoutStatus = searchParams.get('checkout') // 'success' o 'cancelled'
    const sessionId = searchParams.get('session_id') // ID de sesión de Stripe
    
    // Si hay un code PKCE, intercambiarlo por una sesión
    if (code) {
      console.log('📧 Code PKCE detectado, intercambiando por sesión...')
      supabase.auth.exchangeCodeForSession(code)
        .then(({ data, error: exchangeError }) => {
          if (exchangeError) {
            console.error('❌ Error al intercambiar code por sesión:', exchangeError)
            return
          }
          if (data.session) {
            console.log('✅ Sesión establecida correctamente desde code PKCE')
            setUser(data.session.user)
            setAccessToken(data.session.access_token)
          }
        })
        .catch((err) => {
          console.error('❌ Error inesperado al intercambiar code:', err)
        })
    }
    
    // Si hay parámetros de confirmación, esperar a que se establezca la sesión
    if (confirmed === 'true' || emailConfirmed === 'true') {
      console.log('[PAGE] 📧 Confirmación detectada en URL, verificando sesión...')
      
      // IMPORTANTE: Asegurar que el loading se resuelva incluso si no hay sesión
      setLoading(false)
      
      // OPCIÓN 2: Llamar al endpoint INMEDIATAMENTE sin esperar sesión
      // Esto asegura que el email se envíe incluso si hay problemas con la sesión
      console.log('[PAGE] 📧 Llamando al endpoint inmediatamente (sin esperar sesión)...')
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.codextrader.tech'
      const notifyUrl = `${backendUrl}/users/notify-registration`
      
      // Intentar llamar al endpoint con el code si está disponible
      fetch(notifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token_hash: code || undefined
        })
      })
      .then(async response => {
        console.log('[PAGE] 📧 Response status (llamada inmediata):', response.status)
        if (response.ok) {
          const responseData = await response.json()
          console.log('[PAGE] ✅ Email de bienvenida solicitado correctamente (llamada inmediata):', responseData)
        } else {
          const errorText = await response.text()
          console.error('[PAGE] ❌ Error en llamada inmediata:', response.status, errorText)
        }
      })
      .catch(fetchError => {
        console.error('[PAGE] ❌ Error de red en llamada inmediata:', fetchError)
      })
      
      // Intentar obtener la sesión después de un delay para dar tiempo a que se establezca
      setTimeout(async () => {
        try {
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError) {
            console.log('[PAGE] ⚠️ Error al obtener sesión:', sessionError)
            // Mostrar mensaje y cambiar a modo login
            toast.success('¡Cuenta confirmada exitosamente! Por favor, inicia sesión para continuar.')
            setAuthMode('login')
            return
          }
          
          if (sessionData?.session?.access_token && sessionData.session.user) {
            console.log('[PAGE] ✅ Sesión encontrada después de confirmación:', sessionData.session.user.email)
            setUser(sessionData.session.user)
            setAccessToken(sessionData.session.access_token)
            
            // IMPORTANTE: Cargar tokens después de establecer sesión
            loadTokens()
            loadConversations()
            
            // Notificar al backend para enviar email de bienvenida (segunda llamada por si la primera falló)
            try {
              const response = await authorizedApiCall('/users/notify-registration', {
                method: 'POST',
                body: JSON.stringify({})
              })
              
              if (response.ok) {
                const responseData = await response.json()
                console.log('[PAGE] ✅ Email de bienvenida solicitado correctamente (con sesión):', responseData)
                toast.success('¡Cuenta confirmada exitosamente! El email de bienvenida llegará pronto.')
              } else {
                const errorText = await response.text()
                console.error('[PAGE] ❌ Error al notificar registro:', response.status, errorText)
                toast.success('¡Cuenta confirmada exitosamente! (El email de bienvenida puede tardar un momento)')
              }
            } catch (err) {
              console.error('[PAGE] ❌ Error al notificar registro después de confirmación:', err)
              toast.success('¡Cuenta confirmada exitosamente! (El email de bienvenida puede tardar un momento)')
            }
          } else {
            console.log('[PAGE] ⚠️ No hay sesión después de confirmación, el usuario debe hacer login')
            toast.success('¡Cuenta confirmada exitosamente! Por favor, inicia sesión para continuar.')
            setAuthMode('login')
          }
        } catch (err) {
          console.error('[PAGE] ❌ Error al verificar sesión después de confirmación:', err)
          toast.success('¡Cuenta confirmada exitosamente! Por favor, inicia sesión para continuar.')
          setAuthMode('login')
        }
      }, 1500) // Aumentar a 1.5 segundos para dar más tiempo
      
      // Limpiar el parámetro de la URL (incluyendo code si existe) después de un delay
      setTimeout(() => {
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('confirmed')
        newUrl.searchParams.delete('email_confirmed')
        newUrl.searchParams.delete('code')
        router.replace(newUrl.pathname + newUrl.search, { scroll: false })
      }, 2000)
    } else if (error) {
      const errorMessage = message || 'Error al confirmar tu cuenta'
      toast.error(errorMessage)
      // Limpiar los parámetros de la URL
      router.replace(window.location.pathname, { scroll: false })
    }
    
    // Manejar resultado del checkout de Stripe
    if (checkoutStatus === 'success') {
      console.log('✅ Checkout exitoso detectado, session_id:', sessionId)
      toast.success('¡Pago exitoso! Tu suscripción ha sido activada. Recargando información...')
      
      // Si el usuario está autenticado, recargar tokens y conversaciones
      if (accessToken && user) {
        // Recargar tokens para reflejar la nueva suscripción
        loadTokens()
        loadConversations()
      }
      
      // Limpiar los parámetros de la URL
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('checkout')
      newUrl.searchParams.delete('session_id')
      router.replace(newUrl.pathname + newUrl.search, { scroll: false })
    } else if (checkoutStatus === 'cancelled') {
      console.log('⚠️ Checkout cancelado por el usuario')
      toast.error('El pago fue cancelado. Puedes intentar nuevamente cuando estés listo.')
      
      // Limpiar los parámetros de la URL
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('checkout')
      router.replace(newUrl.pathname + newUrl.search, { scroll: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router, accessToken, user, supabase])

  // Cargar tokens y conversaciones cuando el usuario está logueado
  useEffect(() => {
      if (accessToken && user) {
        loadTokens()
        loadConversations()
        checkIsAdmin()
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, user])

  
  // Cargar mensajes cuando cambia la conversación actual
  useEffect(() => {
    if (accessToken && currentConversationId) {
      // Si se cambia de conversación mientras está cargando, abortar la petición activa
      if (currentAbortControllerRef.current) {
        currentAbortControllerRef.current.abort()
        currentAbortControllerRef.current = null
      }
      // Cancelar el estado de carga para permitir el cambio inmediato
      setIsLoading(false)
      setChatError(null)
      loadConversationMessages(currentConversationId)
    } else if (accessToken && !currentConversationId) {
      // Si no hay conversación actual, abortar peticiones activas y limpiar
      if (currentAbortControllerRef.current) {
        currentAbortControllerRef.current.abort()
        currentAbortControllerRef.current = null
      }
      setMessages([])
      setIsLoading(false)
      setChatError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversationId, accessToken])

  // Función para verificar si el usuario es admin
  const checkIsAdmin = async () => {
    if (!accessToken) {
      setIsAdmin(false)
      return
    }
    
    try {
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/me/is-admin`, {
        method: 'GET',
        headers
      })
      
      if (response.ok) {
        const data = await response.json()
        setIsAdmin(data.is_admin || false)
      } else {
        setIsAdmin(false)
      }
    } catch (error) {
      console.error('Error al verificar si es admin:', error)
      setIsAdmin(false)
    }
  }

  // Función para cargar tokens restantes
  const loadTokens = async () => {
    if (!accessToken) return
    setIsLoadingTokens(true)
    try {
      // 🚨 DEBUG: Verificar accessToken antes de hacer la llamada
      console.log('[page.tsx] DEBUG accessToken antes de /api/tokens:', accessToken ? `${accessToken.substring(0, 20)}...` : 'null/undefined')
      
      const headers = {
        'Authorization': `Bearer ${accessToken}`
      }
      console.log('[page.tsx] DEBUG Headers que se envían a /api/tokens:', headers)
      
      const response = await fetch('/api/tokens', {
        headers
      })
      if (response.ok) {
        const data = await response.json()
        setTokensRestantes(data.tokens_restantes || data.tokens || null)
      }
    } catch (error) {
      console.error('Error al cargar tokens:', error)
    } finally {
      setIsLoadingTokens(false)
    }
  }

  // Función para recargar tokens
  const handleReloadTokens = async () => {
    if (!accessToken || !reloadAmount) return
    const cantidad = parseInt(reloadAmount)
    if (isNaN(cantidad) || cantidad <= 0) {
      toast.error('Por favor, ingresa una cantidad válida')
      return
    }

    setIsLoadingTokens(true)
    try {
      const response = await fetch('/api/tokens/reload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ cantidad })
      })

      if (response.ok) {
        const data = await response.json()
        setTokensRestantes(data.tokens_totales)
        setShowReloadModal(false)
        setReloadAmount('10000')
        toast.success(`¡Tokens recargados! Total: ${data.tokens_totales.toLocaleString()}`)
      } else {
        let errorMessage = 'Error al recargar tokens'
        try {
          const error = await response.json()
          errorMessage = error.error || error.detail || errorMessage
        } catch {
          errorMessage = `Error ${response.status}: ${response.statusText}`
        }
        toast.error(`Error: ${errorMessage}`)
        console.error('Error completo:', errorMessage)
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error de conexión. Verifica que el backend esté corriendo en http://localhost:8000')
    } finally {
      setIsLoadingTokens(false)
    }
  }

  // Función de emergencia para resetear tokens
  const handleResetTokens = async () => {
    if (!accessToken) {
      toast.error('No hay token de autenticación')
      return
    }
    
    const confirmar = confirm('¿Estás seguro de resetear tus tokens a 20,000? Esto sobrescribirá tu balance actual.')
    if (!confirmar) {
      return
    }

    setIsLoadingTokens(true)
    try {
      // Llamar directamente al backend (el API route tiene problemas)
      console.log('🔄 Llamando directamente al backend para resetear tokens...')
      const response = await authorizedApiCall('/tokens/reset?cantidad=20000', {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        setTokensRestantes(data.tokens_totales)
        toast.success(`¡Tokens reseteados a ${data.tokens_totales.toLocaleString()}!`)
        console.log('✅ Tokens reseteados exitosamente:', data)
      } else {
        let errorMessage = 'Error al resetear tokens'
        try {
          const error = await response.json()
          errorMessage = error.error || error.detail || errorMessage
        } catch {
          const errorText = await response.text().catch(() => '')
          errorMessage = errorText || `Error ${response.status}: ${response.statusText}`
        }
        console.error('❌ Error completo:', response.status, errorMessage)
        toast.error(`Error: ${errorMessage}`)
      }
    } catch (error) {
      console.error('❌ Error de conexión:', error)
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
      toast.error(`Error de conexión: ${errorMsg}. Verifica que el backend esté corriendo en http://localhost:8000`)
    } finally {
      setIsLoadingTokens(false)
    }
  }

  // Función para cargar lista de conversaciones
  const loadConversations = async () => {
    if (!accessToken) return
    setIsLoadingConversations(true)
    try {
      // 🚨 DEBUG: Verificar accessToken antes de hacer la llamada
      console.log('[page.tsx] DEBUG accessToken antes de /api/chat-sessions:', accessToken ? `${accessToken.substring(0, 20)}...` : 'null/undefined')
      
      const response = await fetch('/api/chat-sessions?limit=50', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.sessions && data.sessions.length > 0) {
          setConversations(data.sessions)
          // Si no hay conversación actual, seleccionar la más reciente
          if (!currentConversationId && data.sessions.length > 0) {
            setCurrentConversationId(data.sessions[0].id)
          }
        }
      }
    } catch (error) {
      console.error('Error al cargar conversaciones:', error)
    } finally {
      setIsLoadingConversations(false)
    }
  }
  
  // Función para cargar mensajes de una conversación específica
  const loadConversationMessages = async (conversationId: string) => {
    if (!accessToken) return
    try {
      const response = await fetch(`/api/chat-sessions/${conversationId}/messages?limit=100`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.messages && data.messages.length > 0) {
          interface ConversationMessage {
            id?: string
            message_role: 'user' | 'assistant'
            message_content: string
            created_at?: string
          }
          const conversationMessages: Message[] = data.messages.map((msg: ConversationMessage, idx: number) => ({
            id: msg.id || `msg-${idx}-${msg.created_at}`,
            role: msg.message_role,
            content: msg.message_content,
            created_at: msg.created_at
          }))
          setMessages(conversationMessages)
        } else {
          setMessages([])
        }
      }
    } catch (error) {
      console.error('Error al cargar mensajes de la conversación:', error)
    }
  }
  
  // Función para crear nueva conversación
  // Permite crear nueva conversación incluso cuando está cargando otra
  const createNewConversation = async () => {
    if (!accessToken) return
    
    // Abortar cualquier petición activa antes de crear nueva conversación
    if (currentAbortControllerRef.current) {
      currentAbortControllerRef.current.abort()
      currentAbortControllerRef.current = null
    }
    
    // Resetear estado de carga para permitir crear nueva conversación
    setIsLoading(false)
    setChatError(null)
    
    try {
      const response = await fetch('/api/chat-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ title: null })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.session) {
          // Actualizar lista de conversaciones
          await loadConversations()
          // Seleccionar la nueva conversación (esto reseteará el estado de carga automáticamente)
          setCurrentConversationId(data.session.id)
          
          // Agregar mensaje automático del asistente al crear nueva conversación
          const welcomeMessage: Message = {
            id: `assistant-welcome-${Date.now()}`,
            role: 'assistant',
            content: '👋 Hola, soy Codex Trader.\n\nSoy un asistente de IA especializado en trading. Estoy entrenado con contenido profesional de trading para ayudarte a estudiar mejor:\n\n- Gestión de riesgo y manejo de capital\n- Análisis técnico y lectura de gráficos\n- Psicología del trader y control emocional\n- Diseño y ajuste de estrategias según tu estilo (scalping, intradía, swing, etc.)\n\nCuéntame qué quieres aprender o qué duda tienes, y empezamos.'
          }
          setMessages([welcomeMessage])
          toast.success('Nueva conversación creada')
        }
      }
    } catch (error) {
      console.error('Error al crear conversación:', error)
      toast.error('Error al crear nueva conversación')
    }
  }
  
  // Función para manejar clic en chips de sugerencias
  // Envía directamente el mensaje como si el usuario lo hubiera escrito y presionado "Enviar"
  const handleSuggestionClick = async (suggestion: string) => {
    await sendUserMessage(suggestion)
  }
  
  // Función para eliminar conversación
  const deleteConversation = async (conversationId: string) => {
    if (!accessToken) return
    try {
      const response = await fetch(`/api/chat-sessions/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        // Si se eliminó la conversación actual, crear una nueva o limpiar
        if (currentConversationId === conversationId) {
          setCurrentConversationId(null)
          setMessages([])
        }
        // Recargar lista de conversaciones
        await loadConversations()
        toast.success('Conversación eliminada')
      }
    } catch (error) {
      console.error('Error al eliminar conversación:', error)
      toast.error('Error al eliminar conversación')
    }
  }

  // Función reutilizable para enviar mensaje del usuario
  const sendUserMessage = async (messageText: string) => {
    if (!messageText.trim() || !accessToken || isLoading) return

    // Guardar el conversationId actual para verificar después de la respuesta
    const conversationIdAtRequest = currentConversationId

    // Abortar cualquier petición anterior si existe
    if (currentAbortControllerRef.current) {
      currentAbortControllerRef.current.abort()
    }

    // Crear nuevo AbortController para esta petición
    const controller = new AbortController()
    currentAbortControllerRef.current = controller

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText.trim()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setChatError(null)

    try {
      // 🚨 DEBUG: Verificar accessToken antes de hacer la llamada
      console.log('[page.tsx] DEBUG accessToken antes de /api/chat-simple:', accessToken ? `${accessToken.substring(0, 20)}...` : 'null/undefined')
      
      const response = await fetch('/api/chat-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMessage.content }],
          conversation_id: conversationIdAtRequest,
          response_mode: responseMode
        }),
        signal: controller.signal
      })

      // Verificar si la petición fue abortada
      if (controller.signal.aborted) {
        return
      }

      // Verificar si el usuario cambió de conversación mientras se procesaba la respuesta
      if (currentConversationId !== conversationIdAtRequest) {
        // Ignorar esta respuesta, el usuario cambió de conversación
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        if (response.status === 401) {
          setChatError('No autorizado. Por favor, inicia sesión nuevamente.')
          toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.')
        } else if (response.status === 402) {
          setChatError('Tokens agotados. Por favor, recarga.')
          toast.error('Tokens agotados. Por favor, recarga tokens.')
        } else {
          setChatError(errorData.error || 'Error al procesar la consulta')
          toast.error(errorData.error || 'Error al procesar la consulta')
        }
        setIsLoading(false)
        currentAbortControllerRef.current = null
        return
      }

      const data = await response.json()

      // Verificar nuevamente si el usuario cambió de conversación después de recibir la respuesta
      if (currentConversationId !== conversationIdAtRequest) {
        // Ignorar esta respuesta, el usuario cambió de conversación
        setIsLoading(false)
        currentAbortControllerRef.current = null
        return
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message || data.response || 'Sin respuesta'
      }

      setMessages(prev => [...prev, assistantMessage])
      
      // Actualizar conversation_id si se creó una nueva conversación
      if (data.conversation_id && data.conversation_id !== currentConversationId) {
        setCurrentConversationId(data.conversation_id)
        // Recargar conversaciones para actualizar la lista
        loadConversations()
      }
      
      if (data.tokens_restantes !== undefined) {
        setTokensRestantes(data.tokens_restantes)
      } else {
        loadTokens()
      }
    } catch (error) {
      // Ignorar errores de abort
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      
      // Verificar si el usuario cambió de conversación
      if (currentConversationId !== conversationIdAtRequest) {
        return
      }
      
      console.error('Error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
      setChatError(errorMsg)
      toast.error(errorMsg)
    } finally {
      // Solo actualizar el estado si todavía estamos en la misma conversación
      if (currentConversationId === conversationIdAtRequest) {
        setIsLoading(false)
      }
      // Limpiar el AbortController solo si todavía es el mismo (no fue abortado por cambio de conversación)
      if (currentAbortControllerRef.current === controller) {
        currentAbortControllerRef.current = null
      }
    }
  }

  // Función para manejar el submit del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    await sendUserMessage(input)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }
  
  // Función de Login con formulario
  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!email.trim() || !password.trim()) {
      toast.error('Por favor, completa todos los campos')
      return
    }
    
    setIsAuthLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password: password.trim() 
      })
      
      if (error) {
        toast.error(`Error al iniciar sesión: ${error.message}`)
        return
      }
      
      if (data?.session) {
        toast.success(`¡Bienvenido, ${data.session.user.email}!`)
        setUser(data.session.user)
        setAccessToken(data.session.access_token)
        // Limpiar formulario
        setEmail('')
        setName('')
        setPassword('')
        setConfirmPassword('')
        
        // Procesar código de referido si existe
        if (referralCode) {
          try {
            await processReferral(referralCode)
            toast.success('¡Código de referido aplicado correctamente!')
          } catch (error) {
            // No mostrar error si falla el referido, solo loguear
            console.error('Error al procesar código de referido:', error)
          }
        }
        
        // Si hay un plan seleccionado, redirigir a planes después del login
        if (selectedPlan) {
          router.push(`/planes?selected=${selectedPlan}`)
        }
      }
    } catch (err) {
      toast.error(`Error inesperado: ${err instanceof Error ? err.message : 'Error desconocido'}`)
    } finally {
      setIsAuthLoading(false)
    }
  }

  // Función de Registro con formulario
  const handleSignUp = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!email.trim() || !password.trim() || !name.trim()) {
      toast.error('Por favor, completa todos los campos')
      return
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      toast.error('Por favor, ingresa un email válido')
      return
    }
    
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    
    setIsAuthLoading(true)
    try {
      // Determinar la URL de redirección: usar variable de entorno en producción, o window.location.origin
      const getRedirectUrl = () => {
        // En producción, usar la variable de entorno si está disponible
        if (typeof window !== 'undefined') {
          // Si estamos en producción (no localhost), usar window.location.origin
          if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            return `${window.location.origin}/auth/callback`
          }
          // En desarrollo, usar localhost
          return 'http://localhost:3000/auth/callback'
        }
        // Fallback para SSR
        return process.env.NEXT_PUBLIC_SITE_URL 
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
          : 'http://localhost:3000/auth/callback'
      }
      
      const { data, error } = await supabase.auth.signUp({ 
        email: email.trim(), 
        password: password.trim(),
        options: {
          emailRedirectTo: getRedirectUrl()
        }
      })
      
      if (error) {
        toast.error(`Error al registrarse: ${error.message}`)
        return
      }
      
      if (data?.user) {
        // Si hay sesión inmediata, el usuario ya está autenticado
        if (data.session) {
          toast.success(`¡Registro exitoso! Usuario creado: ${data.user.email}`)
          
          // IMPORTANTE: Notificar al backend sobre el nuevo registro (para enviar emails)
          // Esto se hace en segundo plano y no bloquea el flujo
          if (data.session.access_token) {
            console.log('📧 Registro con sesión inmediata detectado, notificando al backend...')
            try {
              console.log(`   Llamando a /users/notify-registration...`)
              const response = await authorizedApiCall('/users/notify-registration', {
                method: 'POST',
                body: JSON.stringify({})
              })
              
              console.log(`   Response status: ${response.status}`)
              
              if (response.ok) {
                const responseData = await response.json()
                console.log('✅ Emails de registro enviados correctamente (admin + bienvenida)', responseData)
              } else {
                const errorText = await response.text()
                console.error('❌ Error al notificar registro:', response.status, errorText)
              }
            } catch (error) {
              console.error('❌ Error al notificar registro (no crítico):', error)
            }
          } else {
            console.warn('⚠️ No hay access_token en la sesión inmediata')
          }
        } else {
          // Si no hay sesión, Supabase requiere confirmación de email
          toast.success(`¡Registro exitoso! Por favor, revisa tu email (${data.user.email}) para confirmar tu cuenta.`)
          console.log('⚠️ Usuario registrado pero requiere confirmación de email. Los emails se enviarán después de confirmar.')
        }
        
        // Procesar código de referido si existe (después del registro)
        if (referralCode) {
          try {
            await processReferral(referralCode)
            toast.success('¡Código de referido aplicado correctamente!')
          } catch (error) {
            // No mostrar error si falla el referido, solo loguear
            console.error('Error al procesar código de referido:', error)
          }
        }
        
        // Cambiar a modo login después del registro
        setAuthMode('login')
        setName('')
        setPassword('')
        setConfirmPassword('')
        
        // Si hay un plan seleccionado, redirigir a planes después del registro
        if (selectedPlan) {
          router.push(`/planes?selected=${selectedPlan}`)
        }
      } else if (data?.user) {
        // Si solo hay user pero no session, esperar a que se confirme el email
        toast.success(`¡Registro exitoso! Revisa tu email para confirmar tu cuenta.`)
        
        // IMPORTANTE: El email de bienvenida se enviará cuando el usuario confirme su email
        // a través del callback /auth/callback
        console.log('Usuario creado, esperando confirmación de email. El email de bienvenida se enviará después de confirmar.')
        
        setAuthMode('login')
        setName('')
        setPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      toast.error(`Error inesperado: ${err instanceof Error ? err.message : 'Error desconocido'}`)
    } finally {
      setIsAuthLoading(false)
    }
  }


  // Función de Logout
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        toast.error('Error al cerrar sesión')
      } else {
        toast.success('Sesión cerrada correctamente')
      }
      setUser(null)
      setAccessToken(null)
    } catch {
      toast.error('Error inesperado al cerrar sesión')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
        <Toaster position="top-center" />
        
        {/* Fondo con patrones sutiles */}
        <div className="absolute inset-0 opacity-5">
          {/* Patrón de red neuronal / circuitos */}
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" className="text-cyan-400"/>
          </svg>
        </div>
        
        {/* Gráfico de velas japonesas difuminado */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute bottom-0 left-0 w-full h-64 flex items-end justify-center gap-1">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="w-3 bg-cyan-400"
                style={{
                  height: `${Math.random() * 100 + 20}%`,
                  opacity: Math.random() * 0.5 + 0.3,
                }}
              />
            ))}
          </div>
        </div>

        {/* Contenedor principal */}
        <main className="relative z-10 flex-1 flex items-center py-8 sm:py-12 lg:py-0">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 flex-col lg:flex-row gap-8 lg:gap-12">
            {/* Hero Section - Izquierda (Desktop) / Arriba (Mobile) */}
            <div className="flex-1 flex flex-col justify-center w-full lg:w-auto">
            <div className="max-w-xl mx-auto lg:mx-0 px-2 sm:px-0">
              {/* Logo y Título */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 tracking-tight">
                CODEX TRADER
              </h1>
              
              <h2 className="text-lg sm:text-xl lg:text-2xl text-cyan-400 mb-6 font-semibold">
                Asistente de IA especializado en Trading
              </h2>
              
              <p className="text-base sm:text-lg text-gray-300 mb-6 sm:mb-8 leading-relaxed">
                Entrenado con años de estudio en trading profesional para responder tus dudas al instante.
              </p>
              
              <p className="text-sm sm:text-base text-gray-400 mb-6 sm:mb-8 leading-relaxed">
                Accede a un cerebro enfocado en trading que analiza contenido profesional y te ayuda a entender conceptos, estrategias y psicología del mercado en un solo lugar.
              </p>
              
              {/* Bullets de beneficios */}
              <div className="space-y-3 sm:space-y-4 mb-8 sm:mb-10">
                <div className="flex items-start gap-3">
                  <span className="text-xl sm:text-2xl mt-0.5 sm:mt-1 flex-shrink-0">📘</span>
                  <p className="text-sm sm:text-base text-gray-300 flex-1">Explicaciones claras de conceptos avanzados</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xl sm:text-2xl mt-0.5 sm:mt-1 flex-shrink-0">📊</span>
                  <p className="text-sm sm:text-base text-gray-300 flex-1">Ideas de estrategia basadas en contenido profesional</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xl sm:text-2xl mt-0.5 sm:mt-1 flex-shrink-0">🧠</span>
                  <p className="text-sm sm:text-base text-gray-300 flex-1">Respuestas con contexto, no opiniones al azar</p>
                </div>
              </div>
              
              {/* Branding */}
              <div className="pt-6 border-t border-gray-700">
                <p className="text-sm text-gray-400 mb-2">
                  Desarrollado por <span className="text-cyan-400 font-semibold">Todos Somos Traders</span>
                </p>
                <p className="text-xs text-gray-500">
                  Plataforma educativa de trading enfocada en formación y análisis, no en promesas de ganancias.
                </p>
              </div>
              
              {/* Ejemplos de preguntas */}
              <div className="mt-8 sm:mt-10 p-4 sm:p-5 bg-gray-800/30 backdrop-blur-sm rounded-lg border border-gray-700/50">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-300 mb-3">
                  Ejemplos de lo que puedes preguntar:
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm text-gray-400">
                  <li>• Explícame gestión de riesgo para swing trading.</li>
                  <li>• ¿Cómo combinan soportes, resistencias y volumen los profesionales?</li>
                  <li>• ¿Qué recomiendan para controlar las emociones al operar?</li>
                </ul>
              </div>
            </div>
          </div>

            {/* Tarjeta de Login - Derecha (Desktop) / Abajo (Mobile) */}
            <div className="flex-shrink-0 w-full lg:w-[500px] xl:w-[550px] flex items-center justify-center px-4 sm:px-0">
            <div className="w-full max-w-[420px] lg:max-w-md">
              {/* Tarjeta con glassmorphism */}
              <div className="bg-gray-800/40 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700/50 p-6 sm:p-8 lg:p-10">
                {/* Tabs */}
                <div className="flex mb-8 bg-gray-900/50 rounded-lg p-1">
                  <button
                    onClick={() => {
                      setAuthMode('login')
                      setEmail('')
                      setName('')
                      setPassword('')
                      setConfirmPassword('')
                    }}
                    className={`flex-1 py-2.5 px-4 rounded-md text-sm font-semibold transition-all ${
                      authMode === 'login'
                        ? 'bg-cyan-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode('signup')
                      setEmail('')
                      setName('')
                      setPassword('')
                      setConfirmPassword('')
                    }}
                    className={`flex-1 py-2.5 px-4 rounded-md text-sm font-semibold transition-all ${
                      authMode === 'signup'
                        ? 'bg-cyan-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Crear Cuenta
                  </button>
                </div>

                {/* Título según modo */}
                {authMode === 'signup' && (
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Crear cuenta en Codex Trader
                    </h2>
                    <p className="text-sm text-gray-400">
                      Crea tu acceso y empieza a estudiar trading con tu asistente de IA especializado.
                    </p>
                  </div>
                )}

                {/* Formulario */}
                <form onSubmit={authMode === 'login' ? handleLogin : handleSignUp} className="space-y-5">
                  {/* Nombre (solo en registro) */}
                  {authMode === 'signup' && (
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                        Nombre
                      </label>
                      <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Tu nombre"
                        className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-900/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                        disabled={isAuthLoading}
                      />
                    </div>
                  )}

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-900/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                      required
                      disabled={isAuthLoading}
                    />
                  </div>

                  {/* Contraseña */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                      Contraseña
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={authMode === 'login' ? 'Tu contraseña' : 'Crea una contraseña segura'}
                        className="w-full px-4 py-3 pr-10 border border-gray-600 rounded-lg bg-gray-900/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                        required
                        disabled={isAuthLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.97 9.97 0 015 12c0 1.657.53 3.194 1.43 4.448m0 0L3 21m2.43-4.552L21 3" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirmar Contraseña (solo en registro) */}
                  {authMode === 'signup' && (
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                        Confirmar Contraseña
                      </label>
                      <div className="relative">
                        <input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirma tu contraseña"
                          className="w-full px-4 py-3 pr-10 border border-gray-600 rounded-lg bg-gray-900/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                          required
                          disabled={isAuthLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                        >
                          {showConfirmPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.97 9.97 0 015 12c0 1.657.53 3.194 1.43 4.448m0 0L3 21m2.43-4.552L21 3" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Recordar sesión (solo en login) */}
                  {authMode === 'login' && (
                    <div className="flex items-center">
                      <input
                        id="rememberMe"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 text-cyan-600 bg-gray-900 border-gray-600 rounded focus:ring-cyan-500 focus:ring-2"
                      />
                      <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-300">
                        Recordar sesión
                      </label>
                    </div>
                  )}

                  {/* Botón de envío */}
                  <button
                    type="submit"
                    disabled={isAuthLoading}
                    className="w-full py-3.5 px-4 font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isAuthLoading ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        {authMode === 'login' ? 'Iniciando sesión...' : 'Creando cuenta...'}
                      </span>
                    ) : (
                      authMode === 'login' ? 'Entrar al asistente' : 'Crear cuenta y comenzar'
                    )}
                  </button>
                </form>

                {/* Link para cambiar modo */}
                {authMode === 'login' && (
                  <p className="text-sm text-gray-400 mt-6 text-center">
                    ¿No tienes cuenta?{' '}
                    <button
                      onClick={() => {
                        setAuthMode('signup')
                        setEmail('')
                        setName('')
                        setPassword('')
                        setConfirmPassword('')
                      }}
                      className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline"
                    >
                      Crear cuenta
                    </button>
                  </p>
                )}

                {/* Enlace a más información */}
                <div className="mt-6 pt-6 border-t border-gray-700/50">
                  <button
                    onClick={() => {
                      const section = document.getElementById('que-es-codex-trader')
                      if (section) {
                        section.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                    }}
                    className="text-xs sm:text-sm text-cyan-400 hover:text-cyan-300 text-center block hover:underline transition-colors cursor-pointer px-2 w-full"
                  >
                    ¿Primera vez aquí? Conoce qué es Codex Trader
                  </button>
                </div>
              </div>

              {/* Disclaimer */}
              <p className="text-xs text-gray-500 text-center mt-6 px-2 sm:px-4 leading-relaxed">
                Codex Trader es una herramienta educativa. No ofrece asesoría financiera personalizada ni garantiza resultados en el mercado.
              </p>
            </div>
          </div>
          </div>
        </main>

        {/* Sección ¿Qué es Codex Trader? */}
        <section id="que-es-codex-trader" className="relative z-10 border-t border-gray-800/50 bg-gray-900/20 backdrop-blur-sm py-12 sm:py-16 scroll-mt-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                🤖 Codex Trader: El Asistente de IA Especializado en Trading
              </h2>
              <p className="text-base sm:text-lg text-gray-300 mt-4">
                Bienvenido a Codex Trader. Hemos resuelto el problema de la sobrecarga de información y las respuestas de IA genéricas.
              </p>
            </div>
            
            <div className="bg-gray-800/40 backdrop-blur-md rounded-xl shadow-lg border border-gray-700/50 p-6 sm:p-8 lg:p-10">
              <p className="text-base sm:text-lg text-gray-300 mb-8 leading-relaxed">
                Codex Trader es tu copiloto personal de Inteligencia Artificial, entrenado exclusivamente con las bibliotecas más avanzadas de estrategia, análisis técnico, psicología, y gestión de riesgo en los mercados financieros.
              </p>
              
              {/* ¿Cómo Funcionamos? */}
              <div className="mb-8">
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span>💡</span> ¿Cómo Funcionamos? (Nuestra Ventaja)
                </h3>
                <p className="text-sm sm:text-base text-gray-300 mb-4 leading-relaxed">
                  No buscamos en Google. Nuestro sistema se basa en la tecnología RAG (Generación Aumentada por Recuperación) para ofrecer precisión:
                </p>
                
                <div className="space-y-4 mb-6">
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
                    <h4 className="text-base sm:text-lg font-semibold text-cyan-400 mb-2">📚 Biblioteca Privada</h4>
                    <p className="text-sm sm:text-base text-gray-300">
                      Hemos procesado y estructurado una biblioteca de más de 900 libros y recursos profesionales.
                    </p>
                  </div>
                  
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
                    <h4 className="text-base sm:text-lg font-semibold text-cyan-400 mb-2">⚡ Velocidad Rayo</h4>
                    <p className="text-sm sm:text-base text-gray-300">
                      Gracias a un índice vectorial de alta eficiencia (HNSW), tus búsquedas son instantáneas. La IA no pierde tiempo: va directamente a la sección relevante del libro y te entrega el conocimiento.
                    </p>
                  </div>
                  
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
                    <h4 className="text-base sm:text-lg font-semibold text-cyan-400 mb-2">🎯 Enfoque de Nicho</h4>
                    <p className="text-sm sm:text-base text-gray-300">
                      Nuestra IA está especializada. Cuando preguntas sobre "stop loss", solo recibe contexto de trading. No recibe distracciones, solo precisión.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Beneficios Clave */}
              <div className="mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <span>✅</span> Beneficios Clave para Ti
                </h3>
                
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="text-lg sm:text-xl mt-0.5 sm:mt-1 flex-shrink-0">📊</span>
                    <div className="flex-1">
                      <p className="text-sm sm:text-base font-semibold text-gray-200 mb-1">Estrategias Verificadas</p>
                      <p className="text-sm sm:text-base text-gray-300">
                        Obtén ideas basadas en fuentes sólidas, no en opiniones al azar.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <span className="text-lg sm:text-xl mt-0.5 sm:mt-1 flex-shrink-0">🧠</span>
                    <div className="flex-1">
                      <p className="text-sm sm:text-base font-semibold text-gray-200 mb-1">Dominio de la Psicología</p>
                      <p className="text-sm sm:text-base text-gray-300">
                        Recibe ayuda para manejar las emociones, la disciplina y el riesgo, pilares fundamentales de tu plan de trading.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <span className="text-lg sm:text-xl mt-0.5 sm:mt-1 flex-shrink-0">💬</span>
                    <div className="flex-1">
                      <p className="text-sm sm:text-base font-semibold text-gray-200 mb-1">Respuestas Claras</p>
                      <p className="text-sm sm:text-base text-gray-300">
                        Nuestra IA sintetiza contenido complejo en resúmenes directos de 3-4 párrafos.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Call to Action */}
              <div className="mt-8 pt-6 border-t border-gray-700/50 text-center">
                <p className="text-base sm:text-lg font-semibold text-white mb-4">
                  ¿Listo para operar con conocimiento?
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      const loginSection = document.querySelector('main')
                      if (loginSection) {
                        loginSection.scrollIntoView({ behavior: 'smooth' })
                      }
                    }}
                    className="px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    Iniciar Sesión
                  </Link>
                  <Link
                    href="/planes"
                    className="px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    Ver Planes
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sección de Planes y Precios */}
        <section className="relative z-10 border-t border-gray-800/50 bg-gray-900/20 backdrop-blur-sm py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                Planes y precios
              </h2>
              <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto">
                Elige cuánto quieres usar Codex Trader cada mes.
              </p>
            </div>

            {/* Grid de planes (solo Explorer, Trader, Pro) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-8 max-w-5xl mx-auto">
              {CODEX_PLANS.filter(plan => ['explorer', 'trader', 'pro'].includes(plan.code)).map((plan) => (
                <div
                  key={plan.code}
                  className="bg-gray-800/40 backdrop-blur-md rounded-xl shadow-lg border border-gray-700/50 p-6 hover:border-cyan-500/50 transition-all hover:shadow-cyan-500/20 hover:shadow-xl"
                >
                  <h3 className="text-xl font-bold text-white mb-2">
                    {plan.name}
                  </h3>
                  
                  <div className="mb-3">
                    <span className="text-2xl font-bold text-white">
                      US${plan.priceUsd}
                    </span>
                    <span className="text-gray-400 text-sm ml-1">/mes</span>
                  </div>

                  <p className="text-cyan-400 font-semibold mb-4 text-sm">
                    Hasta {plan.approxDeepAnalyses} análisis profundos al mes
                  </p>

                  <Link
                    href="/planes"
                    className="block w-full py-2.5 px-4 text-center font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg transition-all transform hover:scale-[1.02] shadow-md hover:shadow-lg"
                  >
                    Ver detalles
                  </Link>
                </div>
              ))}
            </div>

            {/* Mención del plan Institucional */}
            <div className="text-center mt-8">
              <p className="text-gray-400 text-sm sm:text-base">
                ¿Tienes un equipo de trading o un fondo familiar?{' '}
                <Link
                  href="/planes"
                  className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline"
                >
                  Descubre el Plan Institucional en la página de planes.
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* Footer con contacto, comunidad, redes y testimonios */}
        <footer className="relative z-10 border-t border-gray-800/50 bg-gray-900/30 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
              {/* Soporte y ventas */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Soporte técnico y ventas de cursos</h3>
                <p className="text-xs text-gray-400 mb-3">Contáctame directamente en WhatsApp:</p>
                <a
                  href="https://wa.me/5215645530082"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg transition-all transform hover:scale-105"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  Escribir por WhatsApp
                </a>
              </div>

              {/* Comunidad */}
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-gray-300 mb-3">Únete a la comunidad</h3>
                <div className="space-y-2">
                  <a
                    href="https://chat.whatsapp.com/Lryh2qr01r24zLPw3Yojmt?mode=ems_copy_c"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
                  >
                    Grupo de WhatsApp (Comunidad)
                  </a>
                  <a
                    href="https://t.me/todoss0mostr4ders"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
                  >
                    Grupo de Telegram (Comunidad)
                  </a>
                </div>
              </div>

              {/* Testimonios */}
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-gray-300 mb-3">Testimonios de alumnos</h3>
                <p className="text-xs text-gray-400 mb-3">Lee opiniones reales de quienes ya han trabajado con nosotros:</p>
                <a
                  href="https://es.trustpilot.com/review/tradingsinperdidas.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  Ver reseñas en Trustpilot
                </a>
              </div>

              {/* Redes oficiales */}
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-gray-300 mb-3">Sigue solo nuestras redes oficiales:</h3>
                <div className="flex flex-wrap gap-3 mb-3">
                  <a href="https://www.facebook.com/share/1Jq9XMZ6xN/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-400 transition-colors" title="Facebook">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                  <a href="https://x.com/todoss0mostr4dr?t=Bg2Cq-mbev0HsZm0_CyzFg&s=09" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-400 transition-colors" title="X (Twitter)">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                  <a href="https://www.instagram.com/todoss0mostr4ders?igsh=eDJtZTkzZHVodWp0" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-400 transition-colors" title="Instagram">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                  <a href="https://www.youtube.com/@todossomostraders" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-400 transition-colors" title="YouTube">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </a>
                  <a href="https://www.tiktok.com/@todossomostraders0?_t=ZS-90TOLp5oE53&_r=1" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-400 transition-colors" title="TikTok">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                    </svg>
                  </a>
                  <a href="https://www.threads.net/@todoss0mostr4ders" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-400 transition-colors" title="Threads">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.186 8.302c1.015 0 1.868.12 2.557.358.69.238 1.218.56 1.583.966.365.405.548.86.548 1.364 0 .504-.183.959-.548 1.364-.365.405-.893.727-1.583.966-.689.238-1.542.358-2.557.358h-1.846v2.487h1.846c1.015 0 1.868.12 2.557.358.69.238 1.218.56 1.583.966.365.405.548.86.548 1.364 0 .504-.183.959-.548 1.364-.365.405-.893.727-1.583.966-.689.238-1.542.358-2.557.358h-4.233V5.64h4.233zm-1.846 6.772h1.846c.806 0 1.432-.08 1.88-.24.447-.16.79-.383 1.03-.67.239-.286.359-.608.359-.966 0-.358-.12-.68-.36-.966-.239-.286-.582-.51-1.03-.67-.448-.16-1.074-.24-1.88-.24h-1.846v3.752zm0-5.641v3.752h1.846c.806 0 1.432-.08 1.88-.24.447-.16.79-.383 1.03-.67.239-.286.359-.608.359-.966 0-.358-.12-.68-.36-.966-.239-.286-.582-.51-1.03-.67-.448-.16-1.074-.24-1.88-.24h-1.846zM24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.303.086.774.062 1.09l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                    </svg>
                  </a>
                  <a href="https://www.linkedin.com/in/david-del-rio-93512538a" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-400 transition-colors" title="LinkedIn">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </a>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Evita estafas: nunca te pediremos dinero por fuera de nuestros canales oficiales.
                </p>
              </div>
            </div>

            {/* Sitios oficiales */}
            <div className="pt-6 border-t border-gray-800/50">
              <p className="text-xs font-semibold text-gray-400 mb-3">Sitios oficiales:</p>
              <div className="flex flex-wrap gap-3 sm:gap-4">
                <a
                  href="https://landingpage.todossomostraders.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
                >
                  Landing oficial de Codex Trader
                </a>
                <a
                  href="https://todossomostraders.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
                >
                  Sitio principal de Todos Somos Traders
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Toaster position="top-center" />
      
      {/* Contenedor principal: sin max-width en móvil, centrado en escritorio */}
      <div className="w-full h-screen flex flex-col overflow-hidden lg:max-w-6xl lg:mx-auto lg:px-6">
        <div className="flex flex-col lg:flex-row gap-0 lg:gap-4 flex-1 min-h-0 w-full overflow-hidden">
          {/* Sidebar de conversaciones - Oculto en móvil por defecto, visible en escritorio */}
          {/* Backdrop para móvil - solo visible cuando menuAbierto es true */}
          {menuAbierto && (
            <div 
              className="md:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setMenuAbierto(false)}
            />
          )}
          {/* Sidebar: En móvil usa translate-x para animación, en escritorio usa hidden md:block según estado */}
          <aside className={`${menuAbierto ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative inset-y-0 left-0 md:inset-auto z-50 md:z-auto flex flex-col w-72 flex-shrink-0 md:sticky md:top-0 h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-xl md:shadow-none transition-transform duration-300 ease-in-out block ${sidebarCerradoDesktop ? 'md:hidden' : 'md:block'}`}>
          {/* Header del sidebar */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Conversaciones</h2>
              <button
                onClick={() => {
                  // En móvil, cerrar el menú
                  if (window.innerWidth < 768) {
                    setMenuAbierto(false)
                  } else {
                    // En escritorio, ocultar el sidebar
                    setSidebarCerradoDesktop(true)
                    sessionStorage.setItem('sidebarClosed', 'true')
                  }
                }}
                className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                title="Cerrar conversaciones"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <button
              onClick={createNewConversation}
              disabled={isLoading}
              className="w-full px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-md disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:transform-none mb-2"
            >
              + Nueva Conversación
            </button>
            <Link
              href="/invitar"
              className="w-full px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105 shadow-md flex items-center justify-center gap-2 mb-2"
            >
              <span>🎁</span>
              Invita y gana tokens
            </Link>
            <Link
              href="/billing"
              className="w-full px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-md flex items-center justify-center gap-2"
            >
              <span>📊</span>
              Resumen de uso
            </Link>
          </div>
          
          {/* Lista de conversaciones */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingConversations ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm">Cargando conversaciones...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <p className="text-sm">No hay conversaciones</p>
                <p className="text-xs mt-1">Crea una nueva para comenzar</p>
              </div>
            ) : (
              <div className="p-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-3 mb-2 rounded-lg transition-all ${
                      isLoading
                        ? 'cursor-not-allowed opacity-50'
                        : 'cursor-pointer'
                    } ${
                      currentConversationId === conv.id
                        ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500'
                        : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
                    }`}
                    onClick={() => {
                      // Deshabilitar cambio de conversación mientras está cargando
                      if (isLoading) return
                      setCurrentConversationId(conv.id)
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${
                          currentConversationId === conv.id
                            ? 'text-blue-900 dark:text-blue-100'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          {conv.title || 'Nueva conversación'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(conv.updated_at).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm('¿Eliminar esta conversación?')) {
                            deleteConversation(conv.id)
                          }
                        }}
                        className="ml-2 p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Eliminar conversación"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </aside>
          
          {/* Área principal del chat */}
          <main className="flex-1 flex flex-col w-full min-w-0 overflow-hidden">
            {/* Header mejorado con contador de tokens */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-40 w-full flex-shrink-0">
              <div className="w-full px-3 py-1.5 sm:px-4 sm:py-3 lg:max-w-3xl lg:mx-auto">
                <div className="flex justify-between items-center gap-1.5 sm:gap-4">
                  <div className="flex items-center gap-1.5 sm:gap-4 min-w-0 flex-1">
                    {/* Botón hamburguesa - SOLO visible en móvil (md:hidden) según instrucciones */}
                    <button
                      onClick={() => setMenuAbierto(!menuAbierto)}
                      className="md:hidden p-2.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 active:bg-blue-100 dark:active:bg-blue-900/30 rounded-lg transition-colors flex-shrink-0 z-50 relative"
                      title={menuAbierto ? "Cerrar menú" : "Abrir menú"}
                      aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
                    >
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        {menuAbierto ? (
                          // Icono X cuando está abierto
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        ) : (
                          // Icono hamburguesa (3 líneas) cuando está cerrado
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        )}
                      </svg>
                    </button>
                    {/* Botón para abrir sidebar en escritorio cuando está cerrado */}
                    {sidebarCerradoDesktop && (
                      <button
                        onClick={() => {
                          setSidebarCerradoDesktop(false)
                          sessionStorage.setItem('sidebarClosed', 'false')
                        }}
                        className="hidden md:flex p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex-shrink-0"
                        title="Abrir menú de conversaciones"
                        aria-label="Abrir menú de conversaciones"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </button>
                    )}
                    <h1 className="text-sm sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate">
                      CODEX TRADER
                    </h1>
                    <div className="text-[10px] sm:text-sm text-gray-600 dark:text-gray-400 truncate hidden sm:block">
                      {user.email}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0">
                    {/* Contador de tokens */}
                    <div className="flex items-center gap-0.5 sm:gap-2 px-1.5 sm:px-4 py-1 sm:py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      {isLoadingTokens ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      ) : (
                        <>
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className={`text-[10px] sm:text-sm font-semibold ${
                            tokensRestantes !== null && tokensRestantes < 0 
                              ? 'text-red-600 dark:text-red-400' 
                              : 'text-blue-700 dark:text-blue-300'
                          }`}>
                            {tokensRestantes !== null ? tokensRestantes.toLocaleString() : '...'}
                          </span>
                          <span className="text-[8px] sm:text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">tokens</span>
                        </>
                      )}
                    </div>
                    {tokensRestantes !== null && tokensRestantes < 0 && (
                      <button
                        onClick={handleResetTokens}
                        disabled={isLoadingTokens}
                        className="px-3 py-2 text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors border border-orange-200 dark:border-orange-800"
                        title="Resetear tokens a 20,000 (emergencia)"
                      >
                        Resetear
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => router.push('/admin/metrics')}
                        className="px-1.5 sm:px-4 py-1 sm:py-2 text-[10px] sm:text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-md hover:shadow-lg"
                        title="Dashboard de administración"
                      >
                        <span className="hidden sm:inline">📊 Admin</span>
                        <span className="sm:hidden text-xs">📊</span>
                      </button>
                    )}
                    <button
                      onClick={() => router.push('/planes')}
                      disabled={isLoadingTokens || isLoading}
                      className="px-1.5 sm:px-4 py-1 sm:py-2 text-[10px] sm:text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 transition-all transform hover:scale-105 shadow-md hover:shadow-lg disabled:transform-none disabled:cursor-not-allowed"
                      title="Ver planes y suscripciones"
                    >
                      <span className="hidden sm:inline">Recargar</span>
                      <span className="sm:hidden text-xs">💰</span>
                    </button>
                    <PWAInstallButton />
                    <button
                      onClick={handleLogout}
                      className="px-1.5 sm:px-4 py-1 sm:py-2 text-[10px] sm:text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Cerrar sesión"
                    >
                      <span className="hidden sm:inline">Salir</span>
                      <span className="sm:hidden text-xs">🚪</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Selector de modo de respuesta */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-1.5 sm:py-3 w-full flex-shrink-0">
              <div className="w-full lg:max-w-3xl lg:mx-auto">
                <div className="flex items-center gap-1.5 sm:gap-4 flex-wrap">
                  <span className="text-[10px] sm:text-sm font-medium text-gray-700 dark:text-gray-300">Modo:</span>
                  <div className="flex gap-0.5 sm:gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 sm:p-1">
                    <button
                      onClick={() => setResponseMode('fast')}
                      className={`px-1.5 sm:px-4 py-1 sm:py-2 text-[10px] sm:text-sm font-semibold rounded-md transition-all ${
                        responseMode === 'fast'
                          ? 'bg-cyan-600 text-white shadow-md'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                      title="Respuesta corta (3–4 párrafos)"
                    >
                      Rápida
                    </button>
                    <button
                      onClick={() => setResponseMode('deep')}
                      className={`px-1.5 sm:px-4 py-1 sm:py-2 text-[10px] sm:text-sm font-semibold rounded-md transition-all ${
                        responseMode === 'deep'
                          ? 'bg-cyan-600 text-white shadow-md'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                      title="Resumen + explicación detallada"
                    >
                      <span className="hidden sm:inline">Estudio profundo</span>
                      <span className="sm:hidden">Profundo</span>
                    </button>
                  </div>
                  <span className="text-[8px] sm:text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
                    {responseMode === 'fast' ? 'Respuesta corta (3–4 párrafos)' : 'Resumen + explicación detallada'}
                  </span>
                </div>
              </div>
            </div>

            {/* Área de mensajes con scroll */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden w-full px-3 sm:px-4 py-3 sm:py-6 min-h-0 flex flex-col">
              <div className="w-full flex flex-col gap-3 sm:gap-4 lg:max-w-3xl lg:mx-auto">
                {chatError && (
                  <div className="mb-4 bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 px-4 py-3 rounded-r-lg animate-slide-in">
                    <strong>Error:</strong> {chatError}
                  </div>
                )}

                {/* Panel de bienvenida cuando no hay mensajes */}
                {messages.length === 0 && (
                  <div className="flex items-center justify-center min-h-[50vh] sm:min-h-[60vh] w-full">
                    <div className="w-full px-3 sm:px-4 py-4 sm:py-8 lg:max-w-2xl lg:mx-auto">
                      <div className="text-center mb-4 sm:mb-8">
                        <h2 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
                          👋 Bienvenido a Codex Trader
                        </h2>
                        <p className="text-sm sm:text-lg text-gray-600 dark:text-gray-300 mb-4 sm:mb-6">
                          Tu asistente de IA especializado en trading, entrenado con contenido profesional de trading para ayudarte a entender mejor los mercados.
                        </p>
                        <h3 className="text-base sm:text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3 sm:mb-4">
                          Puedes preguntarme sobre:
                        </h3>
                        <ul className="text-left max-w-md mx-auto space-y-1.5 sm:space-y-2 text-xs sm:text-base text-gray-700 dark:text-gray-300 mb-4 sm:mb-6">
                          <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>Gestión de riesgo y manejo de capital</span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>Análisis técnico y lectura de gráficos</span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>Psicología del trader y disciplina</span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>Ideas de estrategias según tu estilo (scalping, intradía, swing, etc.)</span>
                          </li>
                        </ul>
                        <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 mb-4 sm:mb-8">
                          ⚠️ Uso educativo: no doy señales directas de compra/venta ni garantizo resultados.
                        </p>
                        
                        {/* Chips de sugerencias */}
                        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-3 px-1">
                          <button
                            onClick={() => handleSuggestionClick('Gestión de riesgo para swing trading')}
                            className="px-2 sm:px-4 py-1 sm:py-2 text-[10px] sm:text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors border border-gray-300 dark:border-gray-600"
                          >
                            Gestión de riesgo para swing trading
                          </button>
                          <button
                            onClick={() => handleSuggestionClick('Psicología del trader y disciplina')}
                            className="px-2 sm:px-4 py-1 sm:py-2 text-[10px] sm:text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors border border-gray-300 dark:border-gray-600"
                          >
                            Psicología del trader y disciplina
                          </button>
                          <button
                            onClick={() => handleSuggestionClick('Cómo diseñar una estrategia paso a paso')}
                            className="px-2 sm:px-4 py-1 sm:py-2 text-[10px] sm:text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors border border-gray-300 dark:border-gray-600"
                          >
                            Cómo diseñar una estrategia paso a paso
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="w-full flex flex-col gap-4">
                  {messages.map((m, index) => (
                    <div 
                      key={m.id} 
                      className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div 
                        className={`w-full max-w-[95%] sm:max-w-[680px] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 shadow-md transition-all hover:shadow-lg ${
                          m.role === 'user' 
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-sm' 
                            : 'bg-gray-800 dark:bg-gray-700 text-gray-100 rounded-bl-sm border border-gray-700 dark:border-gray-600'
                        }`}
                      >
                        {m.role === 'assistant' && (
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                            <span className="text-[9px] sm:text-xs font-semibold text-cyan-400">Codex</span>
                          </div>
                        )}
                        <p className={`text-[11px] sm:text-sm leading-relaxed whitespace-pre-wrap break-words ${
                          m.role === 'user' ? 'text-white' : 'text-gray-100'
                        }`}>
                          {m.content}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start animate-slide-up">
                      <div className="bg-gray-800 dark:bg-gray-700 rounded-2xl rounded-bl-sm px-4 py-3 shadow-md border border-gray-700 dark:border-gray-600">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-cyan-400">Codex</span>
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div ref={messagesEndRef} />
              </div>
            </div>
            
            {/* Formulario de input mejorado estilo ChatGPT */}
            <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg sticky bottom-0 z-10 w-full flex-shrink-0">
              <div className="w-full px-3 sm:px-4 py-2 sm:py-4 lg:max-w-3xl lg:mx-auto">
            {/* Texto de advertencia */}
            <p className="text-[8px] sm:text-xs text-gray-500 dark:text-gray-400 mb-1.5 sm:mb-2 text-center px-1">
              Codex usa contenido profesional de trading con fines educativos. No da recomendaciones personalizadas de inversión.
            </p>
            
            <form onSubmit={handleSubmit} className="flex gap-1.5 sm:gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  className="w-full p-2.5 sm:p-4 pr-8 sm:pr-12 border border-gray-300 dark:border-gray-600 rounded-2xl shadow-sm bg-gray-50 dark:bg-gray-700/50 text-xs sm:text-base text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none max-h-28 sm:max-h-32 transition-all"
                  value={input}
                  placeholder={isLoading ? "Procesando..." : "Ej: Explícame una estrategia de gestión de riesgo para swing trading..."}
                  onChange={handleInputChange}
                  disabled={!accessToken}
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !isLoading && input.trim() && accessToken) {
                      e.preventDefault()
                      handleSubmit(e)
                    }
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !input.trim() || !accessToken}
                className="px-3 sm:px-6 py-2.5 sm:py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full hover:from-cyan-500 hover:to-blue-500 active:from-cyan-700 active:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg text-[10px] sm:text-sm font-semibold disabled:transform-none flex items-center justify-center min-w-[60px] sm:min-w-[100px]"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Enviar</span>
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </>
                )}
              </button>
            </form>
            </div>
          </div>
        </main>
      </div>
      </div>

      {/* Modal de recarga de tokens */}
      {showReloadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowReloadModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4 transform transition-all animate-scale-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Recargar Tokens</h2>
            
            {/* Resumen de uso */}
            <div className="mb-6">
              <UsageSummary accessToken={accessToken} />
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Ingresa la cantidad de tokens que deseas agregar a tu cuenta.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Cantidad de tokens
              </label>
              <input
                type="number"
                value={reloadAmount}
                onChange={(e) => setReloadAmount(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="10000"
                min="1"
              />
              <div className="flex gap-2 mt-2">
                {[1000, 5000, 10000, 20000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setReloadAmount(amount.toString())}
                    className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    {amount.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowReloadModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleReloadTokens}
                disabled={isLoadingTokens}
                className="flex-1 px-4 py-2 text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 transition-all font-semibold disabled:cursor-not-allowed"
              >
                {isLoadingTokens ? 'Recargando...' : 'Recargar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Cargando...</p>
        </div>
      </div>
    }>
      <Chat />
    </Suspense>
  )
}

