export type UserRole = "admin" | "lector";
export type UserStatus = "activo" | "suspendido";
export type Testament = "AT" | "NT";
export type MarkType = "resaltado" | "subrayado";
export type ReadingStatus = "pendiente" | "iniciado" | "terminado";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  font_size: number;
  theme: "light" | "dark" | "system";
  created_at: string;
}

export interface Book {
  id: number;
  testament: Testament;
  name: string;
  abbr: string;
  order: number;
  chapters_count: number;
}

export interface Chapter {
  id: number;
  book_id: number;
  number: number;
  intro_text: string | null;
}

export interface Verse {
  id: number;
  book_id: number;
  chapter_id: number;
  chapter_number: number;
  verse_number: number;
  text: string;
  version: string;
}

export interface ChapterContext {
  id: number;
  book_id: number;
  chapter_number: number;
  historical_context: string | null;
  summary: string | null;
  explanation: string | null;
  central_teaching: string | null;
  reveals_about_god: string | null;
  reveals_about_humanity: string | null;
  practical_applications: string | null;
  reflection: string | null;
  prayer: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface Topic {
  id: string;
  name: string;
  slug: string;
  created_by: string | null;
  created_at: string;
}

export interface VerseTopic {
  id: string;
  topic_id: string;
  book_id: number;
  chapter_number: number;
  verse_number: number;
  created_by: string | null;
  created_at: string;
}

export interface PersonalTopic {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface PersonalVerseTopic {
  id: string;
  personal_topic_id: string;
  user_id: string;
  book_id: number;
  chapter_number: number;
  verse_number: number;
  created_at: string;
}

export interface PublicAnnotation {
  id: string;
  book_id: number;
  chapter_number: number;
  verse_number: number;
  char_start: number;
  char_end: number;
  quoted_text: string;
  note: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SectionTitle {
  id: string;
  book_id: number;
  chapter_number: number;
  verse_number: number;
  title: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Highlight {
  id: string;
  user_id: string;
  book_id: number;
  chapter_number: number;
  verse_start: number;
  verse_end: number;
  char_start: number | null;
  char_end: number | null;
  selected_text: string | null;
  type: MarkType;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  book_id: number;
  chapter_number: number;
  verse_number: number | null;
  highlight_id: string | null;
  quoted_text: string | null;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ContextHighlight {
  id: string;
  user_id: string;
  book_id: number;
  chapter_number: number;
  field_key: string;
  char_start: number;
  char_end: number;
  selected_text: string | null;
  type: MarkType;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface ContextFavorite {
  id: string;
  user_id: string;
  book_id: number;
  chapter_number: number;
  field_key: string;
  created_at: string;
}

export interface AdminImprovementNote {
  id: string;
  content: string;
  created_by: string | null;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  book_id: number;
  chapter_number: number;
  verse_start: number | null;
  verse_end: number | null;
  created_at: string;
}

export interface ReadingProgress {
  id: string;
  user_id: string;
  book_id: number;
  chapter_number: number;
  status: ReadingStatus;
  times_read: number;
  first_read_at: string | null;
  last_read_at: string | null;
}

export interface ReadingEvent {
  id: string;
  user_id: string;
  book_id: number;
  chapter_number: number;
  read_at: string;
}

export interface ReadingPlan {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ReadingPlanDay {
  id: string;
  plan_id: string;
  day_number: number;
  book_id: number;
  chapter_number: number;
}

// Alias mínimo para tipar el cliente de Supabase (@supabase/ssr) sin generar
// el archivo completo de tipos hasta tener el proyecto Supabase vinculado
// (se puede reemplazar luego con `supabase gen types typescript`).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
