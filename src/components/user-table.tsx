"use client";

import { useTransition } from "react";
import { updateUserRole, updateUserStatus } from "@/lib/actions/admin";
import type { Profile } from "@/types/database";

export function UserTable({ profiles }: { profiles: Profile[] }) {
  const [, startTransition] = useTransition();

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left">
          <tr>
            <th className="p-3">Nombre</th>
            <th className="p-3">Correo</th>
            <th className="p-3">Rol</th>
            <th className="p-3">Estado</th>
            <th className="p-3">Registrado</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <tr key={p.id} className="border-t border-border">
              <td className="p-3">{p.full_name}</td>
              <td className="p-3">{p.email}</td>
              <td className="p-3">
                <select
                  defaultValue={p.role}
                  onChange={(e) => startTransition(() => updateUserRole(p.id, e.target.value as "admin" | "lector"))}
                  className="rounded-md border border-border bg-background px-2 py-1"
                >
                  <option value="lector">Lector</option>
                  <option value="admin">Administrador</option>
                </select>
              </td>
              <td className="p-3">
                <select
                  defaultValue={p.status}
                  onChange={(e) =>
                    startTransition(() => updateUserStatus(p.id, e.target.value as "activo" | "suspendido"))
                  }
                  className="rounded-md border border-border bg-background px-2 py-1"
                >
                  <option value="activo">Activo</option>
                  <option value="suspendido">Suspendido</option>
                </select>
              </td>
              <td className="p-3 text-foreground/50">{new Date(p.created_at).toLocaleDateString("es-MX")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
