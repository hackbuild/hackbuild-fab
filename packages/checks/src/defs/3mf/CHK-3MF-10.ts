// CHK-3MF-10, adaptive_pressure_advance_model holds no literal backslash n;
// the value is a real multi-line string or a list (CASK 2026-09-05 export:
// every slot of Metadata/project_settings.config held "0,0,0\n0,0,0" with a
// backslash and an n where the harvested template has a line break,
// CHECKS.md 7.3 and 9.15). One finding per package; extra names the slots
// that carry the escape.

import type { Finding, TargetOf } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { entriesOf } from "../../skeleton/threemf.js";
import { boolFinding, skip } from "../common.js";

export const PA_KEY = "adaptive_pressure_advance_model";
const SETTINGS = "Metadata/project_settings.config";
const ESCAPE = "\\n";

// Kernels compile without DOM or node types; TextDecoder is a runtime global in both.
declare const TextDecoder: new (label: string) => { decode(input: Uint8Array): string };

export async function run3mf10(t: TargetOf<"artifact">): Promise<readonly Finding[]> {
  const at = { level: "artifact" as const, artifact: t.artifact.name, path: SETTINGS };
  const raw = (await entriesOf(t.artifact)).get(SETTINGS);
  if (raw === undefined) return [skip(at, "not run", `${t.artifact.name} has no ${SETTINGS}`)];
  let settings: Record<string, unknown>;
  try {
    settings = JSON.parse(new TextDecoder("utf-8").decode(raw)) as Record<string, unknown>;
  } catch {
    return [skip(at, "not run", `${SETTINGS} in ${t.artifact.name} is not json; CHK-3MF-03 reads the settings`)];
  }
  const v = settings[PA_KEY];
  if (v === undefined) return [skip(at, "not run", `${SETTINGS} in ${t.artifact.name} has no ${PA_KEY}`)];
  const slots = Array.isArray(v) ? v : [v];
  const escaped = slots.flatMap((s, i) => (typeof s === "string" && s.includes(ESCAPE) ? [i] : []));
  return [boolFinding(at, escaped.length === 0,
    escaped.length === 0
      ? `${PA_KEY} in ${slots.length} slots holds line breaks, no literal backslash n`
      : `${PA_KEY} holds a literal backslash n in ${escaped.length} of ${slots.length} slots, first slot ${escaped[0]!}; write the line break itself`,
    { key: PA_KEY, slots: slots.length, escapedSlots: escaped.length, ...(escaped.length === 0 ? {} : { first: escaped[0]! }) })];
}

export const check = defineCheck({
  id: "CHK-3MF-10",
  level: "artifact",
  run: (t) => run3mf10(t),
});
