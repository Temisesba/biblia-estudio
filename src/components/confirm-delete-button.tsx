"use client";

import { useState } from "react";

// Un clic en "Eliminar" cambia a un estado "¿Seguro?" en rojo (feedback visual
// inmediato) y solo borra hasta el segundo clic — evita eliminar por accidente y deja
// claro que el clic sí registró, en vez de borrar directo sin avisar.
export function ConfirmDeleteButton({
  onConfirm,
  label = "Eliminar",
  className = "shrink-0 text-xs text-red-500 hover:underline",
}: {
  onConfirm: () => void;
  label?: string;
  className?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="inline-flex shrink-0 items-center gap-2 text-xs">
        <span className="text-foreground/60">¿Seguro?</span>
        <button
          onClick={() => {
            setConfirming(false);
            onConfirm();
          }}
          className="rounded bg-red-500 px-2 py-0.5 font-medium text-white"
        >
          {label}
        </button>
        <button onClick={() => setConfirming(false)} className="text-foreground/60 hover:underline">
          Cancelar
        </button>
      </span>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} className={className}>
      {label}
    </button>
  );
}
