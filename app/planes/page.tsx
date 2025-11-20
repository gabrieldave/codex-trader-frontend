'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { CODEX_PLANS, type CodexPlan, type PlanCode, getPlanByCode } from '@/lib/plans'
import { startCheckout } from '@/lib/billing'
import type { User } from '@supabase/supabase-js'
import toast, { Toaster } from 'react-hot-toast'
import Link from 'next/link'

function PlanesPageContent() {
  const [supabase] = useState(() => createClient())
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedPlanCode = searchParams.get('selected')

  // Verificar sesión del usuario
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
        setAccessToken(session.access_token)
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
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  // Mostrar mensaje si hay un plan seleccionado después del login
  useEffect(() => {
    if (selectedPlanCode && user) {
      const plan = getPlanByCode(selectedPlanCode as PlanCode)
      if (plan) {
        toast.success(`¡Bienvenido! Has seleccionado el plan ${plan.name}.`, {
          duration: 5000,
        })
      }
    }
  }, [selectedPlanCode, user])

  const handleSelectPlan = async (planCode: PlanCode) => {
    const plan = getPlanByCode(planCode)
    
    // Si es el plan gratis, redirigir al registro
    if (plan?.isFree) {
      if (!user || !accessToken) {
        router.push(`/?plan=${planCode}`)
      } else {
        toast.success('Ya tienes acceso al plan gratis. ¡Disfruta de tus 20,000 tokens!')
        router.push('/')
      }
      return
    }
    
    if (!user || !accessToken) {
      // Si no está logueado, redirigir al login con el plan seleccionado
      router.push(`/?plan=${planCode}`)
      return
    }
    
    try {
      // Iniciar checkout de Stripe
      await startCheckout(planCode)
    } catch (error) {
      // El error ya se maneja en startCheckout con toast
      console.error('Error al iniciar checkout:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4"></div>
          <p className="text-gray-300">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      <Toaster position="top-center" />
      {/* Fondo con patrones sutiles */}
      <div className="absolute inset-0 opacity-5">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" className="text-cyan-400"/>
        </svg>
      </div>

      {/* Contenedor principal */}
      <main className="relative z-10 flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
          {/* Header con navegación */}
          <div className="mb-8">
            {user ? (
              <Link 
                href="/" 
                className="inline-flex items-center text-blue-300 hover:text-blue-200 transition-colors mb-4"
              >
                <span className="mr-2">←</span>
                <span>Volver al Chat</span>
              </Link>
            ) : (
              <Link 
                href="/" 
                className="inline-flex items-center text-blue-300 hover:text-blue-200 transition-colors mb-4"
              >
                <span className="mr-2">←</span>
                <span>Volver</span>
              </Link>
            )}
          </div>
          
          {/* Header */}
          <div className="text-center mb-12 sm:mb-16">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
              Planes y precios
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto">
              Consultas ilimitadas con uso justo. Elige el plan que mejor se adapta a tu forma de operar.
            </p>
          </div>

          {/* Grid de planes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-8 mb-16">
            {CODEX_PLANS.map((plan) => (
              <PlanCard
                key={plan.code}
                plan={plan}
                onSelect={() => handleSelectPlan(plan.code)}
              />
            ))}
          </div>

          {/* Sección de Uso Justo */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800/40 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700/50 p-8 lg:p-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">
                Consultas ilimitadas con uso justo
              </h2>
              <div className="space-y-4 text-gray-300 leading-relaxed">
                <p>
                  No te pedimos que cuentes tokens. Internamente usamos un sistema de uso justo:
                </p>
                <ul className="space-y-3 list-disc list-inside ml-2">
                  <li>
                    Cada plan tiene un rango de análisis profundos recomendados al mes.
                  </li>
                  <li>
                    Si alguna vez te acercas al límite (es raro), te avisamos con tiempo.
                  </li>
                  <li>
                    Te ofrecemos un 20% de descuento para subir de plan o comprar tokens extra.
                  </li>
                </ul>
                <p className="pt-2 text-cyan-400 font-semibold">
                  Nunca te dejamos sin respuestas: siempre tendrás una forma de seguir estudiando el mercado.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

interface PlanCardProps {
  plan: CodexPlan
  onSelect: () => void
}

function PlanCard({ plan, onSelect }: PlanCardProps) {
  return (
    <div className="relative bg-gray-800/40 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700/50 p-6 lg:p-8 flex flex-col hover:border-cyan-500/50 transition-all hover:shadow-cyan-500/20 hover:shadow-xl">
      {/* Badge */}
      {plan.badge && (
        <div className="absolute -top-3 right-4">
          <span className="px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full shadow-lg">
            {plan.badge}
          </span>
        </div>
      )}

      {/* Contenido del card */}
      <div className="flex-1">
        <h3 className="text-2xl font-bold text-white mb-2">
          {plan.name}
        </h3>
        
        <div className="mb-4">
          {plan.isFree ? (
            <span className="text-3xl lg:text-4xl font-bold text-emerald-400">
              Gratis
            </span>
          ) : (
            <>
          <span className="text-3xl lg:text-4xl font-bold text-white">
            US${plan.priceUsd}
          </span>
          <span className="text-gray-400 text-sm ml-1">/mes</span>
            </>
          )}
        </div>

        <div className="mb-4 space-y-2">
          <p className="text-cyan-400 font-semibold text-sm lg:text-base">
            <span className="font-bold">{plan.fastQueries}</span> Consultas Rápidas
          </p>
          <p className="text-cyan-400 font-semibold text-sm lg:text-base">
            y hasta <span className="font-bold">{plan.deepQueries}</span>
          </p>
        </div>

        <p className="text-gray-300 mb-6 text-sm lg:text-base leading-relaxed">
          {plan.shortDescription}
        </p>
      </div>

      {/* Botón */}
      <button
        onClick={onSelect}
        className={`w-full py-3 px-4 font-semibold text-white rounded-lg transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
          plan.isFree
            ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500'
            : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500'
        }`}
      >
        {plan.isFree ? 'Registrarse Gratis' : `Empezar con ${plan.name}`}
      </button>
    </div>
  )
}

export default function PlanesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4"></div>
          <p className="text-gray-300">Cargando...</p>
        </div>
      </div>
    }>
      <PlanesPageContent />
    </Suspense>
  )
}

