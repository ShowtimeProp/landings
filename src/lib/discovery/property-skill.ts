import { LANDINGS_URL } from '@/lib/markdown/format';
import { MCP_URL, MCP_CARD_URL, OPENAPI_URL, PUBLIC_PROPERTIES_API } from './catalog';

export const skillName = 'buscar-propiedades';
export const skillDescription = 'Buscar propiedades publicadas en ShowtimeProp, leer sus fichas y obtener el contacto de la inmobiliaria. / Search ShowtimeProp listings, read property details and find agency contact information.';
export const skillUrl = LANDINGS_URL + '/.well-known/agent-skills/' + skillName + '/SKILL.md';

export const propertySkill = `---
name: buscar-propiedades
description: ${skillDescription}
---

# Buscar propiedades / Search properties

## Español

Buscá propiedades según la operación, ubicación y criterios que indique la persona.
La búsqueda sólo incluye inmobiliarias que activaron la indexación; una búsqueda vacía
no representa todo el mercado. Usá los datos publicados y citá el enlace canónico de cada ficha.

### Buscar con MCP

Conectá un cliente MCP a [ShowtimeProp MCP](${MCP_URL}) mediante Streamable HTTP sin autenticación.
Consultá la [server card](${MCP_CARD_URL}) y luego initialize y tools/list.
El transporte acepta JSON-RPC por POST; GET /mcp responde 405 porque no hay stream del servidor.

- list_agencies permite descubrir las inmobiliarias incluidas.
- search_properties admite q, operation (sale, rent, rent_short_term), property_type,
  city, agency (slug de inmobiliaria), currency, min_price, max_price, min_area,
  min_bedrooms, min_ambientes y apto_credito. Indicá currency al filtrar por precio.
  Paginá con limit (hasta 20) y offset usando el total devuelto.
- get_property recibe url del resultado, o agency y slug, y devuelve la ficha con contacto.

### Buscar con la API HTTP

Si no disponés de MCP, hacé GET a [búsqueda pública](${PUBLIC_PROPERTIES_API}/search).
Usá los parámetros y límites del [OpenAPI público](${OPENAPI_URL}); en la API el filtro de
inmobiliaria se llama tenant_slug (en MCP, agency). La respuesta contiene total, offset,
limit e items, con url y markdown_url por resultado. No requiere credenciales.

### Leer y contactar

Leé markdown_url del resultado para ver la ficha completa. Si ya tenés una URL canónica
de ficha o portfolio, agregá .md al path, sin ref ni UTM, o pedí Accept: text/markdown.
El [índice llms.txt](${LANDINGS_URL}/llms.txt) enlaza los portfolios disponibles para búsqueda.
Usá únicamente el WhatsApp, teléfono o email publicado en la ficha para ofrecer el contacto
de la inmobiliaria. Enviá un mensaje sólo cuando la persona lo solicite explícitamente.
Si falta un dato, omitilo o indicá que no está publicado; no supongas precio, moneda,
disponibilidad, amenities ni fechas. Ante 429 o 5xx, informá indisponibilidad temporal y
respetá Retry-After cuando esté presente; no lo presentes como una propiedad inexistente.

## English

Search using the person's location, transaction type and property requirements. Results
cover only agencies that opted into indexing, not the entire market. Cite each listing's
canonical URL and use its published details.

### Search with MCP or HTTP

Use a Streamable HTTP MCP client with [the MCP endpoint](${MCP_URL}) and
[server card](${MCP_CARD_URL}). No authentication is required. Initialize the client and
request tools/list; send JSON-RPC via POST. GET /mcp returns 405 because no server stream is offered.
Use list_agencies, search_properties and get_property. Search filters include operation
(sale, rent, rent_short_term), property_type, city, agency, q, currency, min_price,
max_price, min_area, min_bedrooms, min_ambientes and apto_credito. Set currency when
filtering prices. Paginate with limit (up to 20) and offset according to the returned total.
Pass a result's url to get_property, or provide agency and slug.

Without MCP, GET [the public search API](${PUBLIC_PROPERTIES_API}/search) using the
[OpenAPI parameter definitions](${OPENAPI_URL}). The HTTP agency filter is tenant_slug.
Responses contain total, offset, limit and items, including url and markdown_url.

### Read details and contact an agency

Fetch markdown_url, append .md to a canonical listing or portfolio path without ref/UTM,
or request Accept: text/markdown. [llms.txt](${LANDINGS_URL}/llms.txt) lists searchable portfolios.
Offer only the WhatsApp, phone or email published in that listing. Send a message only
when the person explicitly asks. Omit missing facts or state that they are unpublished;
never infer prices, currency, availability, amenities or dates. Treat 429 and 5xx as
temporary failures, respect Retry-After when supplied, and do not report a missing listing.
`;
