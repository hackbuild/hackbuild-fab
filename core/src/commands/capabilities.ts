// hbf capabilities (R1-designs-reach-15, plan v9 sections 2 and 3.4): what
// this workspace can do, grouped by the function a maker asks for. Each row
// lists the registered commands, the archetypes with their status, the
// references with their covers line, the designs that hold a chase.ts and
// the knowledge anchors (knowledge/designs/INDEX.md families, MECHANISMS.md
// sections) that serve that function. Every list is read from its source at
// call time and every count is computed from the list it counts. FUNCTIONS
// places each source key in one function; a key no row places is reported
// under unplaced, never dropped, and a command no row places is E_KERNEL.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ArchetypeDef, CommandName, Group } from "@hackbuild/spec";
import { archetypes } from "../canon.js";
import { referenceCovers } from "../checks.js";
import { cmdError, didYouMean } from "../errors.js";
import { designDirs } from "../artifact-rebuild.js";
import { slugOf } from "../exporters/names.js";
import { COMMANDS } from "../registry.js";

type Family = ArchetypeDef["family"];

interface FunctionDef {
  readonly id: string;
  readonly title: string;
  /** Command groups (D-106) whose commands serve this function, less those a commands entry places elsewhere. */
  readonly groups: readonly Group[];
  /** Commands placed here over their group. */
  readonly commands: readonly CommandName[];
  readonly families: readonly Family[];
  /** reference/<area> folders. */
  readonly areas: readonly string[];
  /** knowledge/designs/INDEX.md family headings; a design takes the function of its family. */
  readonly index: readonly string[];
  /** knowledge/designs/MECHANISMS.md section numbers. */
  readonly mechanisms: readonly number[];
}

const FUNCTIONS: readonly FunctionDef[] = [
  { id: "key", title: "make a key, stick or slider", groups: [], commands: [], families: ["printed", "printed-or-copper"],
    areas: ["keys", "buttons"], index: ["pip-buttons", "toggle"], mechanisms: [1, 2, 3] },
  { id: "read", title: "read a pin", groups: [], commands: ["circuit.solve"], families: ["copper", "read-model", "firmware"],
    areas: ["electrical", "sensors", "copper", "conductors"], index: ["blocks", "tang-sensors", "keyway-copper"], mechanisms: [4, 6] },
  { id: "seat", title: "seat a board", groups: [], commands: ["catalog.pins", "asm.solve"], families: ["board"],
    areas: ["boards", "seats"], index: ["boards"], mechanisms: [5] },
  { id: "mechanism", title: "make a mechanism or case", groups: [], commands: ["mech.find", "mech.derive"], families: [],
    areas: ["mechanisms", "joints", "sheet"], index: ["kits-cotter", "cases-joinery", "ogee-sheet", "counters-machines", "robots", "sheet-machines"],
    mechanisms: [7, 8, 9, 10] },
  { id: "face", title: "make a coin, tag or face", groups: [], commands: [], families: [],
    areas: ["cosmetic"], index: ["coins-inlay"], mechanisms: [11] },
  { id: "design", title: "draft, build and look at a design", groups: ["author", "build", "look"], commands: [],
    families: ["kernel", "construction", "system", "tool"], areas: [], index: [], mechanisms: [13] },
  { id: "check", title: "check", groups: ["prove"], commands: [], families: ["check", "constraint", "design-rule", "coupon"],
    areas: ["fit", "test"], index: [], mechanisms: [] },
  { id: "slice", title: "slice", groups: [], commands: [], families: [], areas: [], index: [], mechanisms: [] },
  { id: "export", title: "export", groups: ["make"], commands: [], families: [], areas: ["exports"], index: [], mechanisms: [12] },
  { id: "parts", title: "find parts and knowledge", groups: ["query"], commands: [], families: [], areas: [], index: [], mechanisms: [] },
];

/** Why the slice row carries no slicer: core has no slicer probe yet; tools/slice/slice.mjs drives the Orca-family CLI outside hbf. */
const SLICERS_NOTE = "no slicer probe in core yet (R1-designs-reach-01); tools/slice/slice.mjs drives the Orca-family slicer outside hbf";

export const CAPABILITY_FUNCTIONS: readonly string[] = FUNCTIONS.map((f) => f.id);

/** key to function id, refusing a key two rows claim. */
function placement<K>(keys: (f: FunctionDef) => readonly K[]): ReadonlyMap<K, string> {
  const out = new Map<K, string>();
  for (const f of FUNCTIONS) {
    for (const k of keys(f)) {
      const held = out.get(k);
      if (held !== undefined) throw cmdError({ code: "E_KERNEL", path: "/capabilities", got: String(k), hint: `${String(k)} is placed under both ${held} and ${f.id}; place it once in FUNCTIONS` });
      out.set(k, f.id);
    }
  }
  return out;
}

const BY_GROUP = placement((f) => f.groups);
const BY_COMMAND = placement((f) => f.commands);
const BY_FAMILY = placement((f) => f.families);
const BY_AREA = placement((f) => f.areas);
const BY_INDEX = placement((f) => f.index);
const BY_MECHANISM = placement((f) => f.mechanisms);

export interface CapabilityCommand { readonly name: string; readonly group: string; readonly summary: string }
export interface CapabilityArchetype { readonly id: string; readonly family: string; readonly status: string }
export interface CapabilityReference { readonly path: string; readonly covers: readonly string[] }
export interface CapabilityDesign { readonly id: string; readonly path: string; readonly family: string; readonly record?: string }
export interface CapabilityKnowledge { readonly file: string; readonly anchor: string; readonly heading: string }
export interface CapabilitySlicer { readonly id: string; readonly available: boolean }

export interface CapabilityCounts {
  readonly commands: number;
  readonly archetypes: number;
  readonly references: number;
  readonly designs: number;
  readonly knowledge: number;
  readonly slicers: number;
}

export interface CapabilityRow {
  readonly function: string;
  readonly title: string;
  readonly counts: CapabilityCounts;
  readonly commands: readonly CapabilityCommand[];
  readonly archetypes: readonly CapabilityArchetype[];
  readonly references: readonly CapabilityReference[];
  readonly designs: readonly CapabilityDesign[];
  readonly knowledge: readonly CapabilityKnowledge[];
  readonly slicers: readonly CapabilitySlicer[];
  /** Why a list is empty when its source has nothing for this function yet. */
  readonly notes: readonly string[];
}

export interface Capabilities {
  readonly functions: readonly CapabilityRow[];
  /** Totals over every row. */
  readonly counts: CapabilityCounts;
  /** Source keys no row in FUNCTIONS places: reference areas, INDEX families, MECHANISMS sections, designs without an INDEX row. */
  readonly unplaced: readonly string[];
}

/** The first sentence of a command description. */
const firstSentence = (s: string): string => /^.*?\.(\s|$)/s.exec(s)?.[0].trim() ?? s;

interface Heading { readonly heading: string; readonly line: number }

/** INDEX.md families (a `## ` heading with at least one `| **design** |` row) and the designs each holds. */
function indexFamilies(text: string): { readonly family: string; readonly designs: readonly string[] }[] {
  const out: { family: string; designs: string[] }[] = [];
  let current: { family: string; designs: string[] } | undefined;
  for (const line of text.split("\n")) {
    const h = /^## (.+)$/.exec(line);
    if (h !== null) {
      current = { family: h[1]!.trim(), designs: [] };
      out.push(current);
      continue;
    }
    const row = /^\| \*\*([^*]+)\*\* \|/.exec(line);
    if (row !== null && current !== undefined) current.designs.push(row[1]!.trim());
  }
  return out.filter((f) => f.designs.length > 0);
}

/** MECHANISMS.md numbered sections, `## N. Title`. */
function mechanismSections(text: string): (Heading & { readonly n: number })[] {
  return text.split("\n").flatMap((line, i) => {
    const m = /^## (\d+)\. (.+)$/.exec(line);
    return m === null ? [] : [{ n: Number(m[1]), heading: `${m[1]}. ${m[2]!.trim()}`, line: i + 1 }];
  });
}

const read = (file: string): string => (existsSync(file) ? readFileSync(file, "utf8") : "");

/** Every capability of the workspace at root, by function, optionally one function. */
export function capabilities(root: string, only?: string): Capabilities {
  if (only !== undefined && !CAPABILITY_FUNCTIONS.includes(only)) {
    throw cmdError({ code: "E_REF", path: "/function", got: only, didYouMean: didYouMean(only, CAPABILITY_FUNCTIONS), hint: `name one of ${CAPABILITY_FUNCTIONS.join(", ")}` });
  }
  const unplaced = new Set<string>();
  const rows = new Map(FUNCTIONS.map((f) => [f.id, {
    commands: [] as CapabilityCommand[], archetypes: [] as CapabilityArchetype[], references: [] as CapabilityReference[],
    designs: [] as CapabilityDesign[], knowledge: [] as CapabilityKnowledge[], slicers: [] as CapabilitySlicer[],
  }]));
  const row = (id: string) => rows.get(id)!;

  for (const c of COMMANDS) {
    const fn = BY_COMMAND.get(c.name) ?? BY_GROUP.get(c.group);
    if (fn === undefined) throw cmdError({ code: "E_KERNEL", path: `/commands/${c.name}`, got: c.group, hint: `no capabilities function takes group ${c.group}; add it to FUNCTIONS` });
    row(fn).commands.push({ name: c.name, group: c.group, summary: firstSentence(c.description) });
  }

  for (const e of archetypes.entries) {
    const d = e.def;
    const fn = BY_FAMILY.get(d.family);
    if (fn === undefined) unplaced.add(`archetype family ${d.family}`);
    else row(fn).archetypes.push({ id: d.id, family: d.family, status: d.status });
  }

  for (const r of referenceCovers(root)) {
    const [, area, id] = r.path.split("/");
    if (area === "node_modules" || id === undefined || id.startsWith("_")) continue;
    const fn = BY_AREA.get(area!);
    if (fn === undefined) unplaced.add(`reference area ${area}`);
    else row(fn).references.push({ path: r.path, covers: [...r.covers] });
  }

  const INDEX = "knowledge/designs/INDEX.md";
  const families = indexFamilies(read(path.join(root, INDEX)));
  const familyOf = new Map(families.flatMap((f) => f.designs.map((d) => [d, f.family] as const)));
  for (const f of families) {
    const fn = BY_INDEX.get(f.family);
    if (fn === undefined) unplaced.add(`${INDEX} family ${f.family}`);
    else row(fn).knowledge.push({ file: INDEX, anchor: `${INDEX}#${slugOf(f.family)}`, heading: f.family });
  }
  const MECH = "knowledge/designs/MECHANISMS.md";
  for (const s of mechanismSections(read(path.join(root, MECH)))) {
    const fn = BY_MECHANISM.get(s.n);
    if (fn === undefined) unplaced.add(`${MECH} section ${s.n}`);
    else row(fn).knowledge.push({ file: MECH, anchor: `${MECH}#${slugOf(s.heading)}`, heading: s.heading });
  }

  for (const rel of designDirs(root).filter((p) => p.startsWith("designs/"))) {
    const id = rel.slice("designs/".length);
    const family = familyOf.get(id);
    const fn = family === undefined ? undefined : BY_INDEX.get(family);
    if (family === undefined || fn === undefined) {
      unplaced.add(`design ${rel}`);
      continue;
    }
    const record = `knowledge/designs/${id}.md`;
    row(fn).designs.push({ id, path: rel, family, ...(existsSync(path.join(root, record)) ? { record } : {}) });
  }

  const functions: CapabilityRow[] = FUNCTIONS.filter((f) => only === undefined || f.id === only).map((f) => {
    const r = row(f.id);
    return {
      function: f.id, title: f.title,
      counts: countsOf([r]),
      ...r,
      notes: f.id === "slice" && r.slicers.length === 0 ? [SLICERS_NOTE] : [],
    };
  });
  return { functions, counts: countsOf(functions), unplaced: [...unplaced] };
}

function countsOf(rows: readonly { readonly [K in keyof CapabilityCounts]: readonly unknown[] }[]): CapabilityCounts {
  const sum = (k: keyof CapabilityCounts): number => rows.reduce((n, r) => n + r[k].length, 0);
  return { commands: sum("commands"), archetypes: sum("archetypes"), references: sum("references"), designs: sum("designs"), knowledge: sum("knowledge"), slicers: sum("slicers") };
}

/** The text mirror: one head line per function, then its commands and designs. */
export function renderCapabilities(c: Capabilities): string {
  const lines: string[] = [];
  for (const r of c.functions) {
    const n = r.counts;
    lines.push(`${r.function.padEnd(10)}${r.title}  commands ${n.commands}, archetypes ${n.archetypes}, references ${n.references}, designs ${n.designs}, knowledge ${n.knowledge}, slicers ${n.slicers}`);
    if (r.commands.length > 0) lines.push(`  commands  ${r.commands.map((x) => x.name).join(", ")}`);
    if (r.designs.length > 0) lines.push(`  designs   ${r.designs.map((x) => x.path).join(", ")}`);
    for (const note of r.notes) lines.push(`  note      ${note}`);
  }
  if (c.unplaced.length > 0) lines.push(`unplaced  ${c.unplaced.join(", ")}`);
  return lines.join("\n");
}
