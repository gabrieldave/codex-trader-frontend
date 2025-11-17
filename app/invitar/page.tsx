'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import toast, { Toaster } from 'react-hot-toast'
import Link from 'next/link'

interface ReferralsSummary {
  totalInvited: number
  totalPaid: number
  referralRewardsCount: number
  referralTokensEarned: number
  referralCode: string | null
}

export default function InvitarPage() {
  const [supabase] = useState(() => createClient())
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [referralsSummary, setReferralsSummary] = useState<ReferralsSummary | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const router = useRouter()

  // Verificar sesión del usuario
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
        setAccessToken(session.access_token)
      } else {
        // Si no hay sesión, redirigir al login
        router.push('/')
      }
      setLoading(false)
    }
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user)
        setAccessToken(session.access_token)
      } else {
        setUser(null)
        setAccessToken(null)
        router.push('/')
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  // Cargar resumen de referidos
  useEffect(() => {
    const loadReferralsSummary = async () => {
      if (!accessToken) return

      setLoadingSummary(true)
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://web-production-9ab2.up.railway.app'
        const response = await fetch(`${backendUrl}/me/referrals-summary`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setReferralsSummary(data)
        } else {
          console.error('Error al cargar resumen de referidos')
          toast.error('Error al cargar información de referidos')
        }
      } catch (error) {
        console.error('Error al cargar resumen de referidos:', error)
        toast.error('Error de conexión al cargar información de referidos')
      } finally {
        setLoadingSummary(false)
      }
    }

    if (accessToken) {
      loadReferralsSummary()
    }
  }, [accessToken])

  // Función para copiar enlace al portapapeles
  const copyReferralLink = async () => {
    if (!referralsSummary?.referralCode) {
      toast.error('No hay código de referido disponible')
      return
    }

    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 
                       (typeof window !== 'undefined' ? window.location.origin : '')
    const referralUrl = `${frontendUrl}/?ref=${referralsSummary.referralCode}`

    try {
      await navigator.clipboard.writeText(referralUrl)
      toast.success('¡Enlace copiado al portapapeles!')
    } catch (error) {
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = referralUrl
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        toast.success('¡Enlace copiado al portapapeles!')
      } catch (err) {
        toast.error('No se pudo copiar el enlace. Por favor, cópialo manualmente.')
      }
      document.body.removeChild(textArea)
    }
  }

  if (loading || loadingSummary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  if (!user || !accessToken) {
    return null
  }

  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 
                     (typeof window !== 'undefined' ? window.location.origin : '')
  const referralUrl = referralsSummary?.referralCode 
    ? `${frontendUrl}/?ref=${referralsSummary.referralCode}`
    : ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950">
      <Toaster position="top-right" />
      
      {/* Header con navegación */}
      <div className="bg-blue-900/50 border-b border-blue-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-white text-xl font-bold hover:text-blue-200 transition">
              ← Volver al Chat
            </Link>
            <div className="text-white text-sm">
              {user.email}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Bloque 1: Encabezado */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Invita a otros traders y gana tokens
          </h1>
          <p className="text-xl text-blue-200">
            Comparte tu enlace personal. Tus amigos reciben tokens extra y tú también.
          </p>
        </div>

        {/* Bloque 2: Link de referido */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-blue-500/30 shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-semibold text-white mb-4">Tu enlace de referido</h2>
          
          {referralsSummary?.referralCode ? (
            <>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  readOnly
                  value={referralUrl}
                  className="flex-1 px-4 py-3 bg-white/5 border border-blue-400/30 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={copyReferralLink}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-lg"
                >
                  Copiar enlace
                </button>
              </div>

              <div className="bg-blue-500/20 rounded-lg p-4 mb-4">
                <p className="text-blue-100 text-sm mb-2">
                  <span className="font-semibold">Tu amigo recibe:</span> +5,000 tokens de bienvenida cuando activa su cuenta.
                </p>
                <p className="text-blue-100 text-sm">
                  <span className="font-semibold">Tú recibes:</span> +10,000 tokens cuando él paga su primer plan. Hasta 5 referidos con recompensa completa.
                </p>
              </div>
            </>
          ) : (
            <div className="text-blue-200">
              <p>Tu código de referido se está generando. Por favor, recarga la página en unos momentos.</p>
            </div>
          )}
        </div>

        {/* Bloque 3: Resumen de estadísticas */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-blue-500/30 shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-semibold text-white mb-6">Tus estadísticas de referidos</h2>
          
          {referralsSummary ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-500/20 rounded-lg p-4">
                <div className="text-blue-200 text-sm mb-1">Invitados registrados</div>
                <div className="text-3xl font-bold text-white">{referralsSummary.totalInvited}</div>
              </div>
              
              <div className="bg-blue-500/20 rounded-lg p-4">
                <div className="text-blue-200 text-sm mb-1">Invitados que ya pagaron</div>
                <div className="text-3xl font-bold text-white">{referralsSummary.totalPaid}</div>
              </div>
              
              <div className="bg-blue-500/20 rounded-lg p-4">
                <div className="text-blue-200 text-sm mb-1">Tokens ganados por referidos</div>
                <div className="text-3xl font-bold text-white">
                  {referralsSummary.referralTokensEarned.toLocaleString()}
                </div>
              </div>
              
              <div className="bg-blue-500/20 rounded-lg p-4">
                <div className="text-blue-200 text-sm mb-1">Bonos usados</div>
                <div className="text-3xl font-bold text-white">
                  {referralsSummary.referralRewardsCount} / 5
                </div>
                <div className="text-blue-300 text-xs mt-2">
                  {referralsSummary.referralRewardsCount < 5 
                    ? `Aún puedes ganar tokens por ${5 - referralsSummary.referralRewardsCount} referido(s) más`
                    : 'Has alcanzado el límite de bonos por referidos'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-blue-200">Cargando estadísticas...</div>
          )}
        </div>

        {/* Bloque 4: Tips para compartir */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-blue-500/30 shadow-xl p-6">
          <h2 className="text-2xl font-semibold text-white mb-4">💡 Tips para compartir</h2>
          <p className="text-blue-100 leading-relaxed">
            Comparte tu enlace en tus grupos de trading, Discord, Telegram o redes sociales. 
            Cuanto más lo usen, más tokens tendrás para tus análisis. Cada referido que se registre 
            y pague su primera suscripción te dará 10,000 tokens adicionales, hasta un máximo de 5 bonos.
          </p>
        </div>

        {/* Botón para ver planes */}
        <div className="mt-8 text-center">
          <Link
            href="/planes"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-lg"
          >
            Ver planes y precios
          </Link>
        </div>

      </div>
    </div>
  )
}

