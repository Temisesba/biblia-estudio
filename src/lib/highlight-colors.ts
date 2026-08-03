export const HIGHLIGHT_COLORS = [
  { value: "#FDE68A", label: "Amarillo" },
  { value: "#BBF7D0", label: "Verde" },
  { value: "#BFDBFE", label: "Azul" },
  { value: "#FBCFE8", label: "Rosa" },
  { value: "#FED7AA", label: "Naranja" },
  { value: "#DDD6FE", label: "Morado" },
] as const;

export const DEFAULT_COLOR = HIGHLIGHT_COLORS[0].value;

// Color de la linea cuando se subraya (distinto a los colores de fondo de
// arriba, que son pasteles pensados para resaltar, no para una linea).
export const UNDERLINE_COLOR = "#F97316";
