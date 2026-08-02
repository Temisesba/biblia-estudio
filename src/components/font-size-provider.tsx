"use client";

import { createContext, useContext, useEffect, useState } from "react";

const STEPS = [0.85, 0.925, 1, 1.1, 1.2, 1.35, 1.5];
const STORAGE_KEY = "biblia-font-scale-idx";

interface FontSizeContextValue {
  scaleIndex: number;
  increase: () => void;
  decrease: () => void;
  canIncrease: boolean;
  canDecrease: boolean;
}

const FontSizeContext = createContext<FontSizeContextValue | null>(null);

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [scaleIndex, setScaleIndex] = useState(2); // 1 = tamaño normal

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setScaleIndex(Number(stored));
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--font-scale", String(STEPS[scaleIndex]));
    window.localStorage.setItem(STORAGE_KEY, String(scaleIndex));
  }, [scaleIndex]);

  return (
    <FontSizeContext.Provider
      value={{
        scaleIndex,
        increase: () => setScaleIndex((i) => Math.min(i + 1, STEPS.length - 1)),
        decrease: () => setScaleIndex((i) => Math.max(i - 1, 0)),
        canIncrease: scaleIndex < STEPS.length - 1,
        canDecrease: scaleIndex > 0,
      }}
    >
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const ctx = useContext(FontSizeContext);
  if (!ctx) throw new Error("useFontSize debe usarse dentro de FontSizeProvider");
  return ctx;
}
