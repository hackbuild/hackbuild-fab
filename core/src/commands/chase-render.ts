// chase.render (M10-T07 step 1, D-050, D-129, D-154; group look). Bakes
// the design's bake.json into a temporary root with tools/bake/bake.mjs,
// opens the page headless offline with tools/smoke/render.ts, and returns
// one png per rail step at 1280 and 390 px plus the smoke measures: scroll
// width per view, focal pink per view, console errors and requests off
// the file over the run. The page and the pngs go to the store; nothing is
// written to the repo, so a design with no bake.json is refused (chase.bake
// writes one beside chase.ts). Both children run outside core's resolve
// hook, as chase.bake runs the baker.
//
// It feeds the review artifact of D-154 and never ticks it: a person
// still looks at the bench at both widths.

import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { readChaseSource } from "@hackbuild/chase";
import { sha256Hex, type Artifact, type ArtifactHash, type ArtifactUri, type CommandError, type CommandInput, type CommandOutput } from "@hackbuild/spec";
import type { CoreCtx } from "../ctx.js";
import { cmdError } from "../errors.js";
import type { CommandOut } from "../result.js";
import { workspaceRoot } from "./build.js";
import { bakeRecord, lastLine, runNode } from "./chase-bake.js";
import { chaseDir } from "./chase-validate.js";

type Output = CommandOutput<"chase.render">;

/** The pink budget of one view (D-125, UI.md section 10). */
export const PINK_BUDGET = 1;

interface Run {
  views: { step: string; width: number; png: string | null; scrollWidth: number; pinkFocal: number }[];
  consoleErrors: string[];
  network: string[];
}

const posix = (p: string): string => p.split(path.sep).join("/");

/** One error per breach of the smoke laws; empty when the page passes. */
export function breaches(run: Omit<Run, "views"> & { views: readonly Omit<Run["views"][number], "png">[] }): CommandError[] {
  const out: CommandError[] = [];
  for (const v of run.views) {
    const at = `step ${v.step} at ${v.width}`;
    if (v.scrollWidth > v.width) out.push({ code: "E_KERNEL", path: "/chase", got: `${v.scrollWidth} px`, expected: `at most ${v.width} px`, record: "render/overflow", hint: `${at}: scroll width ${v.scrollWidth} px over viewport ${v.width} px (measured); find the wide element and let it wrap` });
    if (v.pinkFocal > PINK_BUDGET) out.push({ code: "E_KERNEL", path: "/chase", got: `${v.pinkFocal} focal pink`, expected: `at most ${PINK_BUDGET}`, record: "render/pink", hint: `${at}: ${v.pinkFocal} focal pink elements, budget ${PINK_BUDGET} (measured); fill toggles with ink` });
  }
  for (const e of run.consoleErrors) out.push({ code: "E_KERNEL", path: "/chase", got: e.slice(0, 200), record: "render/console", hint: "the page logged an error while it ran; open it and read the console" });
  for (const u of run.network) out.push({ code: "E_KERNEL", path: "/chase", got: u, record: "render/network", hint: "the page requested a file off the page (D-129); inline the resource or drop it" });
  return out;
}

const empty = { url: "", shots: [], views: [], consoleErrors: [], network: [] };

export async function runChaseRender(input: CommandInput<"chase.render">, ctx: CoreCtx): Promise<CommandOut<Output>> {
  const root = workspaceRoot(ctx.cwd);
  const dir = chaseDir(root, ctx.cwd, input.chase);
  readChaseSource(readFileSync(path.join(dir, "chase.ts"), "utf8"), posix(path.relative(root, path.join(dir, "chase.ts"))));
  const manifest = path.join(dir, "bake.json");
  if (!existsSync(manifest)) {
    throw cmdError({ code: "E_REF", path: "/chase", got: input.chase, expected: "a bake.json beside chase.ts", hint: `run hbf chase.bake ${input.chase} once; it writes bake.json, and chase.render writes nothing to the repo` });
  }
  ctx.signal.throwIfAborted();

  const work = mkdtempSync(path.join(tmpdir(), "hbf-render-"));
  try {
    const fail = (errors: readonly CommandError[]): CommandOut<Output> => ({
      verdict: "fail", stage: "build", inputsHash: ctx.inputsHash,
      findings: [], counts: { pass: 0, warn: 0, fail: 0, skip: 0 }, errors, artifacts: [], next: [], result: empty,
    });
    const baked = await runNode(ctx, root, [path.join(root, "tools/bake/bake.mjs"), manifest, "--out-root", work]);
    if (baked.code !== 0) {
      const why = lastLine(baked.err).replace(/^bake: /, "");
      return fail([{ code: "E_KERNEL", path: "/chase", got: posix(path.relative(root, manifest)), record: bakeRecord(why), hint: why || "the baker stopped without a message" }]);
    }
    const m = JSON.parse(readFileSync(manifest, "utf8")) as { id: string; out?: string; shell: string };
    const page = path.join(work, m.out ?? (m.shell === "ui" ? "bench" : "legacy"), `${m.id}.html`);
    ctx.signal.throwIfAborted();

    const shotDir = input.screenshots === false ? "-" : mkdtempSync(path.join(work, "shots-"));
    const seen = await runNode(ctx, root, [path.join(root, "tools/smoke/render.ts"), page, shotDir]);
    if (seen.code !== 0) {
      const why = lastLine(seen.err).replace(/^render: /, "");
      return fail([{ code: "E_KERNEL", path: "/chase", got: posix(path.relative(root, dir)), record: "render/browser", hint: why || "the headless browser stopped without a message; check system chrome is installed" }]);
    }
    const run = JSON.parse(lastLine(seen.out)) as Run;

    const artifacts: Artifact[] = [];
    const put = (file: string, ext: string, mediaType: string): ArtifactUri => {
      const bytes = readFileSync(file);
      const hash = sha256Hex(bytes) as unknown as ArtifactHash;
      const uri = ctx.store.putArtifact(hash, ext, bytes);
      artifacts.push({ uri, kind: ext, mediaType, hash, bytes: bytes.length });
      return uri;
    };
    const url = put(page, "html", "text/html");
    const shots = run.views.flatMap((v) => (v.png === null ? [] : [put(v.png, "png", "image/png")]));
    const errors = breaches(run);
    return {
      verdict: errors.length === 0 ? "pass" : "fail", stage: "done", inputsHash: ctx.inputsHash,
      findings: [], counts: { pass: 0, warn: 0, fail: 0, skip: 0 }, errors, artifacts, next: [],
      result: {
        url, shots,
        views: run.views.map(({ step, width, scrollWidth, pinkFocal }) => ({ step, width, scrollWidth, pinkFocal })),
        consoleErrors: run.consoleErrors, network: run.network,
      },
    };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
