import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// DELETE: Eliminar una conversación
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const authHeader = req.headers.get('Authorization') || ''
    const authToken = authHeader.replace('Bearer ', '').trim()
    
    if (!authToken) {
      return NextResponse.json({ error: "No se proporcionó token de autenticación" }, { status: 401 })
    }

    const { conversationId } = await params

    // IMPORTANTE: Usar NEXT_PUBLIC_BACKEND_URL porque las variables sin NEXT_PUBLIC_ no están disponibles en el cliente
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://api.codextrader.tech'
    const backendUrl = `${backendBaseUrl}/chat-sessions/${conversationId}`
    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
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

// PATCH: Actualizar título de una conversación
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const authHeader = req.headers.get('Authorization') || ''
    const authToken = authHeader.replace('Bearer ', '').trim()
    
    if (!authToken) {
      return NextResponse.json({ error: "No se proporcionó token de autenticación" }, { status: 401 })
    }

    const { conversationId } = await params
    const body = await req.json()
    const { title } = body

    if (!title) {
      return NextResponse.json({ error: "El título es requerido" }, { status: 400 })
    }

    // IMPORTANTE: Usar NEXT_PUBLIC_BACKEND_URL porque las variables sin NEXT_PUBLIC_ no están disponibles en el cliente
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://api.codextrader.tech'
    const backendUrl = `${backendBaseUrl}/chat-sessions/${conversationId}`
    const response = await fetch(backendUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ title })
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

