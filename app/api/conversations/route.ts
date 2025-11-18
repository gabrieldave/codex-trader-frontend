import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || ''
    const authToken = authHeader.replace('Bearer ', '').trim()
    
    if (!authToken) {
      return NextResponse.json({ error: "No se proporcionó token de autenticación" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '100')

    // IMPORTANTE: Usar NEXT_PUBLIC_BACKEND_URL porque las variables sin NEXT_PUBLIC_ no están disponibles en el cliente
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://api.codextrader.tech'
    const backendUrl = `${backendBaseUrl}/conversations?limit=${limit}`
    const response = await fetch(backendUrl, {
      method: 'GET',
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







