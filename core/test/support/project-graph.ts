// What core/test/project-graph.test.ts and project-graph-scenario.test.ts
// share (R1-speed-01): the references under test, their goldens, a store
// in a temporary directory, and part.build and project.graph run through
// that store.

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { BuildInputs } from "@hackbuild/spec";
import { runPartBuild } from "../../src/commands/part-build.js";
import { runProjectGraph, type GraphOut } from "../../src/commands/project-graph.js";
import { hashOf } from "../../src/jcs.js";
import type { CoreCtx } from "../../src/ctx.js";
import { Store } from "../../src/store.js";
import { ROOT } from "../hbf.js";

export const OGEE = "reference/fit/ogee16-r16p";
export const CLICK = "reference/keys/click-spring-window";

export const golden = (ref: string): { buildHash: string; inputs: BuildInputs } =>
  JSON.parse(readFileSync(path.join(ROOT, ref, "expected", "build.json"), "utf8")) as { buildHash: string; inputs: BuildInputs };

const tmps: string[] = [];

/** A temporary directory removed by cleanTmps. */
export function tmp(prefix: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  tmps.push(dir);
  return dir;
}

export const freshStore = (): Store => new Store(tmp("hbf-graph-"));

/** Remove every directory tmp made; each file calls it in afterAll. */
export function cleanTmps(): void {
  for (const d of tmps.splice(0)) rmSync(d, { recursive: true, force: true });
}

export const ctxOf = (store: Store): CoreCtx => ({ workspace: ROOT, cwd: ROOT, store, inputsHash: hashOf("project-graph-test") } as unknown as CoreCtx);

export async function build(store: Store, ref: string): Promise<string> {
  const r = await runPartBuild({ chase: ref }, ctxOf(store));
  return r.buildHash!;
}

export async function staleView(store: Store, opts: { stale?: boolean; from?: string } = { stale: true }): Promise<GraphOut> {
  return (await runProjectGraph(opts, ctxOf(store))).result as GraphOut;
}
