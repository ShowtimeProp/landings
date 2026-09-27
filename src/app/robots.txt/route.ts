/** Búsqueda/ai-input permitidos; entrenamiento excluido. Índice global sólo con opt-in.
 * Se excluyen APIs, campañas atribuidas, resolvedores QR/NFC, portal y descargas vCard.
 * Google-Extended no se bloquea: también gobierna grounding de Gemini (ai-input).
 */
const LANDINGS_URL = process.env.NEXT_PUBLIC_LANDINGS_URL || process.env.LANDINGS_URL || 'https://landings.showtimeprop.com';
export const revalidate = 3600;
export function GET() {
  return new Response(`# ShowtimeProp — landings de inmobiliarias
# Content signals: https://contentsignals.org/
User-Agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=no
Allow: /
Disallow: /api/
Disallow: /m/
Disallow: /v/
Disallow: /n/
Disallow: /perfil-lead/
Disallow: /vcard-file/

# Crawlers de entrenamiento de modelos: fuera (ai-train=no).
# Los de búsqueda y los que actúan por un usuario (OAI-SearchBot, ChatGPT-User,
# PerplexityBot, Perplexity-User, Claude-SearchBot, Claude-User, Googlebot, Bingbot)
# quedan cubiertos por el grupo *.
User-Agent: GPTBot
User-Agent: ClaudeBot
User-Agent: CCBot
User-Agent: Bytespider
User-Agent: Applebot-Extended
User-Agent: meta-externalagent
Disallow: /

Sitemap: ${LANDINGS_URL}/sitemap.xml
`, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600' } });
}
