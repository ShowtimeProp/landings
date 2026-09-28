import type { StructuredDataProperty } from './property-structured-data';

export type PropertyQuestion = { question: string; answer: string; href?: string; linkLabel?: string };
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
// 0 es el default de carga, no un dato (mismo criterio que el JSON-LD y el Markdown).
const numeric = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;
const number = (value: number) => value.toLocaleString('es-AR', { maximumFractionDigits: 2 });

export function formatDeliveryDate(value?: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function buildPropertyQuestions(property: StructuredDataProperty, whatsappUrl: string): PropertyQuestion[] {
  const questions: PropertyQuestion[] = [];
  const add = (question: string, answer: string, href?: string, linkLabel?: string) => questions.push({ question, answer, ...(href ? { href, linkLabel } : {}) });
  const currency = text(property.currency);
  if (property.price_on_request) add('¿Cuál es el precio?', 'Precio a consultar');
  else if (currency && numeric(property.price_min) && numeric(property.price_max) && property.price_max >= property.price_min) {
    add('¿Cuál es el precio?', `${currency} ${number(property.price_min)} a ${currency} ${number(property.price_max)}`);
  } else if (currency && numeric(property.price)) add('¿Cuál es el precio?', `${currency} ${number(property.price)}`);
  if (numeric(property.expenses_amount) && text(property.expenses_currency)) add('¿Tiene expensas?', `${text(property.expenses_currency)} ${number(property.expenses_amount)}`);
  // En la base ambos campos arrancan en false: false significa «no cargado», no «no».
  // Sólo se pregunta cuando la inmobiliaria marcó que sí.
  if (property.apto_credito === true) add('¿Es apta crédito?', 'Sí');
  if (property.financiacion_propia === true) add('¿Tiene financiación propia?', 'Sí');
  const delivery = formatDeliveryDate(property.fecha_finalizacion_obra);
  if (delivery) add('¿Cuándo se entrega?', `Entrega estimada: ${delivery}`);
  const dimensions: string[] = [];
  if (numeric(property.ambientes)) dimensions.push(`${number(property.ambientes)} ambientes`);
  if (numeric(property.bedrooms)) dimensions.push(`${number(property.bedrooms)} dormitorios`);
  if (numeric(property.bathrooms)) dimensions.push(`${number(property.bathrooms)} baños`);
  if (numeric(property.area_sqm_min) && numeric(property.area_sqm_max) && property.area_sqm_max >= property.area_sqm_min) dimensions.push(`${number(property.area_sqm_min)} a ${number(property.area_sqm_max)} m²`);
  else if (numeric(property.area_sqm)) dimensions.push(`${number(property.area_sqm)} m²`);
  if (dimensions.length) add('¿Cuántos ambientes y metros tiene?', dimensions.join(', '));
  const address = property.address;
  const city = text(address?.city) || text(address?.locality);
  const streetNumber = address?.street_number ?? address?.number ?? address?.streetNumber;
  const street = [text(address?.street), typeof streetNumber === 'number' ? String(streetNumber) : text(streetNumber)].filter(Boolean).join(' ');
  const neighborhood = text(address?.neighborhood) || text(address?.barrio);
  if (city && (street || neighborhood)) add('¿Dónde está?', [street, neighborhood, city].filter(Boolean).join(', '));
  if (text(property.tour_virtual_url)) add('¿Puedo verla por dentro?', 'Sí, tiene tour virtual 360°.', text(property.tour_virtual_url), 'Ver tour virtual');
  if (whatsappUrl) add('¿Cómo consulto?', 'Contactá a la inmobiliaria por WhatsApp.', whatsappUrl, 'Consultar por WhatsApp');
  return questions;
}
