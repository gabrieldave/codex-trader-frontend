'use client'

import { useState, useEffect } from 'react'
import { CODEX_PLANS, getPlanByCode, type PlanCode } from '@/lib/plans'
import { startCheckout } from '@/lib/billing'
import { authorizedApiCallJson } from '@/lib/api'

interface UsageData {
  tokens_monthly_limit: number
  tokens_restantes: number
  usage_percent: number
  current_plan: string | null
  fair_use_warning_shown: boolean
  fair_use_discount_eligible: boolean
  fair_use_discount_used: boolean
  fair_use_discount_eligible_at: string | null
}

interface UsageSummaryProps {
  accessToken: string | null
  className?: string
}

export default function UsageSummary({ accessToken, className = '' }: UsageSummaryProps) {
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadUsageData = async () => {
      if (!accessToken) {
        setLoading(false)
        return
      }

      try {
        const data = await authorizedApiCallJson<UsageData>('/me/usage')
        setUsageData(data)
      } catch (err) {
        console.error('Error al cargar uso:', err)
        setError(err instanceof Error ? err.message : 'Error de conexión')
      } finally {
        setLoading(false)
      }
    }

    loadUsageData()
  }, [accessToken])

  const handleDiscountCheckout = async () => {
    if (!usageData?.current_plan) return

    // Determinar el siguiente plan superior
    const currentPlanIndex = CODEX_PLANS.findIndex(p => p.code === usageData.current_plan)
    let suggestedPlan: PlanCode = 'trader' // Default

    if (currentPlanIndex >= 0 && currentPlanIndex < CODEX_PLANS.length - 1) {
      suggestedPlan = CODEX_PLANS[currentPlanIndex + 1].code as PlanCode
    } else if (currentPlanIndex === -1) {
      // Si no tiene plan, sugerir el primero
      suggestedPlan = 'explorer'
    } else {
      // Si ya está en el plan más alto, sugerir el mismo
      suggestedPlan = usageData.current_plan as PlanCode
    }

    try {
      await startCheckout(suggestedPlan)
    } catch (error) {
      console.error('Error al iniciar checkout:', error)
    }
  }

  if (loading) {
    return (
      <div className={`bg-white/10 backdrop-blur-sm rounded-lg border border-blue-500/30 shadow-xl p-6 ${className}`}>
        <div className="text-center text-blue-200">Cargando información de uso...</div>
      </div>
    )
  }

  if (error || !usageData) {
    return (
      <div className={`bg-white/10 backdrop-blur-sm rounded-lg border border-blue-500/30 shadow-xl p-6 ${className}`}>
        <div className="text-center text-red-300">{error || 'No se pudo cargar la información'}</div>
      </div>
    )
  }

  const plan = usageData.current_plan ? getPlanByCode(usageData.current_plan as PlanCode) : null
  const usagePercent = usageData.usage_percent || 0
  const progressColor = 
    usagePercent >= 90 ? 'bg-red-500' :
    usagePercent >= 80 ? 'bg-yellow-500' :
    'bg-green-500'

  return (
    <div className={`bg-white/10 backdrop-blur-sm rounded-lg border border-blue-500/30 shadow-xl p-6 ${className}`}>
      <h3 className="text-2xl font-semibold text-white mb-4">Resumen de uso</h3>

      {/* Plan actual */}
      {plan && (
        <div className="mb-4">
          <p className="text-blue-200 text-sm mb-1">Plan actual</p>
          <p className="text-white font-semibold text-lg">{plan.name}</p>
        </div>
      )}

      {/* Tokens disponibles */}
      <div className="mb-4">
        <p className="text-blue-200 text-sm mb-1">Tokens disponibles</p>
        <p className="text-white font-semibold text-xl">
          {usageData.tokens_restantes.toLocaleString()} / {usageData.tokens_monthly_limit.toLocaleString()} este mes
        </p>
      </div>

      {/* Barra de progreso */}
      <div className="mb-4">
        <div className="w-full bg-blue-900/50 rounded-full h-4 mb-2 overflow-hidden">
          <div
            className={`h-full ${progressColor} transition-all duration-300 rounded-full`}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
        <p className="text-blue-200 text-xs text-center">
          Has usado ~{usagePercent.toFixed(1)}% de tu límite mensual.
        </p>
      </div>

      {/* Mensajes según el estado */}
      <div className="space-y-3">
        {usagePercent < 80 && (
          <p className="text-blue-200 text-sm">
            Estás dentro del uso normal de tu plan.
          </p>
        )}

        {usagePercent >= 80 && usagePercent < 90 && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3">
            <p className="text-yellow-200 text-sm">
              ⚠️ Te estás acercando al límite de uso justo de tu plan. Considera subir de plan si esperas usar más consultas este mes.
            </p>
          </div>
        )}

        {usagePercent >= 90 && (
          <>
            {usageData.fair_use_discount_eligible && !usageData.fair_use_discount_used ? (
              <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-4">
                <p className="text-orange-200 text-sm mb-3">
                  🔔 Has alcanzado el límite de uso justo. Tienes un <strong className="text-white">20% de descuento</strong> disponible para subir de plan o comprar más tokens.
                </p>
                <button
                  onClick={handleDiscountCheckout}
                  className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors shadow-lg"
                >
                  Aprovechar descuento
                </button>
              </div>
            ) : usageData.fair_use_discount_used ? (
              <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3">
                <p className="text-blue-200 text-sm">
                  Has usado tu descuento de uso justo en este ciclo. Si necesitas más análisis, puedes comprar paquetes de tokens extra.
                </p>
              </div>
            ) : (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                <p className="text-red-200 text-sm">
                  Has alcanzado el límite de uso justo. Considera subir de plan o comprar tokens adicionales.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

