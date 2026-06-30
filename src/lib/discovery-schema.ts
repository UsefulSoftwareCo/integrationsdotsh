/**
 * The integrations.sh discovery data model (v2) as an Effect Schema — the
 * canonical, field-level definition of what the discovery agent produces, and
 * the same Schema library the worker already projects to REST + MCP + /openapi.json.
 * See docs/discovery-model.md for the prose rationale.
 *
 * Field docs live in `.annotate({ description })` (not comments) so they're
 * introspectable — they flow into the generated OpenAPI and any tooling that
 * reads the AST.
 *
 * Built from four discriminated unions (Schema.Union of Structs with a Literal
 * tag — Effect uses the tag as the discriminant):
 *   - Basis       (by `via`)    — how we learned a thing exists
 *   - Mechanics   (by `source`) — where ONE credential's binding resolves from
 *   - AuthStatus  (by `status`) — none | required | unknown, per surface
 *   - Surface     (by `type`)   — the kind of integration surface
 * `Credential` is a plain Struct whose `type` is a `Literals` enum (not a tagged
 * union) — the auth-mode vocabulary, derived from Nango (`bearer` is our own
 * addition; Nango's `NONE` lives in AuthStatus, not here).
 */
import { Schema } from "effect";

// ── Basis — how we learned a thing exists (trust/verifiability axis) ──────
export const Basis = Schema.Union([
  Schema.Struct({
    via: Schema.Literal("detected"),
    signal: Schema.String.annotate({ description: "A re-verifiable machine signal the service publishes (e.g. '.well-known/api-catalog', 'oauth-protected-resource', 'openapi:securitySchemes')." }),
  }),
  Schema.Struct({
    via: Schema.Literal("discovered"),
    evidence: Schema.Array(Schema.String).annotate({ description: "Doc URLs the agent read to confirm this. Point-in-time, prose-derived." }),
  }),
]).annotate({ description: "How we learned a thing exists. `detected` = asserted by a machine signal (high trust, re-verifiable); `discovered` = the agent read it from docs." });

// ── Mechanics — how a credential binds to a surface (where it resolves from) ───
export const Mechanics = Schema.Union([
  Schema.Struct({
    source: Schema.Literal("spec"),
    scheme: Schema.String.annotate({ description: "The OpenAPI securityScheme NAME this one credential satisfies (the AND of multiple is carried by AuthEntry.use, not here)." }),
  }),
  Schema.Struct({
    source: Schema.Literal("well-known"),
  }).annotate({ description: "Derives from the surface `url` via RFC 9728/8414 (MCP OAuth). Nothing to store — re-resolvable." }),
  Schema.Struct({
    source: Schema.Literal("metadata"),
    url: Schema.String.annotate({ description: "The non-standard location of the well-known metadata (an override)." }),
  }),
  Schema.Struct({
    source: Schema.Literal("inline"),
    in: Schema.optional(Schema.Literals(["header", "query", "body", "path"]).annotate({ description: "HTTP: where the credential rides." })),
    headerName: Schema.optional(Schema.String.annotate({ description: "HTTP header name, e.g. 'Authorization'." })),
    scheme: Schema.optional(Schema.String.annotate({ description: "HTTP auth scheme prefix, e.g. 'Bearer'." })),
    paramName: Schema.optional(Schema.String.annotate({ description: "Query/body parameter name." })),
    command: Schema.optional(Schema.String.annotate({ description: "CLI: a command to run, e.g. 'wrangler login'." })),
    env: Schema.optional(Schema.Array(Schema.String).annotate({ description: "CLI: env var(s) to set, e.g. ['CLOUDFLARE_API_TOKEN']." })),
  }).annotate({ description: "Agent-read from docs. HTTP keys: in/headerName/scheme/paramName. CLI keys: command/env." }),
  Schema.Struct({
    source: Schema.Literal("unknown"),
  }).annotate({ description: "Confirmed to exist, but the binding mechanics weren't captured." }),
]).annotate({ description: "How a credential binds to a surface. `source` also signals knowledge state: spec/well-known/metadata/inline = known; unknown = unresolved." });

// ── Credential — what it is + where you get it (defined once, by id) ───────────

/** Auth-mode vocabulary, derived from Nango (not an exact mirror): `bearer` is
 * our refinement; Nango's `NONE` is modeled by AuthStatus, not as a credential.
 * Exotic types (app/two_step/signature/aws_sigv4) are NAMED but not executed —
 * the flow lives in `setup`; mechanics stays inline/unknown. */
export const CredentialType = Schema.Literals([
  "api_key",
  "basic",
  "bearer",
  "oauth2",
  "oauth2_cc", // OAuth client-credentials
  "oauth1",
  "jwt", // signed-JWT bearer (RFC 7523)
  "app", // GitHub-App style (compound + JWT->token exchange)
  "two_step", // token exchange (STS, etc.)
  "signature", // request signing (generic)
  "aws_sigv4", // AWS SigV4
  "tba", // token-based auth (Netsuite-style)
  "compound", // a named bundle of sub-secrets
  "custom",
]).annotate({ description: "The credential strategy (Nango-derived). Exotic modes are named but executed lazily (the flow is in `setup`)." });

export const Credential = Schema.Struct({
  type: CredentialType,
  label: Schema.String.annotate({ description: "Human label, e.g. 'Cloudflare API token'." }),
  generateUrl: Schema.optional(Schema.String.annotate({ description: "Where the user mints/registers the credential." })),
  setup: Schema.String.annotate({ description: "Markdown: the human acquisition guide — where to go, what to click, gotchas." }),
  acquisition: Schema.optional(Schema.Literals(["manual", "ambient"]).annotate({ description: "manual (default) | ambient (env-injected, e.g. CI tokens — no acquisition step)." })),
  fields: Schema.optional(
    Schema.Record(
      Schema.String,
      Schema.Struct({ secret: Schema.optional(Schema.Boolean), description: Schema.optional(Schema.String) }),
    ).annotate({ description: "Named sub-secrets for ANY inherently multi-part credential (compound, app/GitHub-App's appId+privateKey+clientId+clientSecret, a basic email+token pair). Absent when the credential is a single secret." }),
  ),
}).annotate({ description: "A credential the service issues — what it is and where you get it. Defined ONCE in the registry; referenced by surface auth via id." });

// ── Auth — one binding of one credential; entries (OR) of uses (AND) ───────────

/** One credential bound to a surface, with ITS OWN mechanics. Lives in an
 * AuthEntry's `use[]`; multiple uses in an entry are AND'd, each placed
 * independently (e.g. app-id in one header, api-key in another). */
export const CredentialUse = Schema.Struct({
  id: Schema.String.annotate({ description: "References `credentials[id]`." }),
  mechanics: Mechanics,
}).annotate({ description: "One credential and how THIS credential is bound on this surface." });

export const AuthEntry = Schema.Struct({
  use: Schema.Array(CredentialUse).annotate({ description: "Credentials sent TOGETHER (AND) for this one way in — each with its own placement." }),
  basis: Basis,
}).annotate({ description: "One way to authenticate to a surface. Sibling entries are OR alternatives (any one works)." });

/** Whether a surface needs auth — and the difference between confirmed-public
 * and not-yet-figured-out, which `auth: []` couldn't express. */
export const AuthStatus = Schema.Union([
  Schema.Struct({
    status: Schema.Literal("none"),
    basis: Basis,
  }).annotate({ description: "Confirmed public — no credential needed. `basis.via:detected` (a probe got a clean unauthenticated response) outranks `discovered` (the docs said so)." }),
  Schema.Struct({
    status: Schema.Literal("required"),
    entries: Schema.Array(AuthEntry).annotate({ description: "OR alternatives — at least one is needed." }),
  }),
  Schema.Struct({
    status: Schema.Literal("unknown"),
  }).annotate({ description: "Auth not yet determined (NOT the same as public)." }),
]).annotate({ description: "A surface's auth requirement: none | required | unknown." });

// ── Surface — one integration surface (discriminated on `type`) ────────────────

const RequiredHeader = Schema.Struct({
  name: Schema.String,
  // Exactly one source — a literal value or an env var, never both/neither.
  source: Schema.Union([
    Schema.Struct({ kind: Schema.Literal("static"), value: Schema.String }),
    Schema.Struct({ kind: Schema.Literal("env"), envVar: Schema.String }),
  ]),
  description: Schema.optional(Schema.String),
}).annotate({ description: "A mandatory non-auth header (e.g. a version pin like anthropic-version)." });

const Variable = Schema.Struct({
  name: Schema.String.annotate({ description: "A token substituted wherever `{name}` appears in the surface url (e.g. {project_ref} → {project_ref}.supabase.co)." }),
  in: Schema.optional(Schema.Literals(["url", "header", "query"]).annotate({ description: "Default 'url' (templated into the url, incl. hostname). Set only when it goes elsewhere." })),
  resolveFrom: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
}).annotate({ description: "An instance/region identifier needed to build the request (project_ref, cloudId)." });

/** Fields shared across every surface kind. */
const surfaceBase = {
  name: Schema.String,
  docs: Schema.optional(Schema.String.annotate({ description: "Human docs URL." })),
  basis: Basis,
  auth: AuthStatus,
  requiredHeaders: Schema.optional(Schema.Array(RequiredHeader)),
  variables: Schema.optional(Schema.Array(Variable)),
  notes: Schema.optional(Schema.String),
};

export const Surface = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("openapi"),
    spec: Schema.optional(Schema.String.annotate({ description: "OpenAPI doc URL — a POINTER, never inlined ('none' if the spec is absent)." })),
    url: Schema.optional(Schema.String.annotate({ description: "Only if not derivable from the spec's `servers`." })),
    patch: Schema.optional(Schema.Unknown.annotate({ description: "securityScheme overrides for when the spec is wrong or missing a scheme." })),
    ...surfaceBase,
  }),
  Schema.Struct({
    type: Schema.Literal("rest"),
    url: Schema.optional(Schema.String.annotate({ description: "Base URL (no OpenAPI doc → mechanics are inline)." })),
    spec: Schema.optional(Schema.String),
    patch: Schema.optional(Schema.Unknown),
    ...surfaceBase,
  }),
  Schema.Struct({
    type: Schema.Literal("graphql"),
    url: Schema.optional(Schema.String.annotate({ description: "Expected — a GraphQL schema has no endpoint, so this is how you reach it." })),
    spec: Schema.optional(Schema.String.annotate({ description: "'introspection' or an SDL URL." })),
    ...surfaceBase,
  }),
  Schema.Struct({
    type: Schema.Literal("mcp"),
    url: Schema.optional(Schema.String.annotate({ description: "The MCP connect endpoint (NOT a docs page)." })),
    transports: Schema.optional(Schema.Array(Schema.String).annotate({ description: "streamable-http | sse (server.json `remotes[].type`)." })),
    ...surfaceBase,
  }),
  Schema.Struct({
    type: Schema.Literal("cli"),
    packages: Schema.optional(
      Schema.Array(
        Schema.Struct({
          registryType: Schema.String.annotate({ description: "npm | pypi | oci | brew | …" }),
          identifier: Schema.String,
          runtimeHint: Schema.optional(Schema.String.annotate({ description: "npx | uvx | …" })),
        }),
      ).annotate({ description: "Install options (server.json `packages` shape)." }),
    ),
    command: Schema.optional(Schema.String.annotate({ description: "The command name, e.g. 'wrangler'." })),
    ...surfaceBase,
  }),
]).annotate({ description: "One integration surface. Per-`type` fields: openapi/rest carry spec/url/patch; graphql carries url+spec; mcp carries url+transports; cli carries packages+command." });

// ── Top-level result ───────────────────────────────────────────────────────────
export const DiscoveryResult = Schema.Struct({
  domain: Schema.String,
  summary: Schema.String.annotate({ description: "One-line overview of the service's integration surface." }),
  discoveredAt: Schema.optional(Schema.String.annotate({ description: "ISO timestamp this result was produced — for staleness of `detected` facts." })),
  credentials: Schema.Record(Schema.String, Credential).annotate({ description: "Global credential registry, keyed by id — defined once, referenced by surface auth." }),
  surfaces: Schema.Array(Surface).annotate({ description: "Typed surface inventory (openapi/rest/graphql/mcp/cli)." }),
}).annotate({ description: "The integrations.sh discovery result (v2): a global credential registry + a typed list of surfaces." });

// ── Inferred types (single source of truth — replace the hand-written interfaces) ──
export type Basis = typeof Basis.Type;
export type Mechanics = typeof Mechanics.Type;
export type Credential = typeof Credential.Type;
export type CredentialUse = typeof CredentialUse.Type;
export type AuthEntry = typeof AuthEntry.Type;
export type AuthStatus = typeof AuthStatus.Type;
export type Surface = typeof Surface.Type;
export type DiscoveryResult = typeof DiscoveryResult.Type;
