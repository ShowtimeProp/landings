const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const loaded = { exports: {} };
  new Function('exports', code)(loaded.exports);
  return loaded.exports;
}
const { buildPropertyStructuredData } = load('src/lib/seo/property-structured-data.ts');
const { buildPropertyQuestions, formatDeliveryDate } = load('src/lib/seo/property-questions.ts');
const build = (property) => buildPropertyStructuredData({ property: { name: 'Casa', ...property }, tenant: { name: 'Agencia' }, canonicalUrl: 'https://example.com/p/agencia/casa', portfolioUrl: 'https://example.com/p/agencia' })['@graph'][0];

test('missing fields omit questions, dates, offers, amenities and videos', () => {
  assert.deepEqual(buildPropertyQuestions({ name: 'Casa' }, ''), []);
  const listing = build({});
  for (const field of ['datePosted', 'dateModified', 'subjectOf', 'offers']) assert.equal(listing[field], undefined);
  assert.equal(listing.mainEntity.amenityFeature, undefined);
  assert.equal(listing.mainEntity.accommodationFloorPlan, undefined);
});
test('explicit false and zero survive; missing currencies do not invent money', () => {
  // false y 0 son defaults de carga: no se publican como dato.
  const questions = buildPropertyQuestions({ name: 'Casa', apto_credito: false, financiacion_propia: false, bedrooms: 0, expenses_amount: 0, expenses_currency: 'ARS', price: 100 }, '');
  assert.equal(questions.filter((q) => q.answer === 'No').length, 0);
  assert(!questions.some((q) => q.answer === 'ARS 0'));
  assert(!questions.some((q) => q.answer.includes('0 dormitorios')));
  const confirmed = buildPropertyQuestions({ name: 'Casa', apto_credito: true, financiacion_propia: true }, '');
  assert.deepEqual(confirmed.map((q) => [q.question, q.answer]), [['¿Es apta crédito?', 'Sí'], ['¿Tiene financiación propia?', 'Sí']]);
  assert(!questions.some((q) => q.question === '¿Cuál es el precio?'));
  assert.equal(build({ price: 100 }).offers, undefined);
});
test('real dates, amenities, plan and tour are represented', () => {
  const listing = build({ created_at: '2026-01-01T12:00:00Z', updated_at: '2026-02-01T12:00:00Z', amenities: ['Balcón'], floor_plan_url: 'https://example.com/plano.png', tour_virtual_url: 'https://example.com/tour' });
  assert.equal(listing.datePosted, '2026-01-01T12:00:00Z');
  assert.equal(listing.dateModified, '2026-02-01T12:00:00Z');
  assert.deepEqual(listing.mainEntity.amenityFeature, [{ '@type': 'LocationFeatureSpecification', name: 'Balcón', value: true }]);
  assert.equal(listing.mainEntity.accommodationFloorPlan['@type'], 'FloorPlan');
  assert.equal(listing.subjectOf[0]['@type'], 'WebPage');
});
test('video requires actual upload date and thumbnail; host selects embedding', () => {
  const video = { video_url: 'https://youtu.be/abc123', images: ['https://example.com/photo.jpg'], created_at: '2026-01-01T00:00:00Z' };
  assert.equal(build(video).subjectOf[0].embedUrl, 'https://www.youtube.com/embed/abc123');
  assert.equal(build({ ...video, created_at: null }).subjectOf, undefined);
  assert.equal(build({ ...video, images: [] }).subjectOf, undefined);
  assert.equal(build({ ...video, video_url: 'https://example.com/video.mp4' }).subjectOf[0].contentUrl, 'https://example.com/video.mp4');
});
test('project range uses AggregateOffer, property uses Offer; on request omits prices', () => {
  const project = { property_type: 'project', price: 100, price_min: 100, price_max: 200, currency: 'USD', total_units: 20 };
  assert.equal(build(project).offers['@type'], 'AggregateOffer');
  assert.equal(build(project).offers.offerCount, 20);
  assert.equal(build({ ...project, total_units: null }).offers.offerCount, undefined);
  assert.equal(build({ price: 100, currency: 'USD' }).offers['@type'], 'Offer');
  assert.equal(build({ ...project, price_on_request: true }).offers, undefined);
  assert.equal(buildPropertyQuestions({ name: 'Casa', price_on_request: true }, '')[0].answer, 'Precio a consultar');
});
test('delivery uses UTC month and contact preserves exact tracking link', () => {
  assert.equal(formatDeliveryDate('2027-03-01'), 'marzo de 2027');
  assert.equal(formatDeliveryDate('invalid'), null);
  const url = 'https://wa.me/123?text=ref%3Dtest%26utm_source%3Dqr';
  const questions = buildPropertyQuestions({ name: 'Casa', fecha_finalizacion_obra: '2027-03-01' }, url);
  assert.equal(questions.at(-1).href, url);
  assert(!JSON.stringify(questions).includes('undefined'));
});
