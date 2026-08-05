"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getPlanDetail } from "@/lib/data/reading-plans";
import { getBookOrderRows } from "@/lib/data/bible";
import { markChapterRead } from "@/lib/actions/study";

export async function loadPlanDetail(planId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return getPlanDetail(user.id, planId);
}

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

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("No autorizado");
  return { supabase, userId: user.id };
}

export async function createReadingPlan(name: string, description: string) {
  const { supabase, userId } = await requireAdmin();
  const { data, error } = await supabase
    .from("reading_plans")
    .insert({ name: name.trim(), description: description.trim() || null, created_by: userId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/planes");
  revalidatePath("/planes");
  return data;
}

export async function addPlanChapters(
  planId: string,
  refs: { bookOrder: number; chapterNumber: number }[]
) {
  const { supabase } = await requireAdmin();

  const bookRows = await getBookOrderRows();
  const orderToId = new Map(bookRows.map((r) => [r.order, r.id]));

  const { data: existingDays } = await supabase
    .from("reading_plan_days")
    .select("day_number")
    .eq("plan_id", planId)
    .order("day_number", { ascending: false })
    .limit(1);
  let nextDay = ((existingDays?.[0]?.day_number as number) ?? 0) + 1;

  const rows = [];
  for (const ref of refs) {
    const bookId = orderToId.get(ref.bookOrder);
    if (!bookId) continue;
    rows.push({ plan_id: planId, day_number: nextDay++, book_id: bookId, chapter_number: ref.chapterNumber });
  }
  if (rows.length === 0) return;

  const { error } = await supabase.from("reading_plan_days").insert(rows);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/planes/${planId}`);
  revalidatePath(`/planes/${planId}`);
}

export async function deletePlanDay(id: string, planId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("reading_plan_days").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/planes/${planId}`);
  revalidatePath(`/planes/${planId}`);
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

  // Unificar con el progreso general: marcar tambien el capitulo como leido (esto ya
  // registra el evento en reading_events y recalcula reading_progress), para que
  // aparezca en el calendario y en Progreso.
  const { data: day } = await supabase
    .from("reading_plan_days")
    .select("book_id, chapter_number")
    .eq("plan_id", planId)
    .eq("day_number", dayNumber)
    .maybeSingle();
  if (day) {
    const bookRows = await getBookOrderRows();
    const bookOrder = bookRows.find((b) => b.id === day.book_id)?.order;
    if (bookOrder !== undefined) {
      await markChapterRead(bookOrder, day.chapter_number as number);
    }
  }

  revalidatePath(`/planes/${planId}`);
}
