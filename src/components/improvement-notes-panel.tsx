"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { AdminImprovementNote } from "@/types/database";
import { addImprovementNote, deleteImprovementNote } from "@/lib/actions/admin";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";

export function ImprovementNotesPanel({ notes }: { notes: AdminImprovementNote[] }) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [optimisticNotes, updateOptimisticNotes] = useOptimistic<
    AdminImprovementNote[],
    { type: "add"; note: AdminImprovementNote } | { type: "remove"; id: string }
  >(notes, (state, action) =>
    action.type === "add" ? [action.note, ...state] : state.filter((n) => n.id !== action.id)
  );

  function add() {
    const content = text.trim();
    if (!content) return;
    const optimisticEntry: AdminImprovementNote = {
      id: `optimistic-${Date.now()}`,
      content,
      created_by: null,
      created_at: new Date().toISOString(),
    };
    setText("");
    startTransition(async () => {
      updateOptimisticNotes({ type: "add", note: optimisticEntry });
      await addImprovementNote(content);
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      updateOptimisticNotes({ type: "remove", id });
      await deleteImprovementNote(id);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <h2 className="font-semibold">Área de mejoras</h2>
      <p className="text-xs text-foreground/50">
        Notas propias de ideas o pendientes de la app, solo visibles aquí en admin.
      </p>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Escribe una idea o pendiente..."
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={add}
          disabled={pending || !text.trim()}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Agregar
        </button>
      </div>
      {optimisticNotes.length === 0 ? (
        <p className="text-sm text-foreground/50">No hay notas todavía.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {optimisticNotes.map((n) => (
            <li
              key={n.id}
              className="flex items-start justify-between gap-3 rounded-md border border-border p-2.5 text-sm"
            >
              <div>
                <p>{n.content}</p>
                <p className="mt-0.5 text-xs text-foreground/40">
                  {new Date(n.created_at).toLocaleDateString("es-MX")}
                </p>
              </div>
              <ConfirmDeleteButton onConfirm={() => remove(n.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
