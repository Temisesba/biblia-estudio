import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BOOKS, slugify } from "@/lib/books-meta";
import type { Verse } from "@/types/database";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  let results: (Verse & { book_order: number })[] = [];
  let matchedBooks: typeof BOOKS = [];

  if (query) {
    matchedBooks = BOOKS.filter((b) =>
      b.name.toLowerCase().includes(query.toLowerCase()) || b.abbr.toLowerCase() === query.toLowerCase()
    );

    const supabase = await createClient();
    const { data: bookRows } = await supabase.from("books").select("id, order");
    const idToOrder = new Map((bookRows ?? []).map((r) => [r.id as number, r.order as number]));

    const { data } = await supabase
      .from("verses")
      .select("*")
      .textSearch("text", query.split(/\s+/).join(" & "), { config: "spanish" })
      .limit(100);

    results = ((data as Verse[]) ?? []).map((v) => ({ ...v, book_order: idToOrder.get(v.book_id) ?? 0 }));
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Resultados para &ldquo;{query}&rdquo;</h1>

      {matchedBooks.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground/60">Libros</h2>
          <div className="flex flex-wrap gap-2">
            {matchedBooks.map((b) => (
              <Link
                key={b.order}
                href={`/leer/${slugify(b.name)}/1`}
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
              >
                {b.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground/60">Versículos ({results.length})</h2>
        {results.length === 0 && query && (
          <p className="text-sm text-foreground/50">No se encontraron versículos que coincidan.</p>
        )}
        <ul className="flex flex-col gap-2">
          {results.map((v) => {
            const book = BOOKS.find((b) => b.order === v.book_order);
            return (
              <li key={v.id}>
                <Link
                  href={book ? `/leer/${slugify(book.name)}/${v.chapter_number}` : "#"}
                  className="block rounded-md border border-border p-3 text-sm hover:bg-muted"
                >
                  <span className="font-medium text-primary">
                    {book?.name} {v.chapter_number}:{v.verse_number}
                  </span>
                  <p className="mt-1 text-foreground/80">{v.text}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
