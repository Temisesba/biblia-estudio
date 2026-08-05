import { createClient } from "@/lib/supabase/server";
import { BOOKS, TOTAL_CHAPTERS } from "@/lib/books-meta";
import { getBookOrderMap } from "@/lib/data/bible";

export interface BookProgress {
  order: number;
  name: string;
  testament: "AT" | "NT";
  total: number;
  read: number;
}

export interface ProgressSummary {
  totalChapters: number;
  readChapters: number;
  perTestament: Record<"AT" | "NT", { total: number; read: number }>;
  perBook: BookProgress[];
}

export async function getProgressSummary(userId: string): Promise<ProgressSummary> {
  const supabase = await createClient();
  const [idToOrder, { data: progressRows }] = await Promise.all([
    getBookOrderMap(),
    supabase
      .from("reading_progress")
      .select("book_id, chapter_number, status")
      .eq("user_id", userId)
      .eq("status", "terminado"),
  ]);

  const readByOrder = new Map<number, Set<number>>();
  for (const row of progressRows ?? []) {
    const order = idToOrder.get(row.book_id as number);
    if (order === undefined) continue;
    if (!readByOrder.has(order)) readByOrder.set(order, new Set());
    readByOrder.get(order)!.add(row.chapter_number as number);
  }

  const perBook: BookProgress[] = BOOKS.map((b) => ({
    order: b.order,
    name: b.name,
    testament: b.testament,
    total: b.chapters,
    read: readByOrder.get(b.order)?.size ?? 0,
  }));

  const perTestament: ProgressSummary["perTestament"] = {
    AT: { total: 0, read: 0 },
    NT: { total: 0, read: 0 },
  };
  for (const b of perBook) {
    perTestament[b.testament].total += b.total;
    perTestament[b.testament].read += b.read;
  }

  const readChapters = perBook.reduce((sum, b) => sum + b.read, 0);

  return { totalChapters: TOTAL_CHAPTERS, readChapters, perTestament, perBook };
}
