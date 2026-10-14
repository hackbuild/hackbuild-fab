// The COLLAR v5 layer code as shipped, run in node as the oracle for the
// M03-T04 port. It reads designs/collar/legacy/collar.html (sha256 in
// designs/collar/legacy/sha256.txt, lineage collar.bench/harvest), checks the
// hash, and evaluates script lines 605 to 1199 (LOGO_ARC to the end of
// buildFace) unchanged. The page's canvas comes from `makeCanvas`, so a test
// can hand COLLAR a recording context.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const path = root + "designs/collar/legacy/collar.html";

export interface LegacyCollar {
  readonly ST: Record<string, unknown> & {
    dia: number;
    res: number;
    nSlots: number;
    base: number;
    slots: { color: string }[];
    shape: { kind: string; aspect: number; corner: number };
    rim: { on: boolean; w: number };
    art: { boost: number; gap: number; keep: number; despeck: boolean; minF: number };
    faces: { front: unknown[]; back: unknown[] };
  };
  renderLayer(L: unknown, res: number): unknown;
  buildFace(which: "front" | "back", res: number): { art: Uint8Array; holes: Uint8Array | null };
  R_ART(): number;
  R_RIM_IN(): number;
  shapeR(theta: number): number;
  baseLUT(): Float32Array;
  readonly LOGO_ARC: string;
  readonly LOGO_WRENCH: string;
}

export function legacyHtml(): string {
  const html = readFileSync(path, "utf8");
  const want = readFileSync(root + "designs/collar/legacy/sha256.txt", "utf8").split(/\s+/)[0];
  const got = createHash("sha256").update(html).digest("hex");
  if (got !== want) throw new Error(`collar.html sha256 ${got}, legacy/sha256.txt says ${want}`);
  return html;
}

/** A canvas whose context ignores every call; enough for ring layers, which never paint. */
export function idleCanvas(): unknown {
  const ctx = new Proxy({}, { get: () => () => undefined });
  return { width: 0, height: 0, getContext: () => ctx };
}

/** A fresh COLLAR scope; `makeCanvas` stands in for document.createElement("canvas"). */
export function loadCollar(makeCanvas: () => unknown = idleCanvas): LegacyCollar {
  const lines = legacyHtml().split("\n");
  if (!lines[604]!.startsWith("const LOGO_ARC") || !lines[1199]!.startsWith("/* ----") || !lines[1125]!.startsWith("function buildFace")) {
    throw new Error("collar.html lines 605 to 1200 are not LOGO_ARC to the slab plan banner");
  }
  const body = lines.slice(604, 1199).join("\n");
  const ret = "return { ST, renderLayer, buildFace, R_ART, R_RIM_IN, shapeR, baseLUT, LOGO_ARC, LOGO_WRENCH };";
  const document = { createElement: () => makeCanvas() };
  return new Function("document", `${body}\n${ret}`)(document) as LegacyCollar;
}
