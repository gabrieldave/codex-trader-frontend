import { type PlanCode } from './plans'
import toast from 'react-hot-toast'

/**
 * Inicia el proceso de checkout de Stripe para un plan de suscripción.
 * 
 * @param planCode - Código del plan a suscribir ('explorer', 'trader', 'pro', 'institucional')
 * @param accessToken - Token de autenticación del usuario (requerido si el usuario está logueado)
 * @throws Error si falla la creación de la sesión de checkout
 * 
 * Si no se proporciona accessToken, redirige al usuario al login con el plan seleccionado.
 */
export async function startCheckout(
  planCode: PlanCode,
  accessToken?: string
): Promise<void> {
  try {
    // Obtener la URL del backend desde variables de entorno
    // IMPORTANTE: En producción, debe ser https://api.codextrader.tech
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.codextrader.tech'
    
    // Debug: verificar que la variable se está leyendo correctamente
    if (typeof window !== 'undefined') {
      console.log('[DEBUG] Backend URL:', backendUrl)
    }
    
    // Si no hay accessToken, el usuario debe estar logueado primero
    if (!accessToken) {
      // Si no hay token, redirigir al login con el plan seleccionado
      window.location.href = `/?plan=${planCode}`
      return
    }
    
    const token = accessToken
    
    // Mostrar loading
    const loadingToast = toast.loading('Preparando checkout...')
    
    // Llamar al endpoint del backend
    const response = await fetch(`${backendUrl}/billing/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ planCode })
    })
    
    // Cerrar el toast de loading
    toast.dismiss(loadingToast)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        detail: `Error ${response.status}: ${response.statusText}` 
      }))
      
      const errorMessage = errorData.detail || errorData.error || 'Error al crear sesión de checkout'
      
      // Manejar errores específicos
      if (response.status === 401) {
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.')
        window.location.href = `/?plan=${planCode}`
        return
      }
      
      if (response.status === 503) {
        toast.error('El sistema de pagos no está disponible en este momento. Por favor, intenta más tarde.')
        return
      }
      
      toast.error(errorMessage)
      throw new Error(errorMessage)
    }
    
    const data = await response.json()
    
    if (!data.url) {
      throw new Error('No se recibió la URL de checkout desde el servidor')
    }
    
    // Redirigir al usuario a Stripe Checkout
    window.location.href = data.url
    
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Error desconocido al iniciar el checkout'
    
    toast.error(`Error: ${errorMessage}`)
    console.error('Error en startCheckout:', error)
    throw error
  }
}

