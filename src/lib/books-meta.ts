import booksMeta from "../../data/books-meta.json";
import type { Testament } from "@/types/database";

export interface BookMeta {
  order: number;
  testament: Testament;
  name: string;
  abbr: string;
  chapters: number;
}

export const BOOKS: BookMeta[] = booksMeta as BookMeta[];

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-");
}

export function getBookBySlug(slug: string): BookMeta | undefined {
  return BOOKS.find((b) => slugify(b.name) === slug);
}

export const OLD_TESTAMENT = BOOKS.filter((b) => b.testament === "AT");
export const NEW_TESTAMENT = BOOKS.filter((b) => b.testament === "NT");

export const TOTAL_CHAPTERS = BOOKS.reduce((sum, b) => sum + b.chapters, 0);
