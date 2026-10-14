// CHK-ART-07, no placeholder URL in card or metadata text: no example.com,
// example.org, localhost, or a bare home page where a design page is
// declared (COTTER 2026-09: the BOM warned on a waiver card still pointing
// at the home page; sources/latest/cotter-sparger.md line 267).
//
// Scans every text entry of the package that a person or a slicer reads:
// the 3MF model metadata (title, description), Metadata/*.json and
// Metadata/*.config, and any .txt or .md card, and lists each offending
// URL with its entry. The home-page clause applies where an artifact
// declares a design page; no exporter declares one before the print card
// of M09, so the clause has no input yet and extra says so.

import type { Finding, TargetOf } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { entriesOf } from "../../skeleton/threemf.js";
import { boolFinding } from "../common.js";

const TEXT_ENTRY = /^(3D\/[^/]+\.model|Metadata\/[^/]+\.(json|config|xml)|[^/]+\.(txt|md)|Metadata\/[^/]+\.(txt|md))$/i;
const PLACEHOLDER = /\b(?:https?:\/\/)?(?:[a-z0-9-]+\.)*(?:example\.(?:com|org|net)|localhost)(?::\d+)?(?:\/[^\s"'<>]*)?/gi;

// Kernels compile without DOM or node types; TextDecoder is a runtime global in both.
declare const TextDecoder: new (label: string) => { decode(input: Uint8Array): string };

export async function runArt07(t: TargetOf<"artifact">): Promise<readonly Finding[]> {
  const entries = await entriesOf(t.artifact);
  const hits: string[] = [];
  let scanned = 0;
  for (const [name, bytes] of [...entries].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    if (!TEXT_ENTRY.test(name)) continue;
    scanned += 1;
    for (const m of new TextDecoder("utf-8").decode(bytes).matchAll(PLACEHOLDER)) hits.push(`${name}: ${m[0]}`);
  }
  const at = { level: "artifact" as const, artifact: t.artifact.name, ...(hits[0] === undefined ? {} : { path: hits[0].split(": ")[0]! }) };
  return [boolFinding(at, hits.length === 0,
    hits.length === 0
      ? `no placeholder url in ${scanned} text entries`
      : `${hits.length} placeholder urls in the package text, first ${hits[0]}; point each at the design page or drop it`,
    { scanned, placeholders: hits.length, designPage: "none declared", ...(hits.length === 0 ? {} : { first: hits.slice(0, 5).join("; ") }) })];
}

export const check = defineCheck({
  id: "CHK-ART-07",
  level: "artifact",
  run: (t) => runArt07(t),
});
