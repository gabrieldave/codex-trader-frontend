'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import toast, { Toaster } from 'react-hot-toast'
import { authorizedApiCallJson } from '@/lib/api'
import Link from 'next/link'

interface DailySummary {
  date: string
  tokens_input: number
  tokens_output: number
  cost_estimated_usd: number
  revenue_usd: number
}

interface CostSummary {
  from: string
  to: string
  daily: DailySummary[]
  totals: {
    tokens_input: number
    tokens_output: number
    cost_estimated_usd: number
    revenue_usd: number
    margin_usd: number
    margin_percent: number
  }
}

export default function AdminCostosPage() {
  const [supabase] = useState(() => createClient())
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Calcular fechas por defecto (últimos 30 días)
  const getDefaultDates = () => {
    const today = new Date()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(today.getDate() - 30)
    
    return {
      from: thirtyDaysAgo.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0]
    }
  }

  const [dateFrom, setDateFrom] = useState(getDefaultDates().from)
  const [dateTo, setDateTo] = useState(getDefaultDates().to)

  // Verificar sesión del usuario
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
        setAccessToken(session.access_token)
      } else {
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

  // Cargar datos cuando cambian las fechas o el token
  useEffect(() => {
    if (accessToken && dateFrom && dateTo) {
      loadCostSummary()
    }
  }, [accessToken, dateFrom, dateTo])

  const loadCostSummary = async () => {
    if (!accessToken) return

    setLoadingData(true)
    setError(null)
    try {
      const data = await authorizedApiCallJson(
        `/admin/cost-summary?from=${dateFrom}&to=${dateTo}`
      )
      setCostSummary(data as CostSummary)
    } catch (error) {
      console.error('Error al cargar resumen de costos:', error)
      if (error instanceof Error) {
        if (error.message.includes('403') || error.message.includes('denegado')) {
          setError('Acceso denegado. Solo administradores pueden ver esta página.')
          toast.error('No tienes permisos de administrador')
        } else {
          setError(error.message)
          toast.error('Error al cargar resumen de costos')
        }
      } else {
        setError('Error de conexión')
        toast.error('Error de conexión al cargar datos')
      }
    } finally {
      setLoadingData(false)
    }
  }

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
      <Toaster position="top-right" />
      
      {/* Header con navegación */}
      <div className="bg-blue-900/50 border-b border-blue-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-white text-xl font-bold hover:text-blue-200 transition">
              ← Volver al Chat
            </Link>
            <div className="text-white text-sm">
              {user.email} (Admin)
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-white mb-2">
            Panel Administrativo - Costos e Ingresos
          </h1>
          <p className="text-blue-200 text-sm">
            ⚠️ Esta página es solo para uso interno del administrador. No debe ser accesible a usuarios normales.
          </p>
        </div>

        {/* Selector de fechas */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-blue-500/30 shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-semibold text-white mb-4">Rango de fechas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-blue-200 text-sm mb-2">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-blue-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-blue-200 text-sm mb-2">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-blue-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={loadCostSummary}
                disabled={loadingData}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {loadingData ? 'Cargando...' : 'Actualizar'}
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Totales */}
        {costSummary && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-blue-500/30 shadow-xl p-6">
                <div className="text-blue-200 text-sm mb-1">Costos Totales</div>
                <div className="text-3xl font-bold text-white">
                  ${costSummary.totals.cost_estimated_usd.toFixed(2)}
                </div>
                <div className="text-blue-300 text-xs mt-2">
                  {costSummary.totals.tokens_input.toLocaleString()} input + {costSummary.totals.tokens_output.toLocaleString()} output tokens
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-blue-500/30 shadow-xl p-6">
                <div className="text-blue-200 text-sm mb-1">Ingresos Totales</div>
                <div className="text-3xl font-bold text-green-400">
                  ${costSummary.totals.revenue_usd.toFixed(2)}
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-blue-500/30 shadow-xl p-6">
                <div className="text-blue-200 text-sm mb-1">Margen</div>
                <div className={`text-3xl font-bold ${costSummary.totals.margin_usd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${costSummary.totals.margin_usd.toFixed(2)}
                </div>
                <div className="text-blue-300 text-xs mt-2">
                  {costSummary.totals.margin_percent.toFixed(1)}% de margen
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-blue-500/30 shadow-xl p-6">
                <div className="text-blue-200 text-sm mb-1">Días analizados</div>
                <div className="text-3xl font-bold text-white">
                  {costSummary.daily.length}
                </div>
              </div>
            </div>

            {/* Tabla diaria */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-blue-500/30 shadow-xl p-6">
              <h2 className="text-2xl font-semibold text-white mb-4">Resumen Diario</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-blue-500/30">
                      <th className="px-4 py-3 text-blue-200 font-semibold">Fecha</th>
                      <th className="px-4 py-3 text-blue-200 font-semibold">Tokens Input</th>
                      <th className="px-4 py-3 text-blue-200 font-semibold">Tokens Output</th>
                      <th className="px-4 py-3 text-blue-200 font-semibold">Costo (USD)</th>
                      <th className="px-4 py-3 text-blue-200 font-semibold">Ingresos (USD)</th>
                      <th className="px-4 py-3 text-blue-200 font-semibold">Margen (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costSummary.daily.map((day) => {
                      const dayMargin = day.revenue_usd - day.cost_estimated_usd
                      return (
                        <tr key={day.date} className="border-b border-blue-500/10 hover:bg-white/5">
                          <td className="px-4 py-3 text-white">{day.date}</td>
                          <td className="px-4 py-3 text-blue-200">{day.tokens_input.toLocaleString()}</td>
                          <td className="px-4 py-3 text-blue-200">{day.tokens_output.toLocaleString()}</td>
                          <td className="px-4 py-3 text-red-300">${day.cost_estimated_usd.toFixed(4)}</td>
                          <td className="px-4 py-3 text-green-300">${day.revenue_usd.toFixed(2)}</td>
                          <td className={`px-4 py-3 font-semibold ${dayMargin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ${dayMargin.toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {loadingData && !costSummary && (
          <div className="text-center text-blue-200 py-8">
            Cargando datos...
          </div>
        )}
      </div>
    </div>
  )
}

