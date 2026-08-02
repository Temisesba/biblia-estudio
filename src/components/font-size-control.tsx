"use client";

import { useFontSize } from "@/components/font-size-provider";

export function FontSizeControl() {
  const { increase, decrease, canIncrease, canDecrease } = useFontSize();
  return (
    <div className="flex items-center rounded-md border border-border">
      <button
        type="button"
        onClick={decrease}
        disabled={!canDecrease}
        aria-label="Reducir tamaño de letra"
        className="px-2 py-1.5 text-xs font-semibold disabled:opacity-30"
      >
        A-
      </button>
      <div className="h-5 w-px bg-border" />
      <button
        type="button"
        onClick={increase}
        disabled={!canIncrease}
        aria-label="Aumentar tamaño de letra"
        className="px-2 py-1.5 text-sm font-semibold disabled:opacity-30"
      >
        A+
      </button>
    </div>
  );
}
