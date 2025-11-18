/**
 * Ruta de callback para confirmación de email de Supabase
 * 
 * Esta ruta procesa la confirmación de email cuando el usuario hace clic en el enlace
 * del email de Supabase. Después de confirmar, redirige al usuario a la app.
 * 
 * IMPORTANTE: Configura esta URL en Supabase Dashboard:
 * Authentication > URL Configuration > Redirect URLs
 * Agrega: http://localhost:3000/auth/callback (desarrollo)
 *         https://tu-dominio.com/auth/callback (producción)
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  
  // Log para debugging
  console.log('Callback recibido:', {
    url: requestUrl.toString(),
    searchParams: Object.fromEntries(requestUrl.searchParams),
    hash: requestUrl.hash,
    referer: request.headers.get('referer')
  })
  
  // Supabase puede enviar los parámetros de diferentes formas:
  // 1. token_hash y type como query params
  // 2. token y type como query params (más común, especialmente con PKCE)
  // 3. code (para PKCE flow) - Supabase procesa el token y envía un code
  // 4. #access_token=... en el hash (fragment)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const token = requestUrl.searchParams.get('token')
  const code = requestUrl.searchParams.get('code') // Código PKCE después de que Supabase procesa el token
  const type = requestUrl.searchParams.get('type')
  
  // También verificar el hash de la URL (fragment) para tokens
  const hash = requestUrl.hash
  let accessTokenFromHash: string | null = null
  if (hash) {
    const hashParams = new URLSearchParams(hash.substring(1))
    accessTokenFromHash = hashParams.get('access_token')
  }

  // Usar token_hash, token, o code (todos son válidos)
  const confirmationToken = token_hash || token || code
  
  // El type puede ser 'email', 'signup', 'recovery', etc.
  // Para confirmación de email, aceptamos 'email' o 'signup'
  // Si hay code, no necesitamos type porque Supabase ya procesó la verificación
  const isValidType = type === 'email' || type === 'signup' || !!code

  // Si tenemos un code PKCE, intercambiarlo por una sesión en el servidor
  if (code) {
    console.log('Code PKCE detectado, intercambiando por sesión en el servidor...')
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch (error) {
              console.error('Error al establecer cookies:', error)
            }
          },
        },
      }
    )
    
    try {
      // Intercambiar el code por una sesión
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('Error al intercambiar code por sesión:', exchangeError)
        const redirectUrl = new URL('/', requestUrl.origin)
        redirectUrl.searchParams.set('error', 'intercambio_fallido')
        redirectUrl.searchParams.set('message', 'Error al establecer sesión. Por favor, intenta hacer login.')
        return NextResponse.redirect(redirectUrl)
      }
      
      if (data.session) {
        console.log('✅ Sesión establecida correctamente desde code PKCE')
        // Redirigir al frontend con éxito
        const redirectUrl = new URL('/', requestUrl.origin)
        redirectUrl.searchParams.set('confirmed', 'true')
        redirectUrl.searchParams.set('email_confirmed', 'true')
        // Crear respuesta con cookies establecidas
        const response = NextResponse.redirect(redirectUrl)
        return response
      } else {
        console.error('No se obtuvo sesión después de intercambiar code')
        const redirectUrl = new URL('/', requestUrl.origin)
        redirectUrl.searchParams.set('error', 'sesion_no_obtenida')
        redirectUrl.searchParams.set('message', 'No se pudo establecer la sesión. Por favor, intenta hacer login.')
        return NextResponse.redirect(redirectUrl)
      }
    } catch (err) {
      console.error('Error inesperado al intercambiar code:', err)
      const redirectUrl = new URL('/', requestUrl.origin)
      redirectUrl.searchParams.set('error', 'error_intercambio')
      redirectUrl.searchParams.set('message', 'Error inesperado al establecer sesión.')
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Si tenemos token/token_hash y un type válido, procesar
  if (confirmationToken && isValidType) {
    // Crear cliente de Supabase con manejo de cookies del servidor
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch (error) {
              // Las cookies pueden no estar disponibles en algunos contextos
              console.error('Error al establecer cookies:', error)
            }
          },
        },
      }
    )

    try {
      // Verificar el token de confirmación
      // Supabase puede usar 'token_hash' o 'token' dependiendo del método
      let verifyResult
      
      if (token_hash) {
        // Método preferido: usar token_hash
        verifyResult = await supabase.auth.verifyOtp({
          type: 'email',
          token_hash: token_hash
        })
      } else if (token) {
        // Método alternativo: usar token directamente
        // Para tokens PKCE, Supabase puede requerir un método diferente
        // Intentar primero con token_hash (puede funcionar si el token es compatible)
        try {
          verifyResult = await supabase.auth.verifyOtp({
            type: 'email',
            token_hash: token
          })
        } catch {
          // Si el token es PKCE, puede que Supabase ya haya procesado la verificación
          // y solo necesitemos obtener la sesión
          console.log('Token PKCE detectado, intentando obtener sesión directamente')
          
          try {
            // Para tokens PKCE, Supabase puede haber completado la verificación
            // y solo necesitamos obtener la sesión actual
            const { data: sessionData } = await supabase.auth.getSession()
            if (sessionData?.session?.user) {
              // Si hay sesión, el usuario ya está verificado
              verifyResult = {
                data: {
                  user: sessionData.session.user,
                  session: sessionData.session
                },
                error: null
              }
            } else {
              throw new Error('No se pudo obtener sesión después de verificación PKCE')
            }
          } catch (sessionError) {
            console.error('Error al obtener sesión:', sessionError)
            throw new Error('No se pudo verificar el token de confirmación PKCE')
          }
        }
      } else {
        throw new Error('No se encontró token de confirmación')
      }
      
      const { data, error } = verifyResult

      if (!error && data?.user) {
        // Usuario confirmado exitosamente
        // IMPORTANTE: Notificar al backend para enviar email de bienvenida
        // Esto se hace en segundo plano y no bloquea la redirección
        // En móvil, es mejor redirigir a la página principal para que el usuario pueda hacer login
        
        // Intentar enviar email de bienvenida en segundo plano (no esperar)
        if (data?.session?.access_token || confirmationToken || accessTokenFromHash) {
          try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.codextrader.tech'
            
            // Preparar body y headers
            const body: { token_hash?: string } = {}
            
            // Si tenemos token_hash, token, o code, usarlo (más confiable después de confirmar)
            if (token_hash) {
              body.token_hash = token_hash
            } else if (token) {
              // Si solo tenemos token, también podemos usarlo
              body.token_hash = token
            } else if (code) {
              // Si tenemos code, también podemos usarlo (aunque ya lo intercambiamos)
              body.token_hash = code
            }
            
            const headers: Record<string, string> = {
              'Content-Type': 'application/json'
            }
            
            // Si tenemos access_token, también incluirlo en el header
            const accessToken = data.session?.access_token || accessTokenFromHash
            if (accessToken) {
              headers['Authorization'] = `Bearer ${accessToken}`
              console.log('✅ Token de autorización incluido en header')
            } else {
              console.warn('⚠️ No hay access_token disponible para enviar en header')
            }
            
            // Enviar en segundo plano (no esperar para no bloquear la redirección)
            const notifyUrl = `${backendUrl}/users/notify-registration`
            console.log('📧 Notificando registro al backend:', notifyUrl)
            console.log('📧 Headers:', { ...headers, Authorization: headers.Authorization ? 'Bearer ***' : 'none' })
            
            fetch(notifyUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify(body)
            })
            .then(async response => {
              if (response.ok) {
                const responseData = await response.json()
                console.log('✅ Email de bienvenida enviado correctamente desde callback:', responseData)
              } else {
                const errorText = await response.text()
                console.error('❌ Error al notificar registro desde callback:', response.status, errorText)
                // Intentar parsear el error como JSON si es posible
                try {
                  const errorJson = JSON.parse(errorText)
                  console.error('❌ Detalles del error:', errorJson)
                } catch {
                  // Si no es JSON, ya tenemos el texto
                }
              }
            })
            .catch(fetchError => {
              console.error('❌ Error de red al notificar registro desde callback:', fetchError)
              console.error('❌ URL intentada:', notifyUrl)
            })
          } catch (error) {
            // No crítico si falla, solo loguear
            console.error('Error al notificar registro después de confirmación (no crítico):', error)
          }
        }

        // Redirigir a la página principal con mensaje de éxito
        // En móvil, es mejor redirigir a / para que el usuario pueda hacer login
        const redirectUrl = new URL('/', requestUrl.origin)
        redirectUrl.searchParams.set('confirmed', 'true')
        redirectUrl.searchParams.set('email_confirmed', 'true')
        return NextResponse.redirect(redirectUrl)
      } else {
        // Error al verificar el token
        const redirectUrl = new URL('/', requestUrl.origin)
        redirectUrl.searchParams.set('error', 'confirmacion_fallida')
        redirectUrl.searchParams.set('message', error?.message || 'Error al confirmar tu cuenta')
        return NextResponse.redirect(redirectUrl)
      }
    } catch (err) {
      // Error inesperado
      const redirectUrl = new URL('/', requestUrl.origin)
      redirectUrl.searchParams.set('error', 'confirmacion_error')
      redirectUrl.searchParams.set('message', 'Error inesperado al confirmar tu cuenta')
      console.error('Error inesperado en callback:', err)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Si no hay token_hash/token o type, puede ser que Supabase use un formato diferente
  // Esto puede pasar cuando Supabase procesa un token PKCE y redirige sin parámetros
  // Intentar verificar si hay una sesión activa o un access_token en el hash
  if (accessTokenFromHash) {
    // Si hay access_token en el hash, el usuario ya está autenticado
    // Redirigir a la página principal con éxito
    const redirectUrl = new URL('/', requestUrl.origin)
    redirectUrl.searchParams.set('confirmed', 'true')
    redirectUrl.searchParams.set('email_confirmed', 'true')
    return NextResponse.redirect(redirectUrl)
  }
  
  // Si no hay parámetros pero llegamos aquí desde Supabase, puede que la verificación
  // ya se haya completado (especialmente con tokens PKCE)
  // Cuando Supabase procesa un token PKCE en su servidor (/auth/v1/verify), 
  // puede redirigir sin parámetros pero con cookies establecidas
  // Verificar si el referrer es de Supabase
  const referer = request.headers.get('referer') || ''
  const isFromSupabase = referer.includes('supabase.co') || referer.includes('supabase.com')
  
  console.log('Verificando redirección desde Supabase:', {
    hasToken: !!confirmationToken,
    hasType: !!type,
    isValidType,
    isFromSupabase,
    referer
  })
  
  // Si llegamos aquí sin parámetros pero desde Supabase, asumir que la verificación se completó
  // Esto puede pasar cuando Supabase procesa un token PKCE y redirige sin parámetros
  // También puede pasar si el usuario hace clic directo en el enlace de Supabase
  if (isFromSupabase || (!confirmationToken && !type)) {
    // Redirigir a la página principal con éxito
    // El frontend verificará si hay sesión activa y mostrará el mensaje apropiado
    console.log('Redirigiendo con éxito (verificación completada por Supabase)')
    const redirectUrl = new URL('/', requestUrl.origin)
    redirectUrl.searchParams.set('confirmed', 'true')
    redirectUrl.searchParams.set('email_confirmed', 'true')
    return NextResponse.redirect(redirectUrl)
  }
  
  // Si no hay ningún token ni venimos de Supabase, redirigir a la página principal con error
  console.log('Error: No se encontraron parámetros válidos')
  const redirectUrl = new URL('/', requestUrl.origin)
  redirectUrl.searchParams.set('error', 'enlace_invalido')
  redirectUrl.searchParams.set('message', 'Enlace de confirmación inválido. Por favor, intenta hacer clic en el enlace del email nuevamente.')
  return NextResponse.redirect(redirectUrl)
}

