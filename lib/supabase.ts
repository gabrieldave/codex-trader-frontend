import { createBrowserClient } from '@supabase/ssr'

/**
 * Crea un cliente de Supabase optimizado para múltiples pestañas.
 * 
 * Supabase maneja automáticamente la sincronización entre pestañas usando:
 * - localStorage para tokens de sesión
 * - Storage events para sincronizar cambios entre pestañas
 * - onAuthStateChange para notificar cambios de sesión
 * 
 * Esto permite que múltiples pestañas compartan la misma sesión sin conflictos.
 */
export function createClient() {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  // El cliente de Supabase ya maneja automáticamente:
  // - Sincronización de sesión entre pestañas
  // - Storage events para cambios de autenticación
  // - Actualización automática cuando otra pestaña cambia la sesión
  
  return client
}

