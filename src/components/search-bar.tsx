"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/buscar?q=${encodeURIComponent(q.trim())}`);
      }}
      className="relative flex-1 max-w-md"
    >
      <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar palabra, frase o pasaje..."
        className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary"
      />
    </form>
  );
}
