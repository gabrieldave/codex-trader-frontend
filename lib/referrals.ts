import { authorizedApiCallJson } from './api'

/**
 * Utilidades para el sistema de referidos.
 * Maneja códigos de referido y procesamiento de referencias.
 */

/**
 * Procesa un código de referido después del registro de un usuario.
 * 
 * @param referralCode - Código de referido del usuario que invitó
 * @returns Promise que resuelve con el resultado del procesamiento
 */
export async function processReferral(
  referralCode: string
): Promise<{ success: boolean; message: string }> {
  try {
    const data = await authorizedApiCallJson<{ success: boolean; message: string }>('/referrals/process', {
      method: 'POST',
      body: JSON.stringify({ referral_code: referralCode.toUpperCase().trim() })
    })
    
    return {
      success: data.success || true,
      message: data.message || 'Código de referido procesado correctamente'
    }
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Error desconocido al procesar código de referido'
    throw new Error(errorMessage)
  }
}

/**
 * Obtiene información sobre el sistema de referidos del usuario actual.
 * 
 * @returns Promise con la información de referidos
 */
export async function getReferralInfo() {
  try {
    return await authorizedApiCallJson('/referrals/info')
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Error desconocido al obtener información de referidos'
    throw new Error(errorMessage)
  }
}

/**
 * Genera la URL de registro con un código de referido.
 * 
 * @param referralCode - Código de referido
 * @returns URL de registro con el parámetro ref
 */
export function getReferralUrl(referralCode: string): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  return `${baseUrl}/?ref=${referralCode.toUpperCase().trim()}`
}

