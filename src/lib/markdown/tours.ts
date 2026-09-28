/**
 * Markdown y llms.txt de tours.showtimeprop.com, armados desde el mismo
 * content.ts que usa la página: un solo texto que mantener.
 */
import { content, pricing, usd } from '@/app/tours/_lib/content';
import { showcaseClients, site, waLink } from '@/app/tours/_lib/site';
import { frontmatter } from './format';

const BASE = `${site.url}/`;

function whatsapp(): string {
  return waLink(content.whatsappFloat.mensaje);
}

function pricingLines(): string[] {
  const { tourBase, tourAereo, hosting } = pricing;
  return [
    `- Tour virtual 360 de una propiedad de hasta ${tourBase.maxM2} m²: ${usd(tourBase.price)} + IVA.`,
    `- Mismo tour con tomas aéreas 360 con drone: ${usd(tourAereo.price)} + IVA.`,
    `- Superficies mayores o varias unidades: presupuesto según los metros.`,
    `- Hosting: primeros ${hosting.mesesSinCargo} meses sin cargo por tour; después ${usd(hosting.mensual)} por tour por mes, ` +
      `o ${usd(hosting.anual)} por tour por año (${hosting.mesesDeRegaloAnual} meses de regalo). Más IVA.`,
    `- ${pricing.ivaNota}`,
  ];
}

export function buildToursMarkdown(): string {
  const out: string[] = [];
  out.push(frontmatter({ title: content.meta.title, url: BASE }));
  out.push(`# Tours virtuales 360 — ShowtimeProp\n`);
  out.push(`${content.hero.body}\n`);
  out.push(`Para inmobiliarias y comercios de Mar del Plata y la zona (Buenos Aires, Argentina).\n`);

  out.push(`## Precios\n\n${pricingLines().join('\n')}\n`);

  const incluye = content.features.incluye.items.map((i) => `- **${i.titulo}:** ${i.detalle}`);
  out.push(`## Qué incluye\n\n${incluye.join('\n')}\n`);
  out.push(`## Qué no incluye\n\n${content.features.noIncluye.items.map((i) => `- ${i}`).join('\n')}\n`);

  const pasos = content.proceso.pasos.map((p) => `${Number(p.n)}. **${p.titulo}:** ${p.texto}`);
  out.push(`## Cómo es el proceso\n\n${pasos.join('\n')}\n`);

  const clientes = showcaseClients.flatMap((c) =>
    c.tours.map((t) => `- ${c.nombre} (${c.categoriaLabel}, ${c.lugar}) — ${t.label}: ${t.url}`)
  );
  out.push(`## Tours publicados (se pueden recorrer)\n\n${clientes.join('\n')}\n`);

  const faq = content.faq.items.map((f) => `### ${f.pregunta}\n\n${f.respuesta}`);
  out.push(`## Preguntas frecuentes\n\n${faq.join('\n\n')}\n`);

  out.push(`## Contacto\n\n- WhatsApp: ${whatsapp()}\n- Email: info@showtimeprop.com\n- Web: ${BASE}\n`);
  return out.join('\n');
}

export function buildToursLlms(): string {
  return [
    '# ShowtimeProp Tours',
    '',
    '> Producción y hosting de tours virtuales 360 para inmobiliarias y comercios de Mar del Plata ' +
      `y la zona. Desde ${usd(pricing.tourBase.price)} + IVA por propiedad de hasta ${pricing.tourBase.maxM2} m², ` +
      `con ${pricing.hosting.mesesSinCargo} meses de hosting sin cargo.`,
    '',
    '## Servicio',
    '',
    `- [Tours virtuales 360](${site.url}/index.md): precios, qué incluye, proceso, ejemplos y preguntas frecuentes (Markdown).`,
    `- [Página del servicio](${BASE}): versión web con tours de ejemplo navegables.`,
    '',
    '## Contacto',
    '',
    `- [WhatsApp](${whatsapp()}): presupuestos y consultas.`,
    '- Email: info@showtimeprop.com',
    '',
    '## Optional',
    '',
    '- [Landings de inmobiliarias](https://landings.showtimeprop.com/llms.txt): portfolios y propiedades publicadas con ShowtimeProp.',
    '',
  ].join('\n');
}

export function buildToursSitemap(): string {
  const urls = [BASE, ...showcaseClients.flatMap((c) => c.tours.map((t) => t.url))];
  const escape = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const body = urls.map((u) => `  <url><loc>${escape(u)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}
