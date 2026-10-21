// What a Playwright run needs to open a legacy page through its adapter:
// legacy-adapters.ts bundled into one in-page script (the adapters run
// inside the page, never in node), and the requests an adapter declares
// (OfflineDecl) answered locally. conformance.spec.ts and
// tools/gold/side-by-side.mjs share this one copy.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { BrowserContext } from "@playwright/test";
import type { LegacyAdapter } from "./legacy-adapters.ts";
import { readStored } from "../legacy/stored-zip.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");

let adapterBundle: string | null = null;

/** legacy-adapters.ts as an iife that sets globalThis.__HBF_ADAPTERS; built once per process. */
export async function bundleAdapters(): Promise<string> {
  if (adapterBundle) return adapterBundle;
  const { build } = await import("esbuild-wasm");
  const out = await build({
    stdin: {
      contents: `import { ADAPTERS } from "./legacy-adapters.ts"; globalThis.__HBF_ADAPTERS = ADAPTERS;`,
      resolveDir: HERE,
      sourcefile: "hook-adapters.entry.ts",
      loader: "ts",
    },
    resolveExtensions: [".ts", ".js", ".mjs", ".json"],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2022",
    write: false,
    logLevel: "warning",
  });
  adapterBundle = out.outputFiles[0]?.text ?? "";
  if (!adapterBundle) throw new Error("adapter bundle is empty");
  return adapterBundle;
}

const MIME: Readonly<Record<string, string>> = { ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json" };

/** Answers the requests an adapter declares (OfflineDecl): served prefixes from the repo copy, empty prefixes with no body. */
export async function routeDeclared(context: BrowserContext, a: LegacyAdapter | null): Promise<string[]> {
  const prefixes: string[] = [];
  for (const [prefix, where] of Object.entries(a?.offline?.serve ?? {})) {
    prefixes.push(prefix);
    // `<zip>!<member prefix>` serves stored zip members, anything else a repo directory.
    const [zip, inZip] = where.includes("!") ? where.split("!") : [null, null];
    const members = zip ? readStored(readFileSync(path.join(ROOT, zip))) : null;
    await context.route(`${prefix}**`, (route) => {
      const rel = route.request().url().slice(prefix.length).split(/[?#]/)[0] ?? "";
      const body = members ? members.get(`${inZip ?? ""}${rel}`) : readFileSync(path.join(ROOT, where, rel));
      if (!body) {
        route.abort().catch(() => undefined);
        return;
      }
      route.fulfill({ status: 200, contentType: MIME[path.extname(rel)] ?? "application/octet-stream", body: Buffer.from(body) })
        .catch(() => route.abort());
    });
  }
  for (const prefix of a?.offline?.empty ?? []) {
    prefixes.push(prefix);
    await context.route(`${prefix}**`, (route) => route.fulfill({ status: 200, contentType: "text/css", body: "" }));
  }
  return prefixes;
}
