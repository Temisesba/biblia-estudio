"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { OLD_TESTAMENT, NEW_TESTAMENT, slugify, type BookMeta } from "@/lib/books-meta";

export function BookPicker({
  currentOrder,
  currentChapter,
  readChapters,
}: {
  currentOrder?: number;
  currentChapter?: number;
  readChapters?: Record<number, number[]>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeBook, setActiveBook] = useState<BookMeta | null>(
    OLD_TESTAMENT.concat(NEW_TESTAMENT).find((b) => b.order === currentOrder) ?? null
  );
  const [pendingChapter, setPendingChapter] = useState<number | null>(null);

  function goTo(book: BookMeta, chapter: number) {
    setPendingChapter(chapter);
    router.push(`/leer/${slugify(book.name)}/${chapter}`);
    setTimeout(() => {
      setOpen(false);
      setPendingChapter(null);
    }, 350);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
      >
        {activeBook ? `${activeBook.name} ${currentChapter ?? ""}` : "Elegir libro"}
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-2 flex max-h-[70vh] w-[min(90vw,640px)] overflow-hidden rounded-lg border border-border bg-background shadow-xl">
          <div className="w-1/2 overflow-y-auto border-r border-border p-2">
            {[
              { label: "Antiguo Testamento", books: OLD_TESTAMENT },
              { label: "Nuevo Testamento", books: NEW_TESTAMENT },
            ].map((group) => (
              <div key={group.label}>
                <p className="px-2 pb-1 pt-2 text-xs font-semibold uppercase text-foreground/50">
                  {group.label}
                </p>
                {group.books.map((b) => (
                  <button
                    key={b.order}
                    onClick={() => setActiveBook(b)}
                    className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted ${
                      activeBook?.order === b.order ? "bg-muted font-medium" : ""
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="w-1/2 overflow-y-auto p-2">
            {activeBook ? (
              <div className="grid grid-cols-6 gap-1">
                {Array.from({ length: activeBook.chapters }, (_, i) => i + 1).map((c) => {
                  const isCurrent = activeBook.order === currentOrder && c === currentChapter;
                  const isPending = c === pendingChapter;
                  const isRead = readChapters?.[activeBook.order]?.includes(c);
                  return (
                    <button
                      key={c}
                      onClick={() => goTo(activeBook, c)}
                      title={isRead ? "Leído" : undefined}
                      className={`rounded py-1 text-sm transition-colors hover:bg-primary hover:text-primary-foreground ${
                        isCurrent || isPending
                          ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1 ring-offset-background"
                          : isRead
                            ? "bg-emerald-500/25 text-emerald-800 dark:text-emerald-300"
                            : "bg-muted"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="p-4 text-sm text-foreground/50">Selecciona un libro</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
