import { createClient } from "@/lib/supabase/server";
import { BOOKS } from "@/lib/books-meta";
import type { Highlight, Note, Favorite, ReadingProgress } from "@/types/database";

export interface WithBookName {
  book_name: string;
}

async function bookOrderMap(): Promise<Map<number, number>> {
  const supabase = await createClient();
  const { data } = await supabase.from("books").select("id, order");
  return new Map((data ?? []).map((r) => [r.id as number, r.order as number]));
}

function nameFor(orderMap: Map<number, number>, bookId: number) {
  const order = orderMap.get(bookId);
  return BOOKS.find((b) => b.order === order)?.name ?? "—";
}

export async function getAllUserHighlights(userId: string): Promise<(Highlight & WithBookName)[]> {
  const supabase = await createClient();
  const [{ data }, orderMap] = await Promise.all([
    supabase.from("highlights").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    bookOrderMap(),
  ]);
  return ((data as Highlight[]) ?? []).map((h) => ({ ...h, book_name: nameFor(orderMap, h.book_id) }));
}

export async function getAllUserNotes(userId: string): Promise<(Note & WithBookName)[]> {
  const supabase = await createClient();
  const [{ data }, orderMap] = await Promise.all([
    supabase.from("notes").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    bookOrderMap(),
  ]);
  return ((data as Note[]) ?? []).map((n) => ({ ...n, book_name: nameFor(orderMap, n.book_id) }));
}

export async function getAllUserFavorites(userId: string): Promise<(Favorite & WithBookName)[]> {
  const supabase = await createClient();
  const [{ data }, orderMap] = await Promise.all([
    supabase.from("favorites").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    bookOrderMap(),
  ]);
  return ((data as Favorite[]) ?? []).map((f) => ({ ...f, book_name: nameFor(orderMap, f.book_id) }));
}

export async function getAllUserProgress(userId: string): Promise<(ReadingProgress & WithBookName)[]> {
  const supabase = await createClient();
  const [{ data }, orderMap] = await Promise.all([
    supabase
      .from("reading_progress")
      .select("*")
      .eq("user_id", userId)
      .order("last_read_at", { ascending: false }),
    bookOrderMap(),
  ]);
  return ((data as ReadingProgress[]) ?? []).map((p) => ({ ...p, book_name: nameFor(orderMap, p.book_id) }));
}
