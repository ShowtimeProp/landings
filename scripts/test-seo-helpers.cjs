const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(relativePath) {
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const loaded = { exports: {} };
  new Function('module', 'exports', outputText)(loaded, loaded.exports);
  return loaded.exports;
}

const { serializeJsonLd } = load('src/lib/seo/serialize-json-ld.ts');
const { cleanDescription } = load('src/lib/text.ts');
const payload = { description: '</script><script>alert(1)</script> & \u2028\u2029' };
const serialized = serializeJsonLd(payload);
assert.deepEqual(JSON.parse(serialized), payload);
assert(!/[<>&\u2028\u2029]/u.test(serialized));
for (const value of [null, undefined, '', '  ', 'Descripción', 'sin descripción', '-', '.', 'n/a']) {
  assert.equal(cleanDescription(value), null);
}
assert.equal(cleanDescription('  Primer párrafo.\n\nSegundo.\nOtra línea.  '), 'Primer párrafo.\n\nSegundo.\nOtra línea.');
console.log('SEO helpers: JSON-LD round-trip seguro y limpieza de descripciones OK.');
