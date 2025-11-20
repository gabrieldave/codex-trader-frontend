import { NextRequest, NextResponse } from 'next/server'

const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.codextrader.tech'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const authToken = authHeader?.replace('Bearer ', '') || null

    if (!authToken) {
      return NextResponse.json(
        { error: 'Token de autenticación requerido' },
        { status: 401 }
      )
    }

    const backendUrl = `${backendBaseUrl}/me/usage`

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[API /me/usage] Error del backend:', response.status, errorText)
      return NextResponse.json(
        { error: 'Error al obtener información de uso' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[API /me/usage] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}




