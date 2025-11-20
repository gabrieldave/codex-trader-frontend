import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || ''
    const authToken = authHeader.replace('Bearer ', '').trim()
    
    // 🚨 DEBUG: Verificar token recibido
    console.log('[API /tokens] DEBUG authHeader recibido:', authHeader ? `${authHeader.substring(0, 30)}...` : 'vacío/null')
    console.log('[API /tokens] DEBUG authToken extraído:', authToken ? `${authToken.substring(0, 20)}...` : 'null/undefined')
    console.log('[API /tokens] DEBUG Todos los headers:', Object.fromEntries(req.headers.entries()))
    
    if (!authToken) {
      console.error('[API /tokens] ERROR: No se proporcionó token de autenticación')
      return NextResponse.json({ error: "No se proporcionó token de autenticación" }, { status: 401 })
    }

    // IMPORTANTE: Usar NEXT_PUBLIC_BACKEND_URL porque las variables sin NEXT_PUBLIC_ no están disponibles en el cliente
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://api.codextrader.tech'
    const backendUrl = `${backendBaseUrl}/tokens`
    
    // 🚨 DEBUG: Verificar configuración del backend
    console.log('[API /tokens] DEBUG backendBaseUrl:', backendBaseUrl)
    console.log('[API /tokens] DEBUG backendUrl:', backendUrl)
    console.log('[API /tokens] DEBUG Token que se enviará al backend:', authToken ? `${authToken.substring(0, 20)}...` : 'null')
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    // 🚨 DEBUG: Verificar respuesta del backend
    console.log('[API /tokens] DEBUG Response status:', response.status)
    console.log('[API /tokens] DEBUG Response ok:', response.ok)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[API /tokens] ERROR Backend response:', errorText)
      return NextResponse.json({ error: errorText }, { status: response.status })
    }

    const data = await response.json()
    // 🚨 DEBUG: Logging de la respuesta del backend
    console.log('[API /tokens] DEBUG Respuesta del backend:', data)
    console.log('[API /tokens] DEBUG tokens_restantes:', data.tokens_restantes)
    console.log('[API /tokens] DEBUG Tipo de tokens_restantes:', typeof data.tokens_restantes)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 })
  }
}







