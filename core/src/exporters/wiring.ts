// export.run --kind wiring (M08-T13 step 3). A wiring design is a board
// chase that declares the wiring export and nothing else; its build.ts
// returns a WiringDraft (packages/wiring): the module's catalog id and the
// design's used pins and wire ends. Every pad position comes from the
// catalog row through catalog.pins, so the drawing rests on the row's tier,
// which it prints. The drawing is a design document: ExporterDef
// fabrication false, so no gate, no prompt and no check run.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { sha256Hex, type ArtifactHash, type CommandInput, type CommandOutput, type ExporterDef, type Hash, type NextCall, type PinDef, type Tier } from "@hackbuild/spec";
import { catalogPins, type Catalog } from "@hackbuild/catalog";
import { WiringError, wiringReport, wiringSvg, type WiringBoard, type WiringDraft, type WiringInput, type WiringReport } from "@hackbuild/wiring";
import { workspaceCatalog } from "../catalog-files.js";
import { cmdError, didYouMean } from "../errors.js";
import type { CommandOut } from "../result.js";
import type { CoreCtx } from "../registry.js";
import { runSandboxed, type SandboxOptions } from "../sandbox.js";
import type { Design, Values } from "../commands/build.js";

/** The wiring exporter's registry fields (spec/registry.ts ExporterDef). */
export const WIRING_EXPORTER: Pick<ExporterDef, "id" | "version" | "fabrication" | "processes" | "mediaType" | "ext"> = {
  id: "wiring", version: "1.0.0", fabrication: false, processes: [], mediaType: "image/svg+xml", ext: "svg",
};

/** A board chase whose only export is the wiring drawing. */
export function isWiringDesign(design: Pick<Design, "chase">): boolean {
  const ex = design.chase.exports;
  return design.chase.meta.kind === "board" && ex.length > 0 && ex.every((e) => e.kind === WIRING_EXPORTER.id);
}

/** Run build.ts in the sandbox and read the WiringDraft it returns; E_SCHEMA names a bad field. */
export async function wiringDraft(design: Design, values: Values, sandbox?: SandboxOptions): Promise<WiringDraft> {
  const { chase, ws } = design;
  const sb = await runSandboxed({
    buildFile: design.buildFile, fn: chase.build.fn, designDir: design.dir, root: ws.root, values, chase, tables: ws.tables, masks: false,
  }, sandbox);
  const d = sb.draft as Partial<WiringDraft> | null;
  const bad = (p: string, got: unknown, expected: string): never => {
    throw cmdError({ code: "E_SCHEMA", path: `/build${p}`, got, expected, hint: "a wiring build.ts returns { kind: \"wiring\", board: <catalog id>, used: [{ pin, function }], ends: [{ id, x, y, net, label }] }", record: "board-pcb" });
  };
  if (d === null || typeof d !== "object" || d.kind !== "wiring") return bad("/kind", d === null || typeof d !== "object" ? typeof d : String(d.kind), "wiring");
  if (typeof d.board !== "string" || d.board === "") return bad("/board", d.board, "a catalog row id");
  if (!Array.isArray(d.used)) return bad("/used", typeof d.used, "an array of { pin, function }");
  if (!Array.isArray(d.ends)) return bad("/ends", typeof d.ends, "an array of { id, x, y, net, label }");
  return { kind: "wiring", board: d.board, used: d.used, ends: d.ends, ...(typeof d.scale === "number" ? { scale: d.scale } : {}) };
}

const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);

/**
 * The module as the drawing shows it, from its catalog row: length along y
 * (USB up) and width along x from dims.l and dims.w, or dims.body [l, w];
 * the row tier is printed on the drawing.
 */
export function wiringBoard(catalog: Catalog, id: string): WiringBoard {
  const row = catalog.rows.get(id);
  if (row === undefined) throw cmdError({ code: "E_REF", path: "/build/board", got: id, hint: `no catalog row ${id}; hbf catalog.find <query>`, record: "board-pcb" });
  const body = row.fields["dims.body"]?.value;
  const l = num(row.fields["dims.l"]?.value) ?? (Array.isArray(body) ? num(body[0]) : undefined);
  const w = num(row.fields["dims.w"]?.value) ?? (Array.isArray(body) ? num(body[1]) : undefined);
  if (l === undefined || w === undefined) {
    throw cmdError({ code: "E_SCHEMA", path: `/catalog/${id}/dims`, got: Object.keys(row.fields), expected: "dims.l and dims.w, or dims.body [l, w]", hint: `catalog row ${id} has no board outline to draw`, record: "board-pcb" });
  }
  return { id, name: row.name, l, w, tier: row.tier as Tier };
}

/** The WiringInput of a draft: the board and its pins from the catalog, the rest from the draft. */
export function wiringInputOf(catalog: Catalog, draft: WiringDraft): WiringInput {
  const pins = catalogPins(catalog, draft.board).pins as readonly PinDef[];
  return {
    board: wiringBoard(catalog, draft.board), pins, used: draft.used, ends: draft.ends,
    ...(draft.scale === undefined ? {} : { scale: draft.scale }),
  };
}

/**
 * The CommandError of a WiringError: a used pin the row does not name is
 * E_REF at its /build/used entry with the row's pin names offered; a pin
 * with no pad position is E_SCHEMA at the catalog row, whose fix is the
 * row's pads table. Anything else is rethrown as it came.
 */
export function wiringCommandError(e: unknown, wi: WiringInput): Error {
  if (!(e instanceof WiringError)) return e as Error;
  if (e.kind === "unknown-pin") {
    return cmdError({
      code: "E_REF", path: `/build/used/${e.index ?? 0}/pin`, got: e.pin, expected: `a pin of ${e.board}`,
      didYouMean: didYouMean(e.pin, wi.pins.map((p) => p.name)), hint: `name pins of ${e.board} as catalog.pins ${e.board} lists them`, record: "board-pcb",
    });
  }
  return cmdError({
    code: "E_SCHEMA", path: `/catalog/${e.board}/pads`, got: e.pin, expected: "a pad position for every pin",
    hint: `catalog row ${e.board} names pin ${e.pin} but gives no pad position; add its pads or pins table with positions`, record: "board-pcb",
  });
}

export async function runWiringExport(design: Design, input: CommandInput<"export.run">, ctx: CoreCtx): Promise<CommandOut<CommandOutput<"export.run">>> {
  const draft = await wiringDraft(design, (input.params ?? {}) as Values);
  const wi = wiringInputOf(workspaceCatalog(design.ws.root), draft);
  let report: WiringReport;
  let svg: string;
  try {
    report = wiringReport(wi);
    svg = wiringSvg(wi);
  } catch (e) {
    throw wiringCommandError(e, wi);
  }
  const bytes = new TextEncoder().encode(svg);
  const name = path.basename(design.dir);
  const file = path.resolve(ctx.cwd, ctx.cli.out ?? path.join(design.ws.root, ".hbf", "out", name, `${name}-wiring.svg`));
  const rel = path.relative(ctx.cwd, file);
  const next: NextCall[] = report.unmatched.length === 0 ? [] : [{ command: "catalog.pins", args: { part: draft.board }, why: `${report.unmatched.length} wire ends name no used function; read the pin names` }];
  const counts = { pass: 0, warn: 0, fail: 0, skip: 0 };
  // dryRun builds the drawing and its report and writes nothing (spec/commands.ts export.run)
  if (input.dryRun === true) {
    return {
      verdict: "pass", stage: "gate", inputsHash: ctx.inputsHash, findings: [], counts, errors: [], artifacts: [], next,
      result: { artifacts: [], warnings: [], report, file: rel } as unknown as CommandOutput<"export.run">,
    };
  }
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, bytes);
  const hash = sha256Hex(bytes) as Hash;
  const uri = ctx.store.putArtifact(hash, "svg", bytes);
  return {
    verdict: "pass", stage: "done", inputsHash: ctx.inputsHash,
    findings: [], counts, errors: [],
    artifacts: [{ uri, kind: WIRING_EXPORTER.id, mediaType: WIRING_EXPORTER.mediaType, hash: hash as unknown as ArtifactHash, bytes: bytes.length }],
    next,
    result: { artifacts: [uri], warnings: [], report, file: rel } as unknown as CommandOutput<"export.run">,
  };
}
