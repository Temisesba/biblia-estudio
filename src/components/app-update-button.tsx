"use client";

import { useState } from "react";
import { APP_VERSION } from "@/lib/app-version";

export function AppUpdateButton() {
  const [status, setStatus] = useState<"idle" | "checking" | "done">("idle");

  async function forceUpdate() {
    setStatus("checking");
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } finally {
      setStatus("done");
      window.location.reload();
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-4">
      <div className="flex-1">
        <p className="text-sm text-foreground/50">Versión de la app</p>
        <p className="font-semibold">{APP_VERSION}</p>
      </div>
      <button
        type="button"
        onClick={forceUpdate}
        disabled={status === "checking"}
        className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
      >
        {status === "checking" ? "Actualizando..." : "Buscar actualización"}
      </button>
    </div>
  );
}
