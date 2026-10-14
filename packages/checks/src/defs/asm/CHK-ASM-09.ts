// CHK-ASM-09, revolute joint between two sheet parts declares bought round
// stock (JointDecl.stock) (OGEE R12 2026-08: a square peg's contact radius
// ran 1.500 to 2.121, a cam and not a bearing). Selected by joint kind
// revolute (D-177, CHECKS.md 7.7: the v3 pivot moved to joints). A part is
// a sheet part when it is cut (laser, vinyl or paper) or carries a sheet
// plane or pose; a revolute joint whose two instances are both sheet parts
// must name its rod or screw.

import type { Assembly, Finding, Part } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { boolFinding } from "../common.js";

const isSheet = (p: Part | undefined): boolean =>
  p !== undefined && (p.process === "laser" || p.process === "vinyl" || p.process === "paper" || p.plane !== undefined || p.frame.pose === "sheet");

const partOf = (a: Assembly, inst: string): Part | undefined => a.parts.find((p) => p.id === a.instances.find((i) => i.id === inst)?.part);

export const check = defineCheck({
  id: "CHK-ASM-09",
  level: "assembly",
  run: (t): readonly Finding[] => {
    const a = t.assembly;
    return a.joints.filter((j) => j.kind === "revolute").map((j) => {
      const sheets = isSheet(partOf(a, j.a)) && isSheet(partOf(a, j.b));
      const ok = !sheets || j.stock !== undefined;
      return boolFinding({ level: "pair", a: { level: "assembly", assembly: a.id, part: j.a }, b: { level: "assembly", assembly: a.id, part: j.b } }, ok,
        sheets ? "a pivot between two cut sheets turns on bought round stock; a cut peg is a cam" : "a pivot with a printed side needs no bought stock",
        { joint: j.id, sheetPair: sheets ? "yes" : "no", stock: j.stock === undefined ? "none" : `${j.stock.kind} ${j.stock.d}` });
    });
  },
});
