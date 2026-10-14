// The surface build path (D-126: the chase kind selects the build path;
// M05-T14 and M05-T15 card defects). A cut-sheet reference holds
// chase.surface.ts with meta.kind "surface". Its build.ts runs in the D-178
// sandbox like any other and returns plain data: a vinyl board ({ draft:
// VinylDraft, ... }) or a ladder declaration (LadderDecl, a shipped cut
// file to read). Core evaluates that data in process on packages/copper and
// gates it with packages/checks (runVinyl), so no vinyl geometry goes
// through part.build.
//
// The file keeps its own name: part.build, the metric record, the project
// graph, cold rebuild and the determinism hashes enumerate every
// reference/<area>/<id>/chase.ts as a part.build reference, and a surface
// chase is not one.
//
// Surface parity goldens (this file is their one shape; the reference
// tests pin the same objects):
// - vinyl: expected/gates.json (every gate at the chase defaults, id, ok,
//   line and extra), expected/layers.json (each layer document's role,
//   sha256 and size) and expected/stack.json (the D-063 declaration);
// - ladder: expected/ladder.json (audit, weed proof and the margin probe).
// Parity passes when each golden is equal and the board passes: every gate
// for a vinyl board, the weed proof for a ladder. They are written with
// HBF_ACCEPT_VINYL=1 npx vitest run <reference>, beside the stats golden
// that needs the shipped oracle, never by hbf parity --accept.

import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { brotliDecompressSync } from "node:zlib";
import type { Chase, ProfileLookup } from "@hackbuild/spec";
import { sha256Hex } from "@hackbuild/spec";
import { readChaseSource } from "@hackbuild/chase";
import { loadGeom, sanitiseSvgDocument, type Geom, type Section } from "@hackbuild/geom";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { Vinyl, documentPaths, ladderAudit, parseWoff2, pathGeom, weedProof, type LadderDecl, type VinylDraft, type VinylInputs } from "@hackbuild/copper";
import { runVinyl, type VinylRun } from "@hackbuild/checks";
import { cmdError } from "../errors.js";
import { hashOf } from "../jcs.js";
import { runSandboxed } from "../sandbox.js";
import { loadWorkspace, resolveParams, workspaceRoot, type Values } from "./build.js";

/** The chase file of a surface reference. */
export const SURFACE_CHASE = "chase.surface.ts";

/** The family's shipped inputs: the three Plex Mono woff2 weights and the owner's mark (M05-T14). */
export const VINYL_INPUTS = "reference/copper/_inputs";

/** Ladder audit tolerances, M05-T14's choice: a run is an edge of 0.5 mm or more (pill ends are sampled at about 0.08), 0.5 deg, 0.01 mm. */
export const LADDER_AUDIT = { minRun: 0.5, angleTol: 0.5, tol: 0.01 } as const;
/** The margin probe M05-T14 records past the weed proof erodes half the trace width (M05 card: 0.80 is half the trace width). */
export const LADDER_PROBE_FRACTION = 0.5;
/** The margin probe erosion for a trace width, mm. */
export const ladderProbe = (width: number): number => width * LADDER_PROBE_FRACTION;

export const VINYL_GOLDENS = ["gates.json", "layers.json", "stack.json"] as const;
export const LADDER_GOLDENS = ["ladder.json"] as const;

/** The directory holds a surface chase and no chase.ts. */
export function isSurfaceDir(dir: string): boolean {
  return existsSync(path.join(dir, SURFACE_CHASE)) && !existsSync(path.join(dir, "chase.ts"));
}

/** A surface chase read as data (D-178); E_SCHEMA when its kind is not surface. */
export function surfaceChase(dir: string, root: string): Chase {
  const file = path.join(dir, SURFACE_CHASE);
  const rel = path.relative(root, file).split(path.sep).join("/");
  const { chase } = readChaseSource(readFileSync(file, "utf8"), rel);
  if (chase.meta.kind !== "surface") {
    throw cmdError({ code: "E_SCHEMA", path: "/meta/kind", got: chase.meta.kind, expected: "surface", hint: `${SURFACE_CHASE} holds a surface chase; name any other kind chase.ts` });
  }
  return chase as Chase;
}

const inside = (dir: string, p: string): boolean => {
  const r = path.relative(realpathSync(dir), realpathSync(p));
  return r !== "" && !r.startsWith("..") && !path.isAbsolute(r);
};

/** A file the surface names, inside its directory; E_REF otherwise. */
function ownFile(dir: string, rel: string, at: string): string {
  const f = path.resolve(dir, rel);
  if (!existsSync(f) || !statSync(f).isFile() || !inside(dir, f)) {
    throw cmdError({ code: "E_REF", path: at, got: rel, expected: "a file inside the reference directory", hint: "name a file beside chase.surface.ts" });
  }
  return f;
}

export function loadVinylInputs(root: string): VinylInputs {
  const at = (f: string): string => path.join(root, VINYL_INPUTS, f);
  const font = (w: string) => parseWoff2(new Uint8Array(readFileSync(at(`ibm-plex-mono-latin-${w}-normal.woff2`))), (b) => new Uint8Array(brotliDecompressSync(b)));
  return {
    fonts: { "400": font("400"), "600": font("600"), "700": font("700") },
    logo: sanitiseSvgDocument(readFileSync(at("hackbuild-logo.svg"), "utf8")),
  };
}

/** The vinyl goldens of one run. */
export function vinylGoldens(r: VinylRun): Record<(typeof VINYL_GOLDENS)[number], unknown> {
  return {
    "gates.json": r.gates.map((x) => ({ id: x.id, ok: x.ok, line: x.line, ...(x.finding.extra === undefined ? {} : { extra: x.finding.extra }) })),
    "layers.json": Object.fromEntries(r.layers.map((l) => [l.file, { role: l.role, sha256: sha256Hex(l.svg), size: l.size }])),
    "stack.json": r.stack,
  };
}

/** A ladder board's nets read from its shipped cut file through the D-166 sanitiser, in the declared order. */
export function ladderNets(g: Geom, decl: LadderDecl, svg: string): [string, Section][] {
  const v = new Vinyl(g);
  const ds = documentPaths(sanitiseSvgDocument(svg));
  if (ds.length !== decl.nets.length) {
    throw cmdError({ code: "E_SCHEMA", path: "/nets", got: decl.nets.length, expected: `${ds.length} names, one per path of ${decl.source}`, hint: "name every path of the cut file in its order" });
  }
  return ds.map((d, i) => [decl.nets[i]!, pathGeom(v, d)]);
}

/** The ladder golden: the audit, the weed proof at the profile erosion and the margin probe. */
export function ladderGolden(g: Geom, decl: LadderDecl, nets: readonly (readonly [string, Section])[], profile: ProfileLookup): { readonly golden: unknown; readonly weedOk: boolean } {
  const v = new Vinyl(g);
  const a = ladderAudit(nets, { pitch: decl.pitch, width: decl.width, ...LADDER_AUDIT });
  const weed = weedProof(v, nets, profile.constant("vinyl.weedErode").value);
  const probe = ladderProbe(decl.width);
  return {
    weedOk: weed.ok,
    golden: {
      note: "computed by packages/copper on the sanitised shipped SVG; audit tolerances are M05-T14's choice",
      audit: LADDER_AUDIT, pitch: decl.pitch, width: decl.width,
      gap: Number(a.gap.toFixed(6)), pair: a.pair, ties: a.ties, rows: a.rows,
      weed: weed.nets,
      probe: { erode: probe, nets: weedProof(v, nets, probe).nets },
    },
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** The build result is a vinyl board or a ladder declaration; E_SCHEMA otherwise. */
function surfaceKind(result: unknown): { readonly kind: "vinyl"; readonly draft: VinylDraft } | { readonly kind: "ladder"; readonly decl: LadderDecl } {
  if (isRecord(result) && isRecord(result["draft"]) && Array.isArray(result["draft"]["nets"])) return { kind: "vinyl", draft: result["draft"] as unknown as VinylDraft };
  if (isRecord(result) && typeof result["source"] === "string" && Array.isArray(result["nets"])) return { kind: "ladder", decl: result as unknown as LadderDecl };
  throw cmdError({ code: "E_SCHEMA", path: "/build", got: isRecord(result) ? Object.keys(result).join(",") : typeof result, expected: "{ draft: VinylDraft } or a LadderDecl { source, nets, pitch, width }", hint: "a surface build.ts returns a vinyl board or a ladder declaration" });
}

export interface SurfaceParity {
  readonly reference: string;
  readonly kind: "vinyl" | "ladder";
  /** hashOf the build result, the declaration the board is evaluated from. */
  readonly draftHash: string;
  /** Vinyl: gates passed and failed. Ladder: nets whole and split after the weed erosion. */
  readonly passed: number;
  readonly failed: number;
  readonly fresh: Readonly<Record<string, unknown>>;
}

/** Build a surface reference at its defaults in the sandbox and evaluate it in process. */
export async function buildSurface(dir: string): Promise<SurfaceParity> {
  const root = workspaceRoot(dir);
  const ws = await loadWorkspace(root);
  const chase = surfaceChase(dir, root);
  const buildFile = ownFile(dir, chase.build.module, "/build/module");
  const values: Values = resolveParams(chase, undefined, undefined);
  const sb = await runSandboxed({ buildFile, fn: chase.build.fn, designDir: dir, root, values, chase, tables: ws.tables, masks: false });
  const k = surfaceKind(sb.draft);
  const g = await loadGeom();
  const profile = createProfileLookup(loadProfile());
  const reference = path.relative(root, dir).split(path.sep).join("/");
  const draftHash = hashOf(sb.draft);
  if (k.kind === "vinyl") {
    const r = runVinyl(g, k.draft, loadVinylInputs(root), profile);
    return { reference, kind: "vinyl", draftHash, passed: r.passed, failed: r.failed, fresh: vinylGoldens(r) };
  }
  const nets = ladderNets(g, k.decl, readFileSync(ownFile(dir, k.decl.source, "/source"), "utf8"));
  const l = ladderGolden(g, k.decl, nets, profile);
  const weed = (l.golden as { weed: readonly { ok: boolean }[] }).weed;
  const whole = weed.filter((n) => n.ok).length;
  return { reference, kind: "ladder", draftHash, passed: whole, failed: weed.length - whole, fresh: { "ladder.json": l.golden } };
}
