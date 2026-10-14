// SPICE netlist text for eecircuit-engine 1.8.0 (ngspice 45.2), M05-T01.
//
// toNetlist writes R, V and C element lines and one analysis line: `.op`,
// or `.tran <step>u <stop>u` with `UIC` appended when any capacitor carries
// an initial condition (ngspice manual, .tran UIC). Values keep their repo
// units and take the ngspice scale suffix, so the text carries the caller's
// number verbatim: capacitance in pF as `9.109p`, time in us as `60u`. The
// line shapes are the ones the C9 measurement scripts ran
// (/Users/obsidian/Projects/hackbuild/fab-knowledge/evidence/scratch/c9/run.mjs
// lines 6 and 12, m05rc.mjs line 4).
//
// Names and nodes are checked against a plain identifier pattern so no
// value can open a second line or a dot command inside the deck.

import type { Micros, Ohm, Volt } from "@hackbuild/spec";
import { circuitError } from "../path1d.js";

/** A SPICE node name; "0" is ground. */
export type SpiceNode = string;

export type SpiceElement =
  | { readonly kind: "R"; readonly name: string; readonly a: SpiceNode; readonly b: SpiceNode; readonly ohm: Ohm }
  | { readonly kind: "V"; readonly name: string; readonly pos: SpiceNode; readonly neg: SpiceNode; readonly volts: Volt }
  | {
      readonly kind: "C"; readonly name: string; readonly a: SpiceNode; readonly b: SpiceNode;
      /** Capacitance, pF. */
      readonly pf: number;
      /** Initial voltage across the capacitor, V; sets UIC on a transient. */
      readonly icV?: Volt;
    };

export type SpiceAnalysis =
  | { readonly kind: "op" }
  | { readonly kind: "tran"; readonly stepUs: Micros; readonly stopUs: Micros };

/** One operating point or transient to hand ngspice. */
export interface OperatingPointInput {
  /** Title line text, written after `* `. */
  readonly title: string;
  readonly elements: readonly SpiceElement[];
  readonly analysis: SpiceAnalysis;
}

const IDENT = /^[A-Za-z0-9_]+$/;
const TITLE = /^[^\r\n]*$/;

function ident(v: string, path: string): string {
  if (!IDENT.test(v)) throw circuitError({ code: "E_SCHEMA", path, got: v, expected: "letters, digits or _", hint: "name spice nodes and elements with letters, digits or _" });
  return v;
}

function num(v: number, path: string, positive: boolean): string {
  if (!Number.isFinite(v) || (positive && !(v > 0))) {
    throw circuitError({ code: "E_SCHEMA", path, got: v, expected: positive ? "a finite number above 0" : "a finite number", hint: "give every spice value as a finite number" });
  }
  return String(v);
}

function line(e: SpiceElement, i: number): string {
  const at = `/elements/${i}`;
  const name = ident(e.name, `${at}/name`);
  switch (e.kind) {
    case "R":
      return `R${name} ${ident(e.a, `${at}/a`)} ${ident(e.b, `${at}/b`)} ${num(e.ohm, `${at}/ohm`, true)}`;
    case "V":
      return `V${name} ${ident(e.pos, `${at}/pos`)} ${ident(e.neg, `${at}/neg`)} ${num(e.volts, `${at}/volts`, false)}`;
    case "C": {
      const ic = e.icV === undefined ? "" : ` IC=${num(e.icV, `${at}/icV`, false)}`;
      return `C${name} ${ident(e.a, `${at}/a`)} ${ident(e.b, `${at}/b`)} ${num(e.pf, `${at}/pf`, true)}p${ic}`;
    }
  }
}

/** The netlist deck for one OperatingPointInput, ending in `.end` and a newline. */
export function toNetlist(op: OperatingPointInput): string {
  if (!TITLE.test(op.title)) throw circuitError({ code: "E_SCHEMA", path: "/title", got: op.title, hint: "keep the netlist title on one line" });
  const lines = [`* ${op.title}`, ...op.elements.map(line)];
  const a = op.analysis;
  if (a.kind === "op") {
    lines.push(".op");
  } else {
    const uic = op.elements.some((e) => e.kind === "C" && e.icV !== undefined) ? " UIC" : "";
    lines.push(`.tran ${num(a.stepUs, "/analysis/stepUs", true)}u ${num(a.stopUs, "/analysis/stopUs", true)}u${uic}`);
  }
  lines.push(".end");
  return `${lines.join("\n")}\n`;
}
