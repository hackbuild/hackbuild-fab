// view.render (M00-T13 step 11): orthographic PNGs of a stored build from
// the body meshes in the store, flat shaded per slot colour. assembled is
// the four views on one sheet; iso, section and plate (the top view) are
// one view each. The PNG goes to the store; --out also writes it to a file.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ArtifactHash, CommandInput, CommandOutput, ViewMode } from "@hackbuild/spec";
import { cmdError, didYouMean } from "../errors.js";
import { sha256Hex } from "@hackbuild/spec";
import type { CoreCtx } from "../registry.js";
import type { CommandOut } from "../result.js";
import { encodePng } from "../render/png.js";
import { parseColour, renderSheet, renderView, type RenderMesh, type View } from "../render/raster.js";
import { recordOf } from "./part-inspect.js";

/** Modes view.render draws, and the single view each one is. */
const MODE_VIEW = { assembled: undefined, iso: "iso", section: "section", plate: "top" } as const satisfies Partial<Record<ViewMode, View | undefined>>;
export const VIEW_MODES = Object.keys(MODE_VIEW) as readonly (keyof typeof MODE_VIEW)[];

/** Default image size, px: the sheet holds four 512 px views. */
const DEFAULT_SIZE = { sheet: [1024, 1024], single: [512, 512] } as const;

export async function runViewRender(input: CommandInput<"view.render">, ctx: CoreCtx): Promise<CommandOut<CommandOutput<"view.render">>> {
  if (!(VIEW_MODES as readonly string[]).includes(input.mode)) {
    throw cmdError({ code: "E_REF", path: "/mode", got: input.mode, didYouMean: didYouMean(input.mode, VIEW_MODES), hint: `name a mode view.render draws: ${VIEW_MODES.join(", ")}` });
  }
  const mode = input.mode as keyof typeof MODE_VIEW;
  const rec = await recordOf(input.target, ctx, "/target");
  const colourOf = new Map(rec.slots.map((s) => [s.slot, parseColour(s.colour)]));
  const meshes: RenderMesh[] = rec.part.bodies.map((b) => {
    const m = ctx.store.mesh(b.mesh.hash, "/target");
    return { positions: m.positions, triangles: m.triangles, colour: colourOf.get(b.slot) ?? [128, 128, 128] };
  });
  const view = MODE_VIEW[mode];
  const [w, h] = input.size ?? (view === undefined ? DEFAULT_SIZE.sheet : DEFAULT_SIZE.single);
  const rgb = view === undefined ? renderSheet(meshes, w, h) : renderView(meshes, view, w, h);
  const png = encodePng(w, h, rgb);
  const hash = sha256Hex(png) as unknown as ArtifactHash;
  const uri = ctx.store.putArtifact(hash, "png", png);
  if (ctx.cli.out !== undefined) {
    const file = path.resolve(ctx.cwd, ctx.cli.out);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, png);
  }
  return {
    verdict: "pass", stage: "done", buildHash: rec.buildHash, inputsHash: ctx.inputsHash,
    findings: [], counts: { pass: 0, warn: 0, fail: 0, skip: 0 }, errors: [],
    artifacts: [{ uri, kind: "png", mediaType: "image/png", hash, bytes: png.length }],
    next: [], result: { artifact: uri },
  };
}
