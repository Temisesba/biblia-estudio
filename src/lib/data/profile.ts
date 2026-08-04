import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

// Cada layout/page bajo (app) llama a getCurrentProfile() por su cuenta (layout raiz,
// admin/layout, y de nuevo el page.tsx de turno). Sin memoizar, eso son 2-3 viajes
// redondos a Supabase (auth.getUser + select profiles) repetidos en cada navegacion,
// que es lo que se sentia como lentitud al cambiar de pestana. React.cache() reutiliza
// el resultado dentro de la misma request en vez de repetir las consultas.
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (data as Profile) ?? null;
});
