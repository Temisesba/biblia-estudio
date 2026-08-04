export const CONTEXT_FIELD_LABELS: Record<string, string> = {
  explanation: "Narrativa",
  historical_context: "Contexto histórico y bíblico",
  summary: "Resumen del capítulo",
  central_teaching: "Enseñanza central",
  reveals_about_god: "Qué revela acerca de Dios",
  reveals_about_humanity: "Qué revela acerca del ser humano",
  practical_applications: "Aplicaciones prácticas",
  reflection: "Reflexión final",
  prayer: "Oración breve",
};

export function contextFieldLabel(fieldKey: string): string {
  return CONTEXT_FIELD_LABELS[fieldKey] ?? fieldKey;
}
