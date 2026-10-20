// CHK-3MF-04, non-structure inserts inset by two parameters: coincidence
// 0.001 mm by true edge normal, pinch 0.02 mm Miter (COLLAR 2026-08: a
// homothety pushed spirals into the wall; COTTER HAIR; CHECKS.md 7.1,
// D-070). The rule runs once, in src/3mf/chk-3mf-04.ts chk3mf04 (M00-T09
// step 4, moved from packages/3mf by R1-engine-03), on plan outlines from
// the Part IR (Body.outline, D-224). The inserts the origins name are art
// inlays, so art bodies are the inserts and body and structure bodies the
// structure; an outline the emitter left out is not guessed.
import type { CheckResult, Finding } from "@hackbuild/spec";
import { chk3mf04 } from "../../3mf/chk-3mf-04.js";
import { defineCheck } from "../../registry.js";

const STRUCTURE = new Set(["body", "structure"]);

export const check = defineCheck({
  id: "CHK-3MF-04",
  level: "part",
  run: (t, ctx): readonly Finding[] => {
    const outlined = t.part.bodies.filter((b) => b.outline !== undefined && b.outline.length > 0);
    const structure = outlined.filter((b) => STRUCTURE.has(b.role)).map((b) => ({ body: b.id, rings: b.outline! }));
    const inserts = outlined.filter((b) => b.role === "art").map((b) => ({ body: b.id, rings: b.outline! }));
    return chk3mf04({ part: t.part.id, structure, inserts }, ctx.profile).map((r: CheckResult) => {
      const { id: _id, version: _v, severity: _s, origin: _o, waived: _w, ...finding } = r;
      return finding as Finding;
    });
  },
});
