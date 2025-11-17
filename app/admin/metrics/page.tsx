'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import toast, { Toaster } from 'react-hot-toast'
import { authorizedApiCallJson } from '@/lib/api'
import Link from 'next/link'

interface MetricsData {
  total_events: number
  total_tokens: number
  total_cost_usd: number
  total_deep_events: number
  total_fast_events: number
  deep_events_percentage: number
  fast_events_percentage: number
  total_users: number
  total_tokens_input?: number
  total_tokens_output?: number
}

interface TopUser {
  user_id: string
  email: string
  fast_events_count: number
}

export default function AdminMetricsPage() {
  const [supabase] = useState(() => createClient())
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [topUsers, setTopUsers] = useState<TopUser[]>([])
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Verificar sesión del usuario
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
      } else {
        router.push('/')
      }
      setLoading(false)
    }
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user)
      } else {
        setUser(null)
        router.push('/')
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  // Cargar métricas al montar el componente
  useEffect(() => {
    if (user) {
      loadMetrics()
    }
  }, [user])

  const loadMetrics = async () => {
    setLoadingData(true)
    setError(null)
    try {
      const data = await authorizedApiCallJson<MetricsData>('/admin/metrics')
      setMetrics(data)
      
      // Cargar usuarios con más fast_events (para alerta FUP)
      await loadTopUsers()
    } catch (error) {
      console.error('Error al cargar métricas:', error)
      if (error instanceof Error) {
        if (error.message.includes('403') || error.message.includes('denegado')) {
          setError('Acceso denegado. Solo administradores pueden ver esta página.')
          toast.error('No tienes permisos de administrador')
        } else {
          setError(error.message)
          toast.error('Error al cargar métricas')
        }
      } else {
        setError('Error de conexión')
        toast.error('Error de conexión al cargar datos')
      }
    } finally {
      setLoadingData(false)
    }
  }

  const loadTopUsers = async () => {
    try {
      // Obtener usuarios con más fast_events desde el backend
      // Por ahora, simulamos con datos de métricas si están disponibles
      // En producción, deberías crear un endpoint específico para esto
      const data = await authorizedApiCallJson<{ users: TopUser[] }>('/admin/top-fast-users')
        .catch(() => ({ users: [] }))
      setTopUsers(data.users || [])
    } catch (error) {
      console.warn('No se pudieron cargar usuarios top (endpoint puede no existir aún)')
      setTopUsers([])
    }
  }

  // Calcular ángulos para el gráfico de pastel
  const getPieChartData = () => {
    if (!metrics) return null
    
    const deepAngle = (metrics.deep_events_percentage / 100) * 360
    const fastAngle = (metrics.fast_events_percentage / 100) * 360
    
    return {
      deep: deepAngle,
      fast: fastAngle,
      deepPercentage: metrics.deep_events_percentage,
      fastPercentage: metrics.fast_events_percentage
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const pieData = getPieChartData()

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
            <div className="flex gap-4">
              <Link href="/admin/costos" className="text-blue-200 hover:text-white transition">
                Costos
              </Link>
              <div className="text-white text-sm">
                {user.email} (Admin)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-white mb-2">
            Dashboard de Métricas
          </h1>
          <p className="text-blue-200 text-sm">
            Métricas generales del sistema y uso de servicios
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Tarjetas KPI */}
        {metrics && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Total Cost */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-blue-500/30 shadow-xl p-6">
                <div className="text-blue-200 text-sm mb-1">Costo Total</div>
                <div className="text-4xl font-bold text-white mb-2">
                  ${metrics.total_cost_usd.toFixed(2)}
                </div>
                <div className="text-blue-300 text-xs">
                  Costo estimado de API DeepSeek
                </div>
              </div>

              {/* Total Users */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-blue-500/30 shadow-xl p-6">
                <div className="text-blue-200 text-sm mb-1">Total Usuarios</div>
                <div className="text-4xl font-bold text-white mb-2">
                  {metrics.total_users.toLocaleString()}
                </div>
                <div className="text-blue-300 text-xs">
                  Usuarios registrados en el sistema
                </div>
              </div>

              {/* Total Tokens */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-blue-500/30 shadow-xl p-6">
                <div className="text-blue-200 text-sm mb-1">Total Tokens</div>
                <div className="text-4xl font-bold text-white mb-2">
                  {metrics.total_tokens.toLocaleString()}
                </div>
                <div className="text-blue-300 text-xs">
                  {metrics.total_tokens_input && metrics.total_tokens_output ? (
                    <>
                      {metrics.total_tokens_input.toLocaleString()} input + {metrics.total_tokens_output.toLocaleString()} output
                    </>
                  ) : (
                    'Tokens consumidos totales'
                  )}
                </div>
              </div>
            </div>

            {/* Gráfico de Distribución y Estadísticas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Gráfico de Pastel */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-blue-500/30 shadow-xl p-6">
                <h2 className="text-2xl font-semibold text-white mb-4">
                  Distribución de Uso
                </h2>
                {pieData && (
                  <div className="flex flex-col items-center">
                    {/* Gráfico SVG de pastel */}
                    <svg width="200" height="200" viewBox="0 0 200 200" className="mb-4">
                      <circle
                        cx="100"
                        cy="100"
                        r="80"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="40"
                        strokeDasharray={`${pieData.fast} ${360 - pieData.fast}`}
                        strokeDashoffset="90"
                        transform="rotate(-90 100 100)"
                      />
                      <circle
                        cx="100"
                        cy="100"
                        r="80"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="40"
                        strokeDasharray={`${pieData.deep} ${360 - pieData.deep}`}
                        strokeDashoffset={90 - pieData.fast}
                        transform="rotate(-90 100 100)"
                      />
                    </svg>
                    
                    {/* Leyenda */}
                    <div className="space-y-2 w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-blue-500 rounded"></div>
                          <span className="text-blue-200">Consultas Rápidas</span>
                        </div>
                        <span className="text-white font-semibold">
                          {pieData.fastPercentage.toFixed(1)}% ({metrics.total_fast_events.toLocaleString()})
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-green-500 rounded"></div>
                          <span className="text-blue-200">Estudios Profundos</span>
                        </div>
                        <span className="text-white font-semibold">
                          {pieData.deepPercentage.toFixed(1)}% ({metrics.total_deep_events.toLocaleString()})
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Estadísticas Adicionales */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-blue-500/30 shadow-xl p-6">
                <h2 className="text-2xl font-semibold text-white mb-4">
                  Estadísticas Generales
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200">Total de Eventos</span>
                    <span className="text-white font-semibold text-xl">
                      {metrics.total_events.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200">Eventos Premium</span>
                    <span className="text-green-400 font-semibold text-xl">
                      {metrics.total_deep_events.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200">Eventos FUP</span>
                    <span className="text-blue-400 font-semibold text-xl">
                      {metrics.total_fast_events.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-blue-500/30">
                    <span className="text-blue-200">Porcentaje Premium</span>
                    <span className="text-white font-semibold text-xl">
                      {metrics.deep_events_percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Alerta FUP - Usuarios con más fast_events */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-blue-500/30 shadow-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-white">
                  ⚠️ Alerta de Uso FUP
                </h2>
                <span className="text-yellow-400 text-sm">
                  Usuarios con mayor uso de Consultas Rápidas
                </span>
              </div>
              
              {topUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-blue-500/30">
                        <th className="px-4 py-3 text-blue-200 font-semibold">Email</th>
                        <th className="px-4 py-3 text-blue-200 font-semibold">Consultas Rápidas</th>
                        <th className="px-4 py-3 text-blue-200 font-semibold">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topUsers.map((topUser, index) => (
                        <tr key={topUser.user_id} className="border-b border-blue-500/10 hover:bg-white/5">
                          <td className="px-4 py-3 text-white">{topUser.email}</td>
                          <td className="px-4 py-3 text-blue-200 font-semibold">
                            {topUser.fast_events_count.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              topUser.fast_events_count > 1000 
                                ? 'bg-red-500/20 text-red-300' 
                                : topUser.fast_events_count > 500
                                ? 'bg-yellow-500/20 text-yellow-300'
                                : 'bg-green-500/20 text-green-300'
                            }`}>
                              {topUser.fast_events_count > 1000 
                                ? 'Alto Riesgo' 
                                : topUser.fast_events_count > 500
                                ? 'Monitorear'
                                : 'Normal'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-blue-200 py-8">
                  <p>No hay datos de usuarios disponibles aún.</p>
                  <p className="text-sm mt-2 text-blue-300">
                    El endpoint /admin/top-fast-users puede no estar implementado.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {loadingData && !metrics && (
          <div className="text-center text-blue-200 py-8">
            Cargando métricas...
          </div>
        )}

        {/* Botón de actualizar */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={loadMetrics}
            disabled={loadingData}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {loadingData ? 'Actualizando...' : 'Actualizar Métricas'}
          </button>
        </div>
      </div>
    </div>
  )
}

