import { LANDINGS_URL } from '@/lib/markdown/format';

// El catálogo describe la API pública, nunca la URL interna usada por SSR.
export const PUBLIC_PROPERTIES_API = 'https://agent.showtimeprop.com/api/properties/public';
export const CATALOG_URL = LANDINGS_URL + '/.well-known/api-catalog';
export const OPENAPI_URL = LANDINGS_URL + '/.well-known/openapi/properties.json';
export const MCP_URL = LANDINGS_URL + '/mcp';
export const MCP_CARD_URL = LANDINGS_URL + '/.well-known/mcp/server-card.json';
export const discoveryHeaders = {
  'Cache-Control': 'public, max-age=0, s-maxage=3600',
  'Access-Control-Allow-Origin': '*',
};

export const catalog = {
  linkset: [
    { anchor: CATALOG_URL, item: [{ href: PUBLIC_PROPERTIES_API + '/search' }, { href: MCP_URL }] },
    { anchor: PUBLIC_PROPERTIES_API + '/search', 'service-desc': [{ href: OPENAPI_URL, type: 'application/json' }] },
    { anchor: MCP_URL, 'service-doc': [{ href: MCP_CARD_URL, type: 'application/json' }] },
  ],
};

export const catalogHeaders = {
  ...discoveryHeaders,
  'Content-Type': 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
  Link: [
    '<' + CATALOG_URL + '>; rel="api-catalog"',
    '<' + PUBLIC_PROPERTIES_API + '/search>; rel="item"; anchor="' + CATALOG_URL + '"',
    '<' + MCP_URL + '>; rel="item"; anchor="' + CATALOG_URL + '"',
    '<' + OPENAPI_URL + '>; rel="service-desc"; type="application/json"; anchor="' + PUBLIC_PROPERTIES_API + '/search"',
    '<' + MCP_CARD_URL + '>; rel="service-doc"; type="application/json"; anchor="' + MCP_URL + '"',
  ].join(', '),
};
