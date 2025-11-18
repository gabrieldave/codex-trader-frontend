import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const messages = body.messages || []
    const userMessage = messages[messages.length - 1]?.content || ''
    
    if (!userMessage) {
      return NextResponse.json({ error: "No se proporcionó ningún mensaje" }, { status: 400 })
    }
    
    // Obtener el token SOLO del header Authorization (nunca del body por seguridad)
    const authHeader = req.headers.get('Authorization') || ''
    const authToken = authHeader.replace('Bearer ', '').trim()
    
    // 🚨 DEBUG: Verificar token recibido
    console.log('[API /chat-simple] DEBUG authHeader recibido:', authHeader ? `${authHeader.substring(0, 30)}...` : 'vacío/null')
    console.log('[API /chat-simple] DEBUG authToken extraído:', authToken ? `${authToken.substring(0, 20)}...` : 'null/undefined')
    console.log('[API /chat-simple] DEBUG Todos los headers:', Object.fromEntries(req.headers.entries()))
    
    if (!authToken) {
      console.error('[API /chat-simple] ERROR: No se proporcionó token de autenticación')
      return NextResponse.json({ error: "No se proporcionó token de autenticación en el header Authorization" }, { status: 401 })
    }

    // Obtener conversation_id y response_mode del body si existen
    const conversationId = body.conversation_id || null
    const responseMode = body.response_mode || 'fast'

    // IMPORTANTE: Usar NEXT_PUBLIC_BACKEND_URL porque las variables sin NEXT_PUBLIC_ no están disponibles en el cliente
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://api.codextrader.tech'
    const backendUrl = `${backendBaseUrl}/chat`
    
    // 🚨 DEBUG: Verificar configuración del backend
    console.log('[API /chat-simple] DEBUG backendBaseUrl:', backendBaseUrl)
    console.log('[API /chat-simple] DEBUG backendUrl:', backendUrl)
    console.log('[API /chat-simple] DEBUG Token que se enviará al backend:', authToken ? `${authToken.substring(0, 20)}...` : 'null')
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ 
        query: userMessage,
        conversation_id: conversationId,
        response_mode: responseMode
      })
    })

    // 🚨 DEBUG: Verificar respuesta del backend
    console.log('[API /chat-simple] DEBUG Response status:', response.status)
    console.log('[API /chat-simple] DEBUG Response ok:', response.ok)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[API /chat-simple] ERROR Backend response:', errorText)
      if (response.status === 401) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
      }
      if (response.status === 402) {
        return NextResponse.json({ error: "Tokens agotados" }, { status: 402 })
      }
      return NextResponse.json({ error: errorText }, { status: response.status })
    }

    const data = await response.json()
    const respuestaTexto = data.response || 'Sin respuesta'
    
    // Devolver respuesta simple sin streaming
    return NextResponse.json({ 
      message: respuestaTexto 
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 })
  }
}



