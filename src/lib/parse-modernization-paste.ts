export interface ParsedModernization {
  oldPhrase: string;
  newPhrase: string;
}

// Formato esperado, una pareja por linea:
// "frase antigua" → "frase moderna"
// tambien acepta comillas rectas y "->" en vez de la flecha.
export function parseModernizationPaste(text: string): { pairs: ParsedModernization[]; unmatched: string[] } {
  const pairs: ParsedModernization[] = [];
  const unmatched: string[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const match = line.match(/^[“"]([^”"]+)[”"]\s*(?:→|->)\s*[“"]([^”"]+)[”"][.,]?$/);
    if (!match) {
      unmatched.push(line);
      continue;
    }
    pairs.push({ oldPhrase: match[1].trim(), newPhrase: match[2].trim() });
  }

  return { pairs, unmatched };
}
