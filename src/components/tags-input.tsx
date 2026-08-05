"use client";

import { useState } from "react";
import { X } from "lucide-react";

function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#/, "").toLowerCase();
}

// Antes las etiquetas eran un <input> de texto plano tipo "oracion familia" -- no se
// sentía como que estabas "poniendo etiquetas", solo escribiendo. Ahora cada etiqueta ya
// puesta se ve como una pastilla #etiqueta con su X para quitarla, y lo que vas escribiendo
// se ve como una vista previa de la pastilla que se va a crear (con # y todo) antes de
// confirmarla con Enter, coma, espacio, o Tab.
export function TagsInput({
  value,
  onChange,
  placeholder = "Escribe una etiqueta y presiona Enter...",
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function commitDraft() {
    const tag = normalizeTag(draft);
    setDraft("");
    if (!tag || value.includes(tag)) return;
    onChange([...value, tag]);
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-background p-2 focus-within:border-primary">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary"
        >
          #{tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            aria-label={`Quitar etiqueta ${tag}`}
            className="rounded-full hover:bg-primary/25"
          >
            <X size={11} />
          </button>
        </span>
      ))}
      <div className="relative inline-flex flex-1 items-center">
        {draft.trim() && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 whitespace-pre rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground/40"
          >
            #{normalizeTag(draft)}
          </span>
        )}
        <input
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            if (/[,\s]$/.test(v)) {
              commitDraft();
            } else {
              setDraft(v);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Tab") {
              if (draft.trim()) {
                e.preventDefault();
                commitDraft();
              }
            } else if (e.key === "Backspace" && !draft && value.length > 0) {
              removeTag(value[value.length - 1]);
            }
          }}
          onBlur={commitDraft}
          placeholder={value.length === 0 ? placeholder : "Otra etiqueta..."}
          className={`min-w-[8rem] flex-1 bg-transparent px-2.5 py-1 text-xs outline-none ${
            draft.trim() ? "text-transparent caret-foreground" : ""
          }`}
        />
      </div>
    </div>
  );
}
