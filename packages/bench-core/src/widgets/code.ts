// drive.code (plan v9 section 3.2: tumbler and lockbox wheels): dial a
// code on wheels and read whether the lock opens. The wheels step as
// TUMBLER's code digit buttons do (tumbler.html lines 1900 to 1907, lineage
// tumbler.bench/widget-code): a click takes a digit to (v + 1) mod (max + 1).
// The verdict is the gate function the widget's fn names, TUMBLER's
// tumbSolve (packages/mechanisms tumbler/modules.ts, original line 473),
// called with its own SIMS inputs: KEY the insertion, 0 to 1, and WRONG 1
// when the dialed key differs from the cut code, the original's WRONG KEY
// switch. The host binds the gate to the build's params and hands it in,
// as it hands in the claim functions, so the wheels and the check read one
// function.

import type { WidgetDecl } from "@hackbuild/spec";
import { liveOutputs } from "./live.js";
import type { WidgetEntry, WidgetModel } from "./registry.js";

/** A gate's verdict: every pin and the whole lock. */
export interface GateSolve {
  readonly allOk: boolean;
  readonly pins: readonly { readonly ok: boolean }[];
}

/** A code gate as the host binds it to the current build (for TUMBLER, tumbSolve over the build's params). */
export interface WidgetCodeGate {
  /** The cut code, one digit per wheel, as the lock's pins read it. */
  readonly cut: readonly number[];
  /** Top digit of a wheel; a wheel holds 0 to max. */
  readonly max: number;
  /** The gate at the original's SIMS inputs. */
  solve(u: { readonly KEY: number; readonly WRONG: number }): GateSolve;
}

export interface CodeModel extends WidgetModel {
  /** Wheel count and top digit, for the wheels to draw; null when the widget refused. */
  readonly wheels: { readonly count: number; readonly max: number } | null;
}

/** Insertion when nothing drives KEY: the key fully in, as the bay's opens metric reads it. */
export const KEY_IN = 1;

/** TUMBLER's digit button (tumbler.html line 1906): the next digit of a wheel. */
export function nextDigit(v: number, max: number): number {
  return (v + 1) % (max + 1);
}

/** The dialed code: the host's wheels, else all zero. A wrong length or digit is a string. */
export function dialedCode(dialed: readonly number[] | undefined, gate: WidgetCodeGate): readonly number[] | string {
  const code = dialed ?? gate.cut.map(() => 0);
  if (code.length !== gate.cut.length) return `the wheels hold ${code.length} digits and the lock has ${gate.cut.length} pins`;
  const bad = code.find((d) => !Number.isInteger(d) || d < 0 || d > gate.max);
  return bad === undefined ? code : `a wheel reads ${bad}; each holds 0 to ${gate.max}`;
}

function refusal(decl: WidgetDecl, problem: string): CodeModel {
  return { id: decl.id, kind: decl.kind, outputs: {}, problem, wheels: null };
}

export const driveCode: WidgetEntry<CodeModel> = {
  model(decl, build) {
    const gate = build.gates?.[decl.fn];
    if (gate === undefined) return refusal(decl, `the bench carries no code gate ${decl.fn}; the page build hands the gate in`);
    const code = dialedCode(build.codes?.[decl.id], gate);
    if (typeof code === "string") return refusal(decl, code);
    const key = decl.inputs["key"];
    const insertion = build.insertion?.[decl.id] ?? (typeof key === "number" ? key : KEY_IN);
    const wrong = code.filter((d, i) => d !== gate.cut[i]).length;
    const s = gate.solve({ KEY: insertion, WRONG: wrong > 0 ? 1 : 0 });
    const outputs: Record<string, unknown> = {
      code: [...code], insertion, opens: s.allOk ? 1 : 0, pinsOk: s.pins.filter((p) => p.ok).length,
      wrong, keyspace: Math.pow(gate.max + 1, gate.cut.length),
      qualifier: { opens: "computed", pinsOk: "computed", wrong: "computed", keyspace: "computed" },
    };
    return { id: decl.id, kind: decl.kind, outputs, problem: null, wheels: { count: gate.cut.length, max: gate.max } };
  },
  liveness: liveOutputs,
};

/** The code readout: the dialed code and the verdict, or what stops it. */
export function codeLine(m: CodeModel): string {
  if (m.problem !== null) return m.problem;
  const o = m.outputs;
  const code = (o["code"] as readonly number[]).join(" ");
  return o["opens"] === 1
    ? `${code} opens, every pin at the shear line (computed)`
    : `${code} stays locked, ${o["pinsOk"]} pins at the shear line (computed)`;
}
