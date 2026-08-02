import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente sin cookies, usado solo para leer contenido público (versículos,
 * contexto) dentro de funciones cacheadas con unstable_cache — esas
 * funciones no pueden depender de cookies()/headers() por request.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
