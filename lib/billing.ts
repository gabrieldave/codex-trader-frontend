import { type PlanCode } from './plans'
import toast from 'react-hot-toast'
import { authorizedApiCallJson } from './api'

/**
 * Inicia el proceso de checkout de Stripe para un plan de suscripción.
 * 
 * @param planCode - Código del plan a suscribir ('explorer', 'trader', 'pro', 'institucional')
 * @param accessToken - Token de autenticación del usuario (opcional, se obtiene automáticamente de la sesión)
 * @throws Error si falla la creación de la sesión de checkout
 * 
 * Si no hay sesión activa, redirige al usuario al login con el plan seleccionado.
 */
export async function startCheckout(
  planCode: PlanCode
): Promise<void> {
  try {
    // Mostrar loading
    const loadingToast = toast.loading('Preparando checkout...')
    
    try {
      // Llamar al endpoint del backend usando la función centralizada
      // La función authorizedApiCallJson obtiene automáticamente el token de la sesión
      const data = await authorizedApiCallJson<{ url: string }>('/billing/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ planCode })
      })
      
      // Cerrar el toast de loading
      toast.dismiss(loadingToast)
      
      if (!data.url) {
        throw new Error('No se recibió la URL de checkout desde el servidor')
      }
      
      // Redirigir al usuario a Stripe Checkout
      window.location.href = data.url
      
    } catch (error) {
      // Cerrar el toast de loading en caso de error
      toast.dismiss(loadingToast)
      
      // Manejar errores específicos
      if (error instanceof Error) {
        if (error.message.includes('NoSession') || error.message.includes('no está autenticado')) {
          // Si no hay sesión, redirigir al login con el plan seleccionado
          window.location.href = `/?plan=${planCode}`
          return
        }
        
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.')
          window.location.href = `/?plan=${planCode}`
          return
        }
        
        if (error.message.includes('503')) {
          toast.error('El sistema de pagos no está disponible en este momento. Por favor, intenta más tarde.')
          return
        }
        
        toast.error(error.message)
        throw error
      }
      
      throw error
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Error desconocido al iniciar el checkout'
    
    toast.error(`Error: ${errorMessage}`)
    console.error('Error en startCheckout:', error)
    throw error
  }
}

