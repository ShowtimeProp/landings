import {
  INTERNAL_ERROR,
  PARSE_ERROR,
  type JsonRpcResponse,
  handleMessage,
  rpcError,
} from '@/lib/mcp/protocol';

/**
 * Servidor MCP público de búsqueda de propiedades (AE-011).
 * Streamable HTTP sin sesión: cada POST lleva un mensaje JSON-RPC (o un lote)
 * y la respuesta es JSON. No hay stream del servidor, así que GET da 405.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id, Last-Event-ID',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS_HEADERS },
  });
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json(rpcError(null, PARSE_ERROR, 'JSON inválido.'), 400);
  }

  const messages = Array.isArray(payload) ? payload : [payload];
  const responses: JsonRpcResponse[] = [];
  for (const message of messages) {
    try {
      const response = await handleMessage(message);
      if (response) responses.push(response);
    } catch (error) {
      console.error('MCP: error inesperado', error);
      const id = (message as { id?: string | number | null } | null)?.id ?? null;
      responses.push(rpcError(id, INTERNAL_ERROR, 'Error interno.'));
    }
  }

  // Sólo notificaciones: 202 sin cuerpo.
  if (!responses.length) return new Response(null, { status: 202, headers: CORS_HEADERS });
  return json(Array.isArray(payload) ? responses : responses[0]);
}

function methodNotAllowed(): Response {
  return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST, OPTIONS', ...CORS_HEADERS } });
}

export const GET = methodNotAllowed;
export const DELETE = methodNotAllowed;

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
