export type PlanCode = "gratis" | "explorer" | "trader" | "pro" | "institucional";

export interface CodexPlan {
  code: PlanCode;
  name: string;
  priceUsd: number;
  tokensPerMonth: number;
  approxDeepAnalyses: number;
  badge: string; // ej. "Ideal para empezar", "Más popular", etc.
  shortDescription: string;
  fullDescription: string;
  fastQueries: string; // "500", "2,500", "Ilimitadas", etc.
  deepQueries: string; // Descripción de estudios detallados con citación
  isFree?: boolean; // Indica si es el plan gratis
}

export const CODEX_PLANS: CodexPlan[] = [
  {
    code: "gratis",
    name: "Gratis",
    priceUsd: 0,
    tokensPerMonth: 20_000,
    approxDeepAnalyses: 2,
    badge: "Prueba gratis",
    shortDescription: "20,000 tokens gratis para empezar.",
    fullDescription:
      "Plan de prueba gratuito con 20,000 tokens para explorar todas las funcionalidades. Perfecto para conocer Codex Trader sin compromiso. Incluye análisis de gráficas con IA.",
    fastQueries: "50",
    deepQueries: "2 Análisis Profundos",
    isFree: true
  },
  {
    code: "explorer",
    name: "Explorer",
    priceUsd: 9.99,
    tokensPerMonth: 150_000,
    approxDeepAnalyses: 17,
    badge: "Para empezar en serio",
    shortDescription: "17 estudios de mercado completos al mes.",
    fullDescription:
      "Accede a hasta 17 análisis profundos al mes. Ideal para traders que analizan 3–4 oportunidades por semana y quieren validar sus ideas con contenido profesional.",
    fastQueries: "500",
    deepQueries: "17 Estudios Detallados con Citación"
  },
  {
    code: "trader",
    name: "Trader",
    priceUsd: 19.99,
    tokensPerMonth: 400_000,
    approxDeepAnalyses: 45,
    badge: "Trader activo",
    shortDescription: "45 análisis profundos cada mes.",
    fullDescription:
      "Pensado para traders activos que revisan el mercado todos los días. Hasta 45 consultas profundas al mes para gestionar riesgo, psicología y setups diarios.",
    fastQueries: "2,500",
    deepQueries: "45 Estudios Detallados con Citación"
  },
  {
    code: "pro",
    name: "Pro",
    priceUsd: 39.99,
    tokensPerMonth: 1_000_000,
    approxDeepAnalyses: 113,
    badge: "Para analistas serios",
    shortDescription: "113 consultas detalladas al mes.",
    fullDescription:
      "Para analistas serios que hacen backtesting, análisis multi-libro y creación de sistemas. Aproximadamente 4 análisis profundos al día durante todo el mes.",
    fastQueries: "Ilimitadas",
    deepQueries: "113 Consultas Profundas con Validación de Fuentes"
  },
  {
    code: "institucional",
    name: "Institucional",
    priceUsd: 99.99,
    tokensPerMonth: 3_000_000,
    approxDeepAnalyses: 340,
    badge: "Equipos y fondos",
    shortDescription: "Hasta 340 análisis mensuales para equipos.",
    fullDescription:
      "Diseñado para equipos, mesas de trading y fondos familiares. Hasta 340 análisis profundos compartidos entre 3–5 traders.",
    fastQueries: "Ilimitadas",
    deepQueries: "340 Análisis Mensuales (para equipos)"
  }
];

/**
 * Obtiene un plan por su código
 * @param code - Código del plan a buscar
 * @returns El plan encontrado o undefined si no existe
 */
export function getPlanByCode(code: PlanCode): CodexPlan | undefined {
  return CODEX_PLANS.find(p => p.code === code);
}

/**
 * Obtiene todos los planes disponibles
 * @returns Array con todos los planes
 */
export function getAllPlans(): CodexPlan[] {
  return CODEX_PLANS;
}

/**
 * Verifica si un código de plan es válido
 * @param code - Código a verificar
 * @returns true si el código es válido, false en caso contrario
 */
export function isValidPlanCode(code: string): code is PlanCode {
  return CODEX_PLANS.some(p => p.code === code);
}

