/**
 * MCP projection — the same operations (worker/operations.ts), exposed as MCP
 * tools. Schema + handler are shared with the REST API; only the transport
 * differs. Served over HTTP at /mcp (via a Durable Object for session state).
 */
import { Layer } from "effect";
import * as McpServer from "effect/unstable/ai/McpServer";
import * as Tool from "effect/unstable/ai/Tool";
import * as Toolkit from "effect/unstable/ai/Toolkit";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import {
  DETECT_DESCRIPTION,
  DetectionResult,
  DetectParams,
  DISCOVER_DESCRIPTION,
  DiscoverParams,
  DiscoverResult,
  runDetect,
  runDiscover,
} from "./operations.ts";

const Detect = Tool.make("detect", {
  description: DETECT_DESCRIPTION,
  parameters: DetectParams,
  success: DetectionResult,
})
  // detect only fetches a domain's public surface — safe to auto-run.
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, true);
// openWorldHint stays true (default): it reaches arbitrary external domains.

const Discover = Tool.make("discover", {
  description: DISCOVER_DESCRIPTION,
  parameters: DiscoverParams,
  success: DiscoverResult,
})
  // Read-only (only fetches public pages) but not idempotent: the LLM fallback
  // is non-deterministic and costs tokens, so it shouldn't be auto-replayed.
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, false);

export const toolkit = Toolkit.make(Detect, Discover);

const HandlersLayer = toolkit.toLayer({
  detect: ({ domain }: { domain: string }) => runDetect(domain),
  discover: ({ domain }: { domain: string }) => runDiscover(domain),
} as never);

const McpLayer = Layer.mergeAll(
  McpServer.layerHttp({ name: "integrations.sh", version: "0.1.0", path: "/mcp" }),
  McpServer.toolkit(toolkit),
).pipe(Layer.provide(HandlersLayer));

const mcp = HttpRouter.toWebHandler(McpLayer as never);
export const mcpHandler = mcp.handler as (req: Request) => Promise<Response>;
