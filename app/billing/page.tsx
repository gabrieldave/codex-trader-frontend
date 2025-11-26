'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import UsageSummary from '@/components/billing/UsageSummary'
import Link from 'next/link'

export default function BillingPage() {
  const [supabase] = useState(() => createClient())
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Verificar sesión del usuario
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
        setAccessToken(session.access_token)
      } else {
        // Si no hay sesión, redirigir al login
        router.push('/')
      }
      setLoading(false)
    }
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user)
        setAccessToken(session.access_token)
      } else {
        setUser(null)
        setAccessToken(null)
        router.push('/')
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  if (!user || !accessToken) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950">
      {/* Header con navegación */}
      <div className="bg-blue-900/50 border-b border-blue-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-white text-xl font-bold hover:text-blue-200 transition">
              ← Volver al Chat
            </Link>
            <div className="text-white text-sm">
              {user.email}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          Resumen de uso y facturación
        </h1>

        {/* Componente de resumen de uso */}
        <div className="mb-8">
          <UsageSummary accessToken={accessToken} />
        </div>

        {/* Enlaces adicionales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/planes"
            className="bg-white/10 backdrop-blur-sm rounded-lg border border-blue-500/30 shadow-xl p-6 hover:bg-white/15 transition-colors"
          >
            <h3 className="text-xl font-semibold text-white mb-2">Ver planes</h3>
            <p className="text-blue-200 text-sm">
              Explora nuestros planes y precios. Elige el que mejor se adapte a tus necesidades.
            </p>
          </Link>

        </div>
      </div>
    </div>
  )
}

