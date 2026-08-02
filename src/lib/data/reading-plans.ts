import { createClient } from "@/lib/supabase/server";
import { BOOKS } from "@/lib/books-meta";

export interface PlanSummary {
  id: string;
  name: string;
  description: string | null;
  totalDays: number;
  enrolled: boolean;
  completedDays: number;
}

export async function getPlans(userId: string): Promise<PlanSummary[]> {
  const supabase = await createClient();
  const [{ data: plans }, { data: enrollments }, { data: progress }, { data: days }] = await Promise.all([
    supabase.from("reading_plans").select("id, name, description"),
    supabase.from("reading_plan_enrollments").select("plan_id").eq("user_id", userId),
    supabase.from("reading_plan_progress").select("plan_id").eq("user_id", userId),
    supabase.from("reading_plan_days").select("plan_id"),
  ]);

  const enrolledSet = new Set((enrollments ?? []).map((e) => e.plan_id as string));
  const completedCount = new Map<string, number>();
  for (const p of progress ?? []) {
    completedCount.set(p.plan_id as string, (completedCount.get(p.plan_id as string) ?? 0) + 1);
  }
  const dayCount = new Map<string, number>();
  for (const d of days ?? []) {
    dayCount.set(d.plan_id as string, (dayCount.get(d.plan_id as string) ?? 0) + 1);
  }

  return (plans ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    description: p.description as string | null,
    totalDays: dayCount.get(p.id as string) ?? 0,
    enrolled: enrolledSet.has(p.id as string),
    completedDays: completedCount.get(p.id as string) ?? 0,
  }));
}

export interface PlanDayDetail {
  dayNumber: number;
  bookName: string;
  chapterNumber: number;
  href: string;
  completed: boolean;
}

export async function getPlanDetail(userId: string, planId: string) {
  const supabase = await createClient();
  const [{ data: plan }, { data: days }, { data: bookRows }, { data: doneRows }] = await Promise.all([
    supabase.from("reading_plans").select("*").eq("id", planId).single(),
    supabase.from("reading_plan_days").select("*").eq("plan_id", planId).order("day_number"),
    supabase.from("books").select("id, order"),
    supabase.from("reading_plan_progress").select("day_number").eq("user_id", userId).eq("plan_id", planId),
  ]);

  const idToOrder = new Map((bookRows ?? []).map((r) => [r.id as number, r.order as number]));
  const doneSet = new Set((doneRows ?? []).map((d) => d.day_number as number));

  const detail: PlanDayDetail[] = (days ?? []).map((d) => {
    const order = idToOrder.get(d.book_id as number);
    const book = BOOKS.find((b) => b.order === order);
    return {
      dayNumber: d.day_number as number,
      bookName: book?.name ?? "—",
      chapterNumber: d.chapter_number as number,
      href: book ? `/leer/${book.name.toLowerCase()}/${d.chapter_number}` : "#",
      completed: doneSet.has(d.day_number as number),
    };
  });

  return { plan, days: detail };
}
