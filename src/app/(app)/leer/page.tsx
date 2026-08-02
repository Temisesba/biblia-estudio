import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { BOOKS, slugify } from "@/lib/books-meta";

export default async function LeerIndexPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("reading_progress")
    .select("book_id, chapter_number, books(order)")
    .eq("user_id", profile.id)
    .order("last_read_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (last?.books) {
    const order = (last.books as unknown as { order: number }).order;
    const book = BOOKS.find((b) => b.order === order);
    if (book) redirect(`/leer/${slugify(book.name)}/${last.chapter_number}`);
  }

  redirect(`/leer/${slugify("Génesis")}/1`);
}
