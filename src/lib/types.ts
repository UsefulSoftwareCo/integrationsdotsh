export type Kind = "mcp" | "openapi" | "graphql" | "cli";

/** Display formats. Superset of Kind: curated providers can also expose CLIs. */
export type Format = "mcp" | "openapi" | "graphql" | "cli";

export type AuthKind = "oauth" | "api_key" | "token" | "none" | "mixed";

export interface AuthMethod {
  type: "oauth2" | "api_key" | "pat" | "token" | "none";
  label: string;
  note?: string;
}

export interface ProviderInterface {
  format: Format;
  name: string;
  /** Who maintains this interface: the vendor itself, or the community. */
  origin: "vendor" | "community";
  /** For community interfaces: who maintains it, e.g. "steipete/gog". */
  maintainer?: string;
  /** For community interfaces: source repository. */
  repo?: string;
  /** MCP remote URL, REST base URL, or GraphQL endpoint. */
  endpoint?: string;
  /** OpenAPI spec URL, when format is "openapi". */
  specUrl?: string;
  auth: AuthKind;
  /** Literal auth header template, e.g. "Authorization: Bearer {token}". */
  authHeader?: string;
  /** Install / run command for CLIs and stdio MCP servers. */
  install?: string;
  docs?: string;
  note?: string;
}

/** A curated provider: one company/service grouping every agent-callable interface it exposes. */
export interface Provider {
  slug: string;
  name: string;
  tagline: string;
  /** Markdown. */
  description: string;
  domain: string;
  icon?: string;
  categories: string[];
  auth: {
    methods: AuthMethod[];
    /** Markdown auth guide, AI-generated and grounded in `sources`. */
    guide: string;
    sources: { title: string; url: string }[];
    generatedAt: string;
    verified?: boolean;
  };
  interfaces: ProviderInterface[];
  links: { homepage?: string; docs?: string };
  /** ids of matching records in the raw catalog, e.g. "mcp/todoist". */
  related?: string[];
}

export type Feed = "claude" | "openai" | "apis-guru" | "graphql-apis" | "override" | "cli-seed";

export interface Integration {
  id: string;
  kind: Kind;
  slug: string;
  name: string;
  description: string;
  url?: string;
  icon?: string;
  categories: string[];
  feeds: Feed[];
  popularity?: number;
  mcp?: {
    remoteUrl?: string;
    transport?: string;
    isAuthless?: boolean;
    toolNames?: string[];
    authTypes?: string[];
    worksWith?: string[];
  };
  openapi?: {
    provider: string;
    service?: string;
    version: string;
    /** The provider's own canonical spec URL (apis.guru `origin`), not the mirror. */
    specUrl?: string;
    openapiVer: string;
    updated?: string;
    added?: string;
  };
  graphql?: {
    endpoint: string;
    hasSecurity: boolean;
    docs: { description?: string; url: string }[];
  };
  cli?: {
    /** Install / run command, e.g. "brew install gh && gh auth login". */
    install: string;
    /** The registrable domain this CLI is grouped under. */
    domain: string;
    docs?: string;
    repo?: string;
  };
  raw: Partial<Record<Feed, unknown>>;
  tools?: ExtractedTool[];
  toolsStatus?: "ok" | "error" | "skipped";
  toolsReason?: string;
}

export interface ExtractedTool {
  id: string;
  name: string;
  description?: string;
  inputSchema?: unknown;
}
