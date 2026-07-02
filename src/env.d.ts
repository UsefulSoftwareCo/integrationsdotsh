/// <reference types="astro/client" />

// Worker bindings surfaced to on-demand pages by worker/entry.ts (via the
// adapter handler's locals). Partial: prerendered pages build with no runtime.
declare namespace App {
  interface Locals {
    runtime?: {
      env: import("../worker/env.ts").Env;
      ctx: import("../worker/env.ts").ExecutionContext;
    };
  }
}
