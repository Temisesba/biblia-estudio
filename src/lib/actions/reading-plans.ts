"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function enrollInPlan(planId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("reading_plan_enrollments")
    .insert({ user_id: user.id, plan_id: planId });
  if (error && error.code !== "23505") throw new Error(error.message);
  revalidatePath("/planes");
}

export async function markPlanDayDone(planId: string, dayNumber: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("reading_plan_progress")
    .upsert({ user_id: user.id, plan_id: planId, day_number: dayNumber });
  if (error) throw new Error(error.message);
  revalidatePath(`/planes/${planId}`);
}
