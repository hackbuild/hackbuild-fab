// The board parts of a project run, for the project-level CHK-BRD checks:
// every part of the project graph the views resolve that carries a board
// record (D-089).

import type { BoardRecord, Finding, Part, TargetOf } from "@hackbuild/spec";
import type { Catalog } from "@hackbuild/catalog";
import { viewsOf, type RegistryCtx } from "../views.js";
import { skip } from "../defs/common.js";

/** Run fn over every board part; one skip when the run holds none. */
export function overBoards(t: TargetOf<"project">, ctx: RegistryCtx, fn: (record: BoardRecord, part: Part, catalog: Catalog | undefined) => readonly Finding[]): readonly Finding[] {
  const views = viewsOf(ctx);
  const boards = t.project.items.filter((i) => i.kind === "part").map((i) => views.part?.(i.id)).filter((p): p is Part & { board: BoardRecord } => p?.board !== undefined);
  if (boards.length === 0) return [skip({ level: "project" }, "not run", "no part in this run carries a board record")];
  return boards.flatMap((p) => fn(p.board, p, views.catalog));
}
