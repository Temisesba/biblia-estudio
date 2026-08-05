import { createClient } from "@/lib/supabase/server";
import { BOOKS } from "@/lib/books-meta";
import { getBookOrderMap } from "@/lib/data/bible";
import type { Highlight, Note, Favorite, ReadingProgress, ContextHighlight, ContextFavorite } from "@/types/database";

export interface WithBookName {
  book_name: string;
}

function nameFor(orderMap: Map<number, number>, bookId: number) {
  const order = orderMap.get(bookId);
  return BOOKS.find((b) => b.order === order)?.name ?? "—";
}

export async function getAllUserHighlights(userId: string): Promise<(Highlight & WithBookName)[]> {
  const supabase = await createClient();
  const [{ data }, orderMap] = await Promise.all([
    supabase.from("highlights").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    getBookOrderMap(),
  ]);
  return ((data as Highlight[]) ?? []).map((h) => ({ ...h, book_name: nameFor(orderMap, h.book_id) }));
}

export async function getAllUserNotes(userId: string): Promise<(Note & WithBookName)[]> {
  const supabase = await createClient();
  const [{ data }, orderMap] = await Promise.all([
    supabase.from("notes").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    getBookOrderMap(),
  ]);
  return ((data as Note[]) ?? []).map((n) => ({ ...n, book_name: nameFor(orderMap, n.book_id) }));
}

export async function getAllUserFavorites(userId: string): Promise<(Favorite & WithBookName)[]> {
  const supabase = await createClient();
  const [{ data }, orderMap] = await Promise.all([
    supabase.from("favorites").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    getBookOrderMap(),
  ]);
  return ((data as Favorite[]) ?? []).map((f) => ({ ...f, book_name: nameFor(orderMap, f.book_id) }));
}

export async function getAllUserContextHighlights(userId: string): Promise<(ContextHighlight & WithBookName)[]> {
  const supabase = await createClient();
  const [{ data }, orderMap] = await Promise.all([
    supabase.from("context_highlights").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    getBookOrderMap(),
  ]);
  return ((data as ContextHighlight[]) ?? []).map((h) => ({ ...h, book_name: nameFor(orderMap, h.book_id) }));
}

export async function getAllUserContextFavorites(userId: string): Promise<(ContextFavorite & WithBookName)[]> {
  const supabase = await createClient();
  const [{ data }, orderMap] = await Promise.all([
    supabase.from("context_favorites").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    getBookOrderMap(),
  ]);
  return ((data as ContextFavorite[]) ?? []).map((f) => ({ ...f, book_name: nameFor(orderMap, f.book_id) }));
}

export async function getAllUserProgress(userId: string): Promise<(ReadingProgress & WithBookName)[]> {
  const supabase = await createClient();
  const [{ data }, orderMap] = await Promise.all([
    supabase
      .from("reading_progress")
      .select("*")
      .eq("user_id", userId)
      .order("last_read_at", { ascending: false }),
    getBookOrderMap(),
  ]);
  return ((data as ReadingProgress[]) ?? []).map((p) => ({ ...p, book_name: nameFor(orderMap, p.book_id) }));
}
