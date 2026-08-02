"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export function CollapsibleSection({
  title,
  defaultOpen = false,
  extra,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  extra?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center justify-between gap-3 p-4">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex flex-1 items-center gap-2 text-left font-semibold">
          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          {title}
        </button>
        {extra}
      </div>
      {open && <div className="border-t border-border p-4">{children}</div>}
    </div>
  );
}
