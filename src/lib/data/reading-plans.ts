import { createClient } from "@/lib/supabase/server";
import { BOOKS, slugify } from "@/lib/books-meta";
import { getBookOrderMap } from "@/lib/data/bible";

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
  const [{ data: plans }, { data: enrollments }, progress, days] = await Promise.all([
    supabase.from("reading_plans").select("id, name, description"),
    supabase.from("reading_plan_enrollments").select("plan_id").eq("user_id", userId),
    fetchAllRows((from, to, withCount) =>
      supabase
        .from("reading_plan_progress")
        .select("plan_id", withCount ? { count: "exact" } : undefined)
        .eq("user_id", userId)
        .range(from, to)
    ),
    fetchAllRows((from, to, withCount) =>
      supabase
        .from("reading_plan_days")
        .select("plan_id", withCount ? { count: "exact" } : undefined)
        .range(from, to)
    ),
  ]);

  const enrolledSet = new Set((enrollments ?? []).map((e) => e.plan_id as string));
  const completedCount = new Map<string, number>();
  for (const p of progress) {
    completedCount.set(p.plan_id as string, (completedCount.get(p.plan_id as string) ?? 0) + 1);
  }
  const dayCount = new Map<string, number>();
  for (const d of days) {
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
  id: string;
  dayNumber: number;
  bookName: string;
  chapterNumber: number;
  href: string;
  completed: boolean;
}

// PostgREST devuelve como maximo 1000 filas por consulta (max-rows), asi
// que un plan largo (como el cronologico, con 1205 dias) se trunca en
// silencio si no se pagina con .range(). Se pide el total en la primera
// pagina y las paginas restantes se piden todas en paralelo (en vez de
// una tras otra) para no sumar latencia de red innecesaria.
async function fetchAllRows<T>(
  build: (from: number, to: number, withCount: boolean) => PromiseLike<{ data: T[] | null; count?: number | null }>
): Promise<T[]> {
  const pageSize = 1000;
  const first = await build(0, pageSize - 1, true);
  const rows = first.data ?? [];
  const total = first.count ?? rows.length;
  if (total <= rows.length) return rows;

  const rest: PromiseLike<{ data: T[] | null; count?: number | null }>[] = [];
  for (let from = pageSize; from < total; from += pageSize) {
    rest.push(build(from, from + pageSize - 1, false));
  }
  const pages = await Promise.all(rest);
  return [...rows, ...pages.flatMap((p) => p.data ?? [])];
}

// Para un plan largo (la "Lectura cronológica" tiene 1205 días), lo lento de "Ver
// capítulos" no era pintar la lista sino EL PROPIO FETCH: getPlanDetail trae los 1205 dias
// completos (paginando) antes de mostrar nada. getPlanMeta/getPlanDayWindow separan eso: el
// primer clic solo pide una ventana chica de dias (ver PAGE_SIZE en los componentes), y
// "Ver más" pide la siguiente ventana bajo demanda -- el costo ya no depende del tamaño
// del plan.
export interface PlanMeta {
  plan: { id: string; name: string; description: string | null } | null;
  totalDays: number;
  firstPendingDay: number;
}

export async function getPlanMeta(userId: string, planId: string): Promise<PlanMeta> {
  const supabase = await createClient();
  const [{ data: plan }, { count: totalDays }, doneRows] = await Promise.all([
    supabase.from("reading_plans").select("id, name, description").eq("id", planId).maybeSingle(),
    supabase.from("reading_plan_days").select("id", { count: "exact", head: true }).eq("plan_id", planId),
    fetchAllRows((from, to, withCount) =>
      supabase
        .from("reading_plan_progress")
        .select("day_number", withCount ? { count: "exact" } : undefined)
        .eq("user_id", userId)
        .eq("plan_id", planId)
        .range(from, to)
    ),
  ]);

  const doneSet = new Set((doneRows ?? []).map((d) => d.day_number as number));
  let firstPendingDay = 1;
  while (doneSet.has(firstPendingDay)) firstPendingDay++;

  return { plan: plan ?? null, totalDays: totalDays ?? 0, firstPendingDay };
}

export async function getPlanDayWindow(
  userId: string,
  planId: string,
  fromDay: number,
  toDay: number
): Promise<PlanDayDetail[]> {
  const supabase = await createClient();
  const [{ data: days }, idToOrder, { data: doneRows }] = await Promise.all([
    supabase
      .from("reading_plan_days")
      .select("*")
      .eq("plan_id", planId)
      .gte("day_number", fromDay)
      .lte("day_number", toDay)
      .order("day_number"),
    getBookOrderMap(),
    supabase
      .from("reading_plan_progress")
      .select("day_number")
      .eq("user_id", userId)
      .eq("plan_id", planId)
      .gte("day_number", fromDay)
      .lte("day_number", toDay),
  ]);

  const doneSet = new Set((doneRows ?? []).map((d) => d.day_number as number));
  return (days ?? []).map((d) => {
    const order = idToOrder.get(d.book_id as number);
    const book = BOOKS.find((b) => b.order === order);
    return {
      id: d.id as string,
      dayNumber: d.day_number as number,
      bookName: book?.name ?? "—",
      chapterNumber: d.chapter_number as number,
      href: book ? `/leer/${slugify(book.name)}/${d.chapter_number}` : "#",
      completed: doneSet.has(d.day_number as number),
    };
  });
}

export async function getPlanDetail(userId: string, planId: string) {
  const supabase = await createClient();
  const [{ data: plan }, days, idToOrder, doneRows] = await Promise.all([
    supabase.from("reading_plans").select("*").eq("id", planId).single(),
    fetchAllRows((from, to, withCount) =>
      supabase
        .from("reading_plan_days")
        .select("*", withCount ? { count: "exact" } : undefined)
        .eq("plan_id", planId)
        .order("day_number")
        .range(from, to)
    ),
    getBookOrderMap(),
    fetchAllRows((from, to, withCount) =>
      supabase
        .from("reading_plan_progress")
        .select("day_number", withCount ? { count: "exact" } : undefined)
        .eq("user_id", userId)
        .eq("plan_id", planId)
        .range(from, to)
    ),
  ]);

  const doneSet = new Set((doneRows ?? []).map((d) => d.day_number as number));

  const detail: PlanDayDetail[] = (days ?? []).map((d) => {
    const order = idToOrder.get(d.book_id as number);
    const book = BOOKS.find((b) => b.order === order);
    return {
      id: d.id as string,
      dayNumber: d.day_number as number,
      bookName: book?.name ?? "—",
      chapterNumber: d.chapter_number as number,
      href: book ? `/leer/${slugify(book.name)}/${d.chapter_number}` : "#",
      completed: doneSet.has(d.day_number as number),
    };
  });

  return { plan, days: detail };
}
