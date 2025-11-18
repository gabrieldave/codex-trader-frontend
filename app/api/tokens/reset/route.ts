import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Handler GET para verificar que la ruta existe
export async function GET() {
  return NextResponse.json({ 
    message: 'Endpoint de reset de tokens disponible',
    method: 'POST',
    usage: 'POST /api/tokens/reset?cantidad=20000'
  })
}

export async function POST(req: Request) {
  console.log('🔵 POST /api/tokens/reset - Iniciando...')
  try {
    const { searchParams } = new URL(req.url)
    const cantidad = parseInt(searchParams.get('cantidad') || '20000')
    console.log(`🔵 Cantidad solicitada: ${cantidad}`)
    
    const authHeader = req.headers.get('Authorization') || ''
    const authToken = authHeader.replace('Bearer ', '').trim()
    
    if (!authToken) {
      console.error('❌ No hay token de autenticación')
      return NextResponse.json({ error: "No se proporcionó token de autenticación" }, { status: 401 })
    }

    // IMPORTANTE: Usar NEXT_PUBLIC_BACKEND_URL porque las variables sin NEXT_PUBLIC_ no están disponibles en el cliente
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://api.codextrader.tech'
    const backendUrl = `${backendBaseUrl}/tokens/reset?cantidad=${cantidad}`
    console.log(`🔵 Llamando al backend: ${backendUrl}`)
    
    let response: Response
    try {
      response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        signal: AbortSignal.timeout(10000)
      })
    } catch (fetchError) {
      console.error('Error de conexión al backend:', fetchError)
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
        console.error(`❌ Error del backend (${response.status}):`, errorMessage)
      } catch {
        try {
          const errorText = await response.text()
          errorMessage = errorText || `Error ${response.status}: ${response.statusText}`
          console.error(`❌ Error del backend (${response.status}):`, errorMessage)
        } catch {
          errorMessage = `Error ${response.status}: ${response.statusText}`
          console.error(`❌ Error del backend (${response.status}):`, errorMessage)
        }
      }
      return NextResponse.json({ error: errorMessage, detail: errorMessage }, { status: response.status })
    }

    const data = await response.json()
    console.log('✅ Reset exitoso:', data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error desconocido',
      detail: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

