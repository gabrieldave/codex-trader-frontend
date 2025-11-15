/**
 * Utilidades para el sistema de referidos.
 * Maneja códigos de referido y procesamiento de referencias.
 */

/**
 * Procesa un código de referido después del registro de un usuario.
 * 
 * @param referralCode - Código de referido del usuario que invitó
 * @param accessToken - Token de autenticación del usuario
 * @returns Promise que resuelve con el resultado del procesamiento
 */
export async function processReferral(
  referralCode: string,
  accessToken: string
): Promise<{ success: boolean; message: string }> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.codextrader.tech'
    
    const response = await fetch(`${backendUrl}/referrals/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ referral_code: referralCode.toUpperCase().trim() })
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        detail: `Error ${response.status}: ${response.statusText}` 
      }))
      
      const errorMessage = errorData.detail || errorData.error || 'Error al procesar código de referido'
      throw new Error(errorMessage)
    }
    
    const data = await response.json()
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
 * @param accessToken - Token de autenticación del usuario
 * @returns Promise con la información de referidos
 */
export async function getReferralInfo(accessToken: string) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.codextrader.tech'
    
    const response = await fetch(`${backendUrl}/referrals/info`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        detail: `Error ${response.status}: ${response.statusText}` 
      }))
      throw new Error(errorData.detail || errorData.error || 'Error al obtener información de referidos')
    }
    
    return await response.json()
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

