/**
 * Durable Object that hosts the MCP server.
 *
 * Effect's McpServer keeps client sessions in an in-memory Map (created on
 * `initialize`, required by `tools/call`). Plain Workers are stateless across
 * requests, so the session is lost between calls. A Durable Object is a single
 * persistent instance — routing all /mcp traffic to one DO keeps the session
 * map alive across requests, which is how MCP-over-HTTP works on Cloudflare.
 */
import { mcpHandler } from "./registry.ts";

export class McpDurableObject {
  constructor(_state: unknown, _env: unknown) {}

  fetch(request: Request): Promise<Response> {
    return mcpHandler(request);
  }
}
