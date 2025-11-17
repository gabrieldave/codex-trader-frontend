import { createClient } from './supabase'

/**
 * Cliente HTTP centralizado para llamadas al backend con autenticación automática.
 * 
 * Esta función obtiene automáticamente el token JWT de la sesión de Supabase
 * y lo inyecta en el header Authorization de todas las llamadas al backend.
 * 
 * @param endpoint - Ruta del endpoint (ej: '/users/notify-registration')
 * @param options - Opciones de fetch (method, body, headers adicionales, etc.)
 * @returns Promise con la respuesta del fetch
 * @throws Error si el usuario no está autenticado o si la llamada falla
 * 
 * @example
 * ```typescript
 * // Llamada GET simple
 * const response = await authorizedApiCall('/me/usage')
 * const data = await response.json()
 * 
 * // Llamada POST con body
 * const response = await authorizedApiCall('/users/notify-registration', {
 *   method: 'POST',
 *   body: JSON.stringify({ token_hash: '...' })
 * })
 * 
 * // Llamada con headers adicionales
 * const response = await authorizedApiCall('/billing/create-checkout-session', {
 *   method: 'POST',
 *   headers: {
 *     'Custom-Header': 'value'
 *   },
 *   body: JSON.stringify({ planCode: 'pro' })
 * })
 * ```
 */
export async function authorizedApiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  // 1. Obtener el token JWT de la sesión de Supabase
  const supabase = createClient()
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError) {
    console.error('[API] Error al obtener sesión:', sessionError)
    throw new Error(`Error de sesión: ${sessionError.message}`)
  }
  
  if (!session) {
    console.error('[API] No hay sesión activa')
    throw new Error('NoSession: El usuario no está autenticado.')
  }
  
  // 2. Obtener la URL del backend desde variables de entorno
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://web-production-9ab2.up.railway.app'
  
  // 3. Construir la URL completa
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${backendUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  
  // 4. Inyectar el token en la cabecera Authorization
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`, // <--- SOLUCIÓN DEL 401
    ...options.headers, // Headers adicionales pueden sobrescribir los defaults
  }
  
  // 5. Preparar el body (si existe)
  let body: BodyInit | null | undefined = options.body
  if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob) && !(body instanceof ArrayBuffer) && !(body instanceof URLSearchParams)) {
    body = JSON.stringify(body)
  }
  
  // 6. Realizar la solicitud con las cabeceras actualizadas
  const response = await fetch(url, {
    ...options,
    headers,
    body,
  })
  
  // 7. Manejar errores comunes
  if (response.status === 401) {
    console.error('[API] Error 401: Token inválido o expirado')
    // Opcional: limpiar sesión y redirigir al login
    await supabase.auth.signOut()
    throw new Error('Unauthorized: La sesión ha expirado. Por favor, inicia sesión nuevamente.')
  }
  
  return response
}

/**
 * Versión simplificada que retorna directamente el JSON parseado.
 * 
 * @param endpoint - Ruta del endpoint
 * @param options - Opciones de fetch
 * @returns Promise con los datos parseados del JSON
 * 
 * @example
 * ```typescript
 * const data = await authorizedApiCallJson('/me/usage')
 * console.log(data.tokens_restantes)
 * ```
 */
export async function authorizedApiCallJson<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await authorizedApiCall(endpoint, options)
  
  if (!response.ok) {
    const errorText = await response.text()
    let errorData: any
    try {
      errorData = JSON.parse(errorText)
    } catch {
      errorData = { detail: errorText || `Error ${response.status}: ${response.statusText}` }
    }
    
    throw new Error(errorData.detail || errorData.error || `Error ${response.status}: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Versión que no requiere autenticación (para endpoints públicos).
 * 
 * @param endpoint - Ruta del endpoint
 * @param options - Opciones de fetch
 * @returns Promise con la respuesta del fetch
 */
export async function publicApiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://web-production-9ab2.up.railway.app'
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${backendUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  
  let body = options.body
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    body = JSON.stringify(body)
  }
  
  return fetch(url, {
    ...options,
    headers,
    body,
  })
}

