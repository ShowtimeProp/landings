/**
 * Servidor MCP mínimo, sin estado, sobre Streamable HTTP (respuestas JSON).
 *
 * No usa el SDK oficial: arrastra express, hono y otras ~15 dependencias para
 * un servidor de tres herramientas de sólo lectura. Cubre lo que el protocolo
 * exige a un servidor así: initialize, ping, tools/list, tools/call y
 * notificaciones (202 sin cuerpo).
 */
import { BackendUnavailableError } from '@/lib/backend';
import { TOOLS, ToolInputError, toolDescriptors } from './tools';

export const SERVER_INFO = {
  name: 'showtimeprop-propiedades',
  title: 'ShowtimeProp — propiedades de inmobiliarias',
  version: '1.0.0',
};

export const SUPPORTED_PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
export const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];

export const SERVER_INSTRUCTIONS =
  'Propiedades en venta y alquiler de inmobiliarias y desarrolladoras de Mar del Plata y la zona ' +
  '(Argentina). Usá search_properties para buscar, get_property para la ficha completa con el ' +
  'contacto y list_agencies para ver qué inmobiliarias están incluidas. Los datos los publica ' +
  'cada inmobiliaria: no inventes condiciones que la ficha no diga y derivá consultas y visitas ' +
  'a su contacto.';

type JsonRpcId = string | number | null;

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
}

export type JsonRpcResponse =
  | { jsonrpc: '2.0'; id: JsonRpcId; result: unknown }
  | { jsonrpc: '2.0'; id: JsonRpcId; error: { code: number; message: string } };

export const PARSE_ERROR = -32700;
export const INVALID_REQUEST = -32600;
export const METHOD_NOT_FOUND = -32601;
export const INVALID_PARAMS = -32602;
export const INTERNAL_ERROR = -32603;

export function rpcError(id: JsonRpcId, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function isRequest(value: unknown): value is JsonRpcRequest {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return v.jsonrpc === '2.0' && typeof v.method === 'string';
}

async function callTool(params: Record<string, unknown>) {
  const name = params.name;
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) return { error: [INVALID_PARAMS, `Herramienta desconocida: ${String(name)}`] as const };
  const args = (params.arguments ?? {}) as Record<string, unknown>;
  if (typeof args !== 'object' || Array.isArray(args)) {
    return { error: [INVALID_PARAMS, '"arguments" debe ser un objeto.'] as const };
  }
  try {
    return { result: await tool.run(args) };
  } catch (error) {
    // Errores de ejecución van en el resultado, para que el modelo los vea.
    if (error instanceof ToolInputError) {
      return { result: { content: [{ type: 'text', text: error.message }], isError: true } };
    }
    if (error instanceof BackendUnavailableError) {
      return {
        result: {
          content: [{ type: 'text', text: 'El servicio de propiedades no está disponible. Probá en un minuto.' }],
          isError: true,
        },
      };
    }
    throw error;
  }
}

/** Procesa un mensaje. Devuelve null para notificaciones (no llevan respuesta). */
export async function handleMessage(message: unknown): Promise<JsonRpcResponse | null> {
  if (!isRequest(message)) {
    const id = (message as { id?: JsonRpcId } | null)?.id ?? null;
    return rpcError(id, INVALID_REQUEST, 'Mensaje JSON-RPC inválido.');
  }
  const { id, method } = message;
  if (id === undefined) return null; // notificación
  const params = message.params ?? {};

  switch (method) {
    case 'initialize': {
      const requested = typeof params.protocolVersion === 'string' ? params.protocolVersion : '';
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(requested) ? requested : LATEST_PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
          instructions: SERVER_INSTRUCTIONS,
        },
      };
    }
    case 'ping':
      return { jsonrpc: '2.0', id, result: {} };
    case 'tools/list':
      return { jsonrpc: '2.0', id, result: { tools: toolDescriptors() } };
    case 'tools/call': {
      const outcome = await callTool(params);
      if ('error' in outcome && outcome.error) return rpcError(id, outcome.error[0], outcome.error[1]);
      return { jsonrpc: '2.0', id, result: outcome.result };
    }
    default:
      return rpcError(id, METHOD_NOT_FOUND, `Método no soportado: ${method}`);
  }
}
