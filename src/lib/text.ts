/**
 * Limpieza de textos cargados por las inmobiliarias.
 */

// Descripciones de relleno que aparecen en la base ("Descripcion", "-", ...):
// para un buscador o un agente son peor que no tener descripción.
const PLACEHOLDER_DESCRIPTIONS = new Set(['descripcion', 'sin descripcion', '-', '.', 'n/a']);

function stripAccents(value: string): string {
  return value.normalize('NFKD').replace(/[̀-ͯ]/g, '');
}

/**
 * Devuelve la descripción en texto plano, o null si está vacía o es de relleno.
 * Algunas fuentes (MLS, portales) traen HTML: se pasa a texto.
 */
export function cleanDescription(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw
    .replace(/\r\n?/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!text) return null;
  if (PLACEHOLDER_DESCRIPTIONS.has(stripAccents(text).toLowerCase())) return null;
  return text;
}

/** Recorta espacios y devuelve null si no queda nada. */
export function cleanText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw.replace(/\s+/g, ' ').trim();
  return text || null;
}
