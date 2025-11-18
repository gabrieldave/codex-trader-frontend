import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// GET: Obtener lista de sesiones de chat
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || ''
    const authToken = authHeader.replace('Bearer ', '').trim()
    
    // 🚨 DEBUG: Verificar token recibido
    console.log('[API /chat-sessions] DEBUG authHeader recibido:', authHeader ? `${authHeader.substring(0, 30)}...` : 'vacío/null')
    console.log('[API /chat-sessions] DEBUG authToken extraído:', authToken ? `${authToken.substring(0, 20)}...` : 'null/undefined')
    console.log('[API /chat-sessions] DEBUG Todos los headers:', Object.fromEntries(req.headers.entries()))
    
    if (!authToken) {
      console.error('[API /chat-sessions] ERROR: No se proporcionó token de autenticación')
      return NextResponse.json({ error: "No se proporcionó token de autenticación" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    // IMPORTANTE: Usar NEXT_PUBLIC_BACKEND_URL porque las variables sin NEXT_PUBLIC_ no están disponibles en el cliente
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://api.codextrader.tech'
    const backendUrl = `${backendBaseUrl}/chat-sessions?limit=${limit}`
    
    // 🚨 DEBUG: Verificar configuración del backend
    console.log('[API /chat-sessions] DEBUG backendBaseUrl:', backendBaseUrl)
    console.log('[API /chat-sessions] DEBUG backendUrl:', backendUrl)
    console.log('[API /chat-sessions] DEBUG Token que se enviará al backend:', authToken ? `${authToken.substring(0, 20)}...` : 'null')
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    // 🚨 DEBUG: Verificar respuesta del backend
    console.log('[API /chat-sessions] DEBUG Response status:', response.status)
    console.log('[API /chat-sessions] DEBUG Response ok:', response.ok)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[API /chat-sessions] ERROR Backend response:', errorText)
      return NextResponse.json({ error: errorText }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 })
  }
}

// POST: Crear nueva sesión de chat
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || ''
    const authToken = authHeader.replace('Bearer ', '').trim()
    
    if (!authToken) {
      return NextResponse.json({ error: "No se proporcionó token de autenticación" }, { status: 401 })
    }

    const body = await req.json()
    const { title } = body

    // IMPORTANTE: Usar NEXT_PUBLIC_BACKEND_URL porque las variables sin NEXT_PUBLIC_ no están disponibles en el cliente
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://api.codextrader.tech'
    const backendUrl = `${backendBaseUrl}/chat-sessions`
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ title: title || null })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: errorText }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 })
  }
}
