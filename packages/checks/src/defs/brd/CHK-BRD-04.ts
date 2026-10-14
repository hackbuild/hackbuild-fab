// CHK-BRD-04, every GPIO audited for strapping and boot activity (M08-T04
// step 5). The run reads the board record of the net's part and the
// catalog the caller supplies; the kernel is packages/checks/src/brd/strap.ts.

import type { Finding, TargetOf } from "@hackbuild/spec";
import { strapFindings } from "../../brd/strap.js";
import { defineCheck } from "../../registry.js";
import { viewsOf, type RegistryCtx } from "../../views.js";
import { skip } from "../common.js";

export function runBrd04(t: TargetOf<"net">, ctx: RegistryCtx): readonly Finding[] {
  const record = t.part.board;
  if (record === undefined) return [skip({ level: "net", part: t.part.id, net: t.net.id }, "not run", "the net's part carries no board record")];
  const catalog = viewsOf(ctx).catalog;
  if (catalog === undefined) return [skip({ level: "net", part: t.part.id, net: t.net.id }, "not run", "no catalog supplied to the registry; strapping and boot rows are unknown")];
  const fs = strapFindings(record, catalog, t.net.id);
  return fs.length > 0 ? fs : [skip({ level: "net", part: t.part.id, net: t.net.id }, "not run", `net ${t.net.id} touches no MCU pin with a strapping or boot row and no load gate`)];
}

export const check = defineCheck({ id: "CHK-BRD-04", level: "net", run: (t, ctx) => runBrd04(t, ctx) });
