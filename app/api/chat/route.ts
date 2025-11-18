import { NextResponse } from 'next/server'

// Usar nodejs runtime para mejor compatibilidad con streams
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    // Leer el body y los headers del request
    const body = await req.json()
    const messages = body.messages || []
    const userMessage = messages[messages.length - 1]?.content || ''
    
    if (!userMessage) {
      return new Response("No se proporcionó ningún mensaje", { status: 400 })
    }
    
    // Obtener el token SOLO del header Authorization (nunca del body por seguridad)
    const authHeader = req.headers.get('Authorization') || ''
    const authToken = authHeader.replace('Bearer ', '').trim()
    
    if (!authToken) {
      return new Response("No se proporcionó token de autenticación en el header Authorization", { status: 401 })
    }

    // IMPORTANTE: Usar NEXT_PUBLIC_BACKEND_URL porque las variables sin NEXT_PUBLIC_ no están disponibles en el cliente
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://api.codextrader.tech'
    const backendUrl = `${backendBaseUrl}/chat`

    // 2. Reenviar la consulta y el token de auth a tu motor de Python
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}` // Pasar el token de login al backend
      },
      body: JSON.stringify({
        query: userMessage // Enviar la pregunta del usuario
      })
    })

    // 3. Manejar errores del backend
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error del backend:', response.status, errorText)
      
      if (response.status === 401) {
        return new Response("No autorizado. Por favor, inicia sesión nuevamente.", { status: 401 })
      }
      if (response.status === 402) { // 402 Pago Requerido
        return new Response("Tokens agotados. Por favor, recarga.", { status: 402 })
      }
      return new Response(`Error del backend (${response.status}): ${errorText || 'Error desconocido'}`, { status: response.status })
    }

    // 4. Obtener la respuesta del backend
    const data = await response.json()
    const respuestaTexto = data.response || 'Sin respuesta'
    
    // 5. Crear stream en formato compatible con ai/react v3.3.39
    // Usar el formato de texto plano que useChat puede parsear
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // ID y timestamp consistentes para todo el mensaje
          const messageId = `chatcmpl-${Date.now()}`
          const created = Math.floor(Date.now() / 1000)
          
          // Dividir en palabras para streaming natural
          const palabras = respuestaTexto.split(/(\s+)/)
          
          for (let i = 0; i < palabras.length; i++) {
            const palabra = palabras[i]
            
            // Formato OpenAI streaming
            const chunk = {
              id: messageId,
              object: 'chat.completion.chunk',
              created: created,
              model: 'gpt-3.5-turbo',
              choices: [{
                index: 0,
                delta: {
                  content: palabra
                },
                finish_reason: i === palabras.length - 1 ? 'stop' : null
              }]
            }
            
            const line = `data: ${JSON.stringify(chunk)}\n\n`
            controller.enqueue(encoder.encode(line))
            
            // Delay pequeño para streaming
            if (i < palabras.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 15))
            }
          }
          
          // Finalizar
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          console.error('Error:', error)
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error en el route handler:', error)
    return new Response(`Error interno: ${error instanceof Error ? error.message : 'Error desconocido'}`, { status: 500 })
  }
}

