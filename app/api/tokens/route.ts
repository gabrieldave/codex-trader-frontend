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

    const backendBaseUrl = process.env.BACKEND_URL || 'http://localhost:8000'
    const backendUrl = `${backendBaseUrl}/tokens`
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







