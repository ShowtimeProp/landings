import { LANDINGS_URL } from '@/lib/markdown/format';
import { LATEST_PROTOCOL_VERSION, SERVER_INFO, SERVER_INSTRUCTIONS } from './protocol';
import { toolDescriptors } from './tools';

export function serverCardResponse(): Response {
  const card = {
    serverInfo: SERVER_INFO,
    description: SERVER_INSTRUCTIONS,
    protocolVersion: LATEST_PROTOCOL_VERSION,
    transport: { type: 'streamable-http', endpoint: `${LANDINGS_URL}/mcp` },
    capabilities: { tools: { listChanged: false } },
    authentication: { required: false, schemes: [] },
    tools: toolDescriptors().map(({ name, title, description }) => ({ name, title, description })),
    documentationUrl: `${LANDINGS_URL}/index.md`,
  };
  return new Response(JSON.stringify(card, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
