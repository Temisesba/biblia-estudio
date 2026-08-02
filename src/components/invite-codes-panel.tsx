"use client";

import { useState, useTransition } from "react";
import { createInviteCode, toggleInviteActive } from "@/lib/actions/admin";
import type { InviteCodeRow } from "@/lib/data/admin";

export function InviteCodesPanel({ codes }: { codes: InviteCodeRow[] }) {
  const [maxUses, setMaxUses] = useState(1);
  const [expiresInDays, setExpiresInDays] = useState<number | "">(30);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span>Usos permitidos</span>
          <input
            type="number"
            min={1}
            value={maxUses}
            onChange={(e) => setMaxUses(Number(e.target.value))}
            className="w-24 rounded-md border border-border bg-background px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Expira en (días, vacío = nunca)</span>
          <input
            type="number"
            min={1}
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value ? Number(e.target.value) : "")}
            className="w-32 rounded-md border border-border bg-background px-2 py-1"
          />
        </label>
        <button
          disabled={pending}
          onClick={() => startTransition(() => createInviteCode(maxUses, expiresInDays || null))}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Generar código
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-3">Código</th>
              <th className="p-3">Usos</th>
              <th className="p-3">Expira</th>
              <th className="p-3">Activo</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-mono">{c.code}</td>
                <td className="p-3">
                  {c.uses}/{c.max_uses}
                </td>
                <td className="p-3 text-foreground/50">
                  {c.expires_at ? new Date(c.expires_at).toLocaleDateString("es-MX") : "Nunca"}
                </td>
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={c.active}
                    onChange={(e) => startTransition(() => toggleInviteActive(c.id, e.target.checked))}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
