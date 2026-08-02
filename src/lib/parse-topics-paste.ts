import { BOOKS } from "@/lib/books-meta";
import { matchBookAtStart } from "@/lib/reading-plan-parser";

export interface ParsedTopicRef {
  bookOrder: number;
  bookName: string;
  chapterNumber: number;
  verseStart: number;
  // null = "hasta el final del capitulo" (referencia sin versiculo, ej. "Salmo 88")
  verseEnd: number | null;
}

export interface ParsedTopicGroup {
  name: string;
  refs: ParsedTopicRef[];
}

export interface TopicsParseResult {
  groups: ParsedTopicGroup[];
  unmatched: string[];
}

// Formato esperado:
// #NombreDelTema
// Libro Capitulo:VersiculoInicio[-VersiculoFin] — descripcion opcional (se ignora)
export function parseTopicsPaste(text: string): TopicsParseResult {
  const groups: ParsedTopicGroup[] = [];
  const unmatched: string[] = [];
  let current: ParsedTopicGroup | null = null;

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (line.startsWith("#")) {
      const name = line.slice(1).trim();
      if (!name) continue;
      current = { name, refs: [] };
      groups.push(current);
      continue;
    }

    if (!current) {
      unmatched.push(line);
      continue;
    }

    const refPart = line.split(/\s+[—–-]\s+/)[0].trim();

    // "Libro Cap:VerInicio[-VerFin]" o, sin versiculo, "Libro Cap" (capitulo completo)
    const withVerse = refPart.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
    const wholeChapter = withVerse ? null : refPart.match(/^(.+?)\s+(\d+)$/);
    const match = withVerse ?? wholeChapter;
    if (!match) {
      unmatched.push(line);
      continue;
    }

    const bookWords = match[1].trim().split(/\s+/);
    const bookMatch = matchBookAtStart(bookWords);
    if (!bookMatch || bookMatch.wordsUsed !== bookWords.length) {
      unmatched.push(line);
      continue;
    }

    const bookMeta = BOOKS.find((b) => b.order === bookMatch.order)!;
    const chapterNumber = Number(match[2]);
    const verseStart = withVerse ? Number(withVerse[3]) : 1;
    const verseEnd = withVerse ? (withVerse[4] ? Number(withVerse[4]) : verseStart) : null;

    current.refs.push({
      bookOrder: bookMatch.order,
      bookName: bookMeta.name,
      chapterNumber,
      verseStart,
      verseEnd,
    });
  }

  return { groups, unmatched };
}
