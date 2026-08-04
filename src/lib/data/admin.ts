import { createClient } from "@/lib/supabase/server";
import { BOOKS } from "@/lib/books-meta";
import type { Profile, AdminImprovementNote } from "@/types/database";

export async function getAllProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  return (data as Profile[]) ?? [];
}

export interface InviteCodeRow {
  id: string;
  code: string;
  max_uses: number;
  uses: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

export async function getInviteCodes(): Promise<InviteCodeRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("invite_codes").select("*").order("created_at", { ascending: false });
  return (data as InviteCodeRow[]) ?? [];
}

export interface ActivityEntry {
  user_name: string;
  book_name: string;
  chapter_number: number;
  status: string;
  last_read_at: string | null;
  href: string;
}

export async function getImprovementNotes(): Promise<AdminImprovementNote[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_improvement_notes")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as AdminImprovementNote[]) ?? [];
}

export async function getAllReadingActivity(): Promise<ActivityEntry[]> {
  const supabase = await createClient();
  const [{ data: rows }, { data: bookRows }, { data: profiles }] = await Promise.all([
    supabase
      .from("reading_progress")
      .select("user_id, book_id, chapter_number, status, last_read_at")
      .order("last_read_at", { ascending: false })
      .limit(500),
    supabase.from("books").select("id, order"),
    supabase.from("profiles").select("id, full_name"),
  ]);

  const idToOrder = new Map((bookRows ?? []).map((r) => [r.id as number, r.order as number]));
  const idToName = new Map((profiles ?? []).map((p) => [p.id as string, p.full_name as string]));

  return (rows ?? []).map((r) => {
    const order = idToOrder.get(r.book_id as number);
    const book = BOOKS.find((b) => b.order === order);
    return {
      user_name: idToName.get(r.user_id as string) ?? "—",
      book_name: book?.name ?? "—",
      chapter_number: r.chapter_number as number,
      status: r.status as string,
      last_read_at: r.last_read_at as string | null,
      href: book ? `/leer/${book.name.toLowerCase()}/${r.chapter_number}` : "#",
    };
  });
}
