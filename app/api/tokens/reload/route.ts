import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { cantidad } = body
    
    if (!cantidad || cantidad <= 0) {
      return NextResponse.json({ error: "La cantidad debe ser mayor a 0" }, { status: 400 })
    }
    
    const authHeader = req.headers.get('Authorization') || ''
    const authToken = authHeader.replace('Bearer ', '').trim()
    
    if (!authToken) {
      return NextResponse.json({ error: "No se proporcionó token de autenticación" }, { status: 401 })
    }

    // IMPORTANTE: Usar NEXT_PUBLIC_BACKEND_URL porque las variables sin NEXT_PUBLIC_ no están disponibles en el cliente
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://api.codextrader.tech'
    const backendUrl = `${backendBaseUrl}/tokens/reload`
    
    let response: Response
    try {
      response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ cantidad }),
        // Timeout de 10 segundos
        signal: AbortSignal.timeout(10000)
      })
    } catch (fetchError) {
      console.error('Error de conexión al backend:', fetchError)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json({ 
          error: 'El servidor no responde. Verifica la conexión con el backend.',
          detail: 'Timeout de conexión'
        }, { status: 503 })
      }
      return NextResponse.json({ 
        error: 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.',
        detail: fetchError instanceof Error ? fetchError.message : 'Error de conexión'
      }, { status: 503 })
    }

    if (!response.ok) {
      let errorMessage = 'Error desconocido'
      try {
        const errorData = await response.json()
        errorMessage = errorData.detail || errorData.error || errorMessage
      } catch {
        try {
          const errorText = await response.text()
          errorMessage = errorText || `Error ${response.status}: ${response.statusText}`
        } catch {
          errorMessage = `Error ${response.status}: ${response.statusText}`
        }
      }
      return NextResponse.json({ error: errorMessage, detail: errorMessage }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error desconocido',
      detail: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

