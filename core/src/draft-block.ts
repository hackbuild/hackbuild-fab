// The draft block of an hbf draft (plan v9 3.1, R1-engine-24): draft.json
// in the draft directory, the sources and opening state the DRAFT page
// carries in a <script type="application/hbf-draft+json"> block so hbf
// adopt can lift the design from the page alone (finding F6). chase.bake
// rewrites it before every draft bake, so the page carries the sources it
// was baked from; goal and from stay as hbf draft wrote them. A directory
// holding draft.json is a draft: export.run refuses it with E_DRAFT.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { defaultsOf } from "@hackbuild/pipeline";
import { DRAFT_BLOCK_FILE, type DraftBlock } from "@hackbuild/spec";
import { loadDesign, sourceClosure } from "./commands/build.js";
import { cmdError } from "./errors.js";

const posix = (p: string): string => p.split(path.sep).join("/");

/** True when the directory is an hbf draft: it holds draft.json. */
export const isDraftDir = (dir: string): boolean => existsSync(path.join(dir, DRAFT_BLOCK_FILE));

/** goal and from of the draft block in `dir`, as hbf draft wrote them. */
export function draftOrigin(dir: string): { readonly goal: string; readonly from?: string } {
  const file = path.join(dir, DRAFT_BLOCK_FILE);
  let block: Partial<DraftBlock>;
  try {
    block = JSON.parse(readFileSync(file, "utf8")) as Partial<DraftBlock>;
  } catch (e) {
    throw cmdError({ code: "E_SCHEMA", path: "/chase", got: posix(file), expected: "draft.json as hbf draft writes it", hint: `draft.json does not parse (${(e as Error).message}); run hbf draft again` });
  }
  if (typeof block.goal !== "string") throw cmdError({ code: "E_SCHEMA", path: "/chase", got: posix(file), expected: "draft.json with a goal", hint: "draft.json lost its goal; run hbf draft again" });
  return { goal: block.goal, ...(typeof block.from === "string" ? { from: block.from } : {}) };
}

/** Write draft.json for the draft in `dir` from the files on disk; returns the block. */
export async function writeDraftBlock(dir: string, cwd: string, origin: { readonly goal: string; readonly from?: string }): Promise<DraftBlock> {
  const design = await loadDesign(dir, cwd);
  const buildFile = design.buildFile;
  const read = (f: string): string => readFileSync(path.join(dir, f), "utf8");
  const buildRel = posix(path.relative(dir, buildFile));
  const files: Record<string, string> = {};
  for (const f of sourceClosure([buildFile], dir)) {
    if (f.path === "chase.ts" || f.path === buildRel || f.path.startsWith("../")) continue;
    files[f.path] = read(f.path);
  }
  const block: DraftBlock = {
    goal: origin.goal,
    ...(origin.from === undefined ? {} : { from: origin.from }),
    chase: read("chase.ts"),
    build: readFileSync(buildFile, "utf8"),
    files,
    widget: existsSync(path.join(dir, "widget.ts")) ? read("widget.ts") : null,
    state: defaultsOf(design.chase),
    kernelVersion: design.ws.versions.kernel,
    defHash: design.defHash,
  };
  writeFileSync(path.join(dir, DRAFT_BLOCK_FILE), `${JSON.stringify(block, null, 2)}\n`);
  return block;
}
