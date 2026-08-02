import type { ChapterContext } from "@/types/database";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

const ALIASES: Record<string, keyof ChapterContext> = {
  narrativa: "explanation",
  explicacion: "explanation",
  "contexto historico y biblico": "historical_context",
  "contexto historico": "historical_context",
  contexto: "historical_context",
  "resumen del capitulo": "summary",
  resumen: "summary",
  "ensenanza central": "central_teaching",
  ensenanza: "central_teaching",
  "que revela acerca de dios": "reveals_about_god",
  "revela dios": "reveals_about_god",
  "que revela acerca del ser humano": "reveals_about_humanity",
  "revela humano": "reveals_about_humanity",
  "revela el ser humano": "reveals_about_humanity",
  "revela ser humano": "reveals_about_humanity",
  "aplicaciones practicas": "practical_applications",
  aplicacion: "practical_applications",
  aplicaciones: "practical_applications",
  "reflexion final": "reflection",
  reflexion: "reflection",
  "oracion breve": "prayer",
  oracion: "prayer",
};

export interface ParsedContextPaste {
  matched: Partial<Record<keyof ChapterContext, string>>;
  unmatchedHeaders: string[];
}

/**
 * Reparte un bloque de texto pegado en los apartados del contexto, usando
 * líneas que empiezan con "#" como títulos (ej. "#Resumen del capítulo").
 * Los títulos se emparejan de forma flexible (sin acentos/mayúsculas) contra
 * las etiquetas conocidas y sus alias más comunes.
 */
export function parseContextPaste(text: string): ParsedContextPaste {
  const lines = text.split("\n");
  const sections: { header: string; body: string[] }[] = [];
  let current: { header: string; body: string[] } | null = null;

  for (const line of lines) {
    const m = line.match(/^\s*#+\s*(.+)$/);
    if (m) {
      if (current) sections.push(current);
      current = { header: m[1].trim(), body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) sections.push(current);

  const matched: Partial<Record<keyof ChapterContext, string>> = {};
  const unmatchedHeaders: string[] = [];

  for (const s of sections) {
    const key = ALIASES[normalize(s.header)];
    const body = s.body.join("\n").trim();
    if (key && body) matched[key] = body;
    else if (!key) unmatchedHeaders.push(s.header);
  }

  return { matched, unmatchedHeaders };
}
