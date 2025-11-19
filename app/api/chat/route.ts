export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const messages = body.messages || []
    const userMessage = body.query || messages[messages.length - 1]?.content || ''
    
    if (!userMessage) {
      return new Response("No se proporcionó ningún mensaje", { status: 400 })
    }

    const authHeader = req.headers.get('Authorization') || ''
    const authToken = authHeader.replace('Bearer ', '').trim()

    if (!authToken) {
      return new Response("No se proporcionó token de autenticación en el header Authorization", { status: 401 })
    }

    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://api.codextrader.tech'
    const backendUrl = `${backendBaseUrl}/chat`

    const backendPayload: Record<string, any> = {
      query: userMessage,
      conversation_id: body.conversation_id,
      response_mode: body.response_mode,
      category: body.category
    }

    Object.keys(backendPayload).forEach((key) => {
      if (backendPayload[key] === undefined || backendPayload[key] === null || backendPayload[key] === '') {
        delete backendPayload[key]
      }
    })

    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(backendPayload)
    })

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error('Error del backend:', backendResponse.status, errorText)

      if (backendResponse.status === 401) {
        return new Response("No autorizado. Por favor, inicia sesión nuevamente.", { status: 401 })
      }
      if (backendResponse.status === 402) {
        return new Response("Tokens agotados. Por favor, recarga.", { status: 402 })
      }

      const responseBody = errorText || 'Error desconocido'
      try {
        const parsed = JSON.parse(errorText)
        return new Response(JSON.stringify(parsed), {
          status: backendResponse.status,
          headers: { 'Content-Type': 'application/json' }
        })
      } catch {
        return new Response(responseBody, { status: backendResponse.status })
      }
    }

    const headers = new Headers()
    const backendContentType = backendResponse.headers.get('Content-Type') || 'text/plain; charset=utf-8'
    headers.set('Content-Type', backendContentType)

    const conversationIdHeader = backendResponse.headers.get('X-Conversation-Id')
    if (conversationIdHeader) {
      headers.set('X-Conversation-Id', conversationIdHeader)
    }

    return new Response(backendResponse.body, {
      status: backendResponse.status,
      headers
    })
  } catch (error) {
    console.error('Error en el route handler:', error)
    return new Response(`Error interno: ${error instanceof Error ? error.message : 'Error desconocido'}`, { status: 500 })
  }
}