// Writes src/defs/feeler/*.ts and src/feeler-table.ts (M06-T10): the 22
// STYLUS THINPOT archetypes as candidates, their params read from the
// original's own param declarations.
//
//   node packages/archetypes/scripts/feeler-defs.mjs
//
// Each archetype's `params:[...]` array is cut from
// originals/thinpot/files/feeler_thinpot.html and evaluated with the
// original's helpers n, sel and bool as the page binds them: the page
// declares them twice (lines 1238 to 1240 and 3083 to 3085) in one script
// scope, so the later declarations win for every call, and `n` keeps an
// empty unit as empty (line 3083). Senses, emits and read model are the
// working values this card assigns (CANONS.md 6); groups, sim model ids and
// line ranges are read from the page.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { localSource } from "../../../tools/test-support/originals-root.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.join(HERE, "..");
const FILE = localSource("fab-knowledge:originals/thinpot/files/feeler_thinpot.html");
const src = readFileSync(FILE, "utf8");
const lines = src.split("\n");
const sha = createHash("sha256").update(readFileSync(FILE)).digest("hex");

const n = (k, l, d, mn, mx, st, u, h) => ({ k, label: l, type: "num", def: d, min: mn, max: mx, step: st, unit: u === undefined ? "mm" : u, hint: h });
const sel = (k, l, d, o, h) => ({ k, label: l, type: "sel", def: d, opts: o, hint: h });
const bool = (k, l, d, h) => ({ k, label: l, type: "bool", def: d, hint: h });

/** Working values (CANONS.md 6, M06-T10): what each senses, what it emits, how it is read, the proven entry it links to. */
const WORK = {
  cappad: { senses: ["touch"], read: "rc-time", contact: false, links: "capacitive-plate" },
  switch: { senses: ["press"], read: "pullup", contact: true, links: "dome-button" },
  flexstrip: { senses: ["bend", "stretch"], read: "adc", contact: false },
  compress: { senses: ["force"], read: "adc", contact: false },
  meander: { senses: ["resistance"], read: "adc", contact: false, links: "printed-pullup-meander" },
  tribo: { senses: ["impact"], read: "adc", contact: false },
  horn: { senses: ["strain"], read: "adc", contact: false },
  comb: { senses: ["vibration"], read: "adc", contact: false },
  auxetic: { senses: ["strain"], read: "adc", contact: false },
  triaxial: { senses: ["force-3"], read: "adc", contact: false },
  bistable: { senses: ["press"], read: "pullup", contact: true },
  gradient: { senses: ["force"], read: "adc", contact: false },
  absorber: { senses: ["rf"], read: "none", contact: false },
  rfpatch: { senses: ["strain"], read: "none", contact: false },
  encoder: { senses: ["angle"], read: "pullup", contact: true },
  wiper: { senses: ["angle"], read: "ratiometric", contact: true, links: "printed-rotary-pot" },
  matrix: { senses: ["pressure-map"], read: "column-scan", contact: false },
  level: { senses: ["level"], read: "rc-time", contact: false },
  hotwire: { senses: ["flow"], read: "adc", contact: false },
  thinpot: { senses: ["position"], read: "ratiometric", contact: true, links: "membrane-slider-thinpot" },
  ladder: { senses: ["press"], read: "ladder", contact: true, links: "ladder-keypad" },
  whisker: { senses: ["touch"], read: "pullup", contact: true },
};

/** The bracket-balanced text from the first `[` at or after i. */
function arrayAt(i) {
  const s = src.indexOf("[", i);
  let depth = 0, q = null;
  for (let j = s; j < src.length; j++) {
    const ch = src[j];
    if (q) { if (ch === "\\") { j++; continue; } if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"') { q = ch; continue; }
    if (ch === "[") depth++;
    if (ch === "]" && --depth === 0) return src.slice(s, j + 1);
  }
  throw new Error("unbalanced params array");
}

const starts = [];
lines.forEach((l, i) => { const m = /^id:'([a-z]+)', name:'([^']+)', group:'([^']+)'/.exec(l); if (m) starts.push({ id: m[1], name: m[2], group: m[3], line: i + 1 }); });
if (starts.length !== 22) throw new Error(`found ${starts.length} archetypes, expected 22`);
const simLine = (id) => lines.findIndex((l) => l.startsWith(`SIM.${id} = {`)) + 1;

const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const outDir = path.join(PKG, "src", "defs", "feeler");
mkdirSync(outDir, { recursive: true });
const table = [];
const renamed = [];
for (const [idx, a] of starts.entries()) {
  const end = (starts[idx + 1]?.line ?? simLine(starts[0].id)) - 1;
  const offset = lines.slice(0, a.line - 1).join("\n").length + 1;
  const raw = (0, eval)(`(function(n, sel, bool){ return ${arrayAt(src.indexOf("params:", offset))}; })`)(n, sel, bool);
  // The page declares holeD twice on switch and ladder, once for the contact
  // hole and once for the mounting holes, so one key holds two meanings and
  // the page keeps one value for both (a FEELER defect, M06-T10 finding).
  // The port names the mounting hole mountHoleD; any other repeat is refused.
  const seen = new Set();
  const params = raw.map((p) => {
    if (!seen.has(p.k)) { seen.add(p.k); return p; }
    if (p.k === "holeD" && p.label === "hole dia") { renamed.push(`${a.id}.holeD`); return { ...p, k: "mountHoleD" }; }
    throw new Error(`${a.id}: param ${p.k} declared twice`);
  });
  const w = WORK[a.id];
  const field = (p) => {
    const doc = `${p.label}${p.unit ? `, ${p.unit}` : ""}${p.hint ? `: ${p.hint}` : ""}`.replace(/\*\//g, "* /");
    if (p.type === "num") return `  /** ${doc} */\n  ${JSON.stringify(p.k)}: z.number().min(${p.min}).max(${p.max}).default(${p.def}),`;
    if (p.type === "bool") return `  /** ${doc} */\n  ${JSON.stringify(p.k)}: z.boolean().default(${p.def}),`;
    return `  /** ${doc} */\n  ${JSON.stringify(p.k)}: z.enum(${JSON.stringify(p.opts.map((o) => o[0]))}).default(${JSON.stringify(p.def)}),`;
  };
  const name = `feeler${a.id[0].toUpperCase()}${camel(a.id.slice(1))}`;
  const emits = ["conductor", ...(w.contact ? ["contact"] : []), "port"];
  const body = `// feeler-${a.id}: STYLUS THINPOT candidate (M06-T10, D-097, D-164).
// Generated by packages/archetypes/scripts/feeler-defs.mjs from
// originals/thinpot/files/feeler_thinpot.html: the archetype "${a.name}"
// (group ${a.group}) at lines ${a.line} to ${end}, its sim model SIM.${a.id} at
// line ${simLine(a.id)}. Params are the page's own declarations; never edit by hand.

import { z } from "zod";
import type { SchemaLike } from "@hackbuild/spec";
import { candidateArchetype } from "../../def.js";

export const ${name}Params = z.object({
${params.map(field).join("\n")}
}).strict();

export const ${name} = candidateArchetype({
  id: "feeler-${a.id}",
  family: "printed",
  channels: null,
  senses: ${JSON.stringify(w.senses)},
  emits: ${JSON.stringify(emits)},
  read: ${JSON.stringify(w.read)},
  limits: [],
  provenance: "STYLUS THINPOT 2026-08, feeler_thinpot.html lines ${a.line} to ${end}",
  status: "candidate",
  statusReason: "STYLUS promotes it at M10 by writing its reference (D-164); arch.apply refuses it until then",
  original: [
    { slug: "thinpot", file: "files/feeler_thinpot.html", fn: "reg ${a.id}, SIM.${a.id}", lines: "${a.line} to ${end}, ${simLine(a.id)}", sha256: "${sha}", record: "thinpot" },
  ],
  params: ${name}Params as unknown as SchemaLike<unknown, z.infer<typeof ${name}Params>>,
});
`;
  writeFileSync(path.join(outDir, `${a.id}.ts`), body);
  table.push({ id: `feeler-${a.id}`, name, bench: a.name, group: a.group, line: a.line, end, sim: a.id, simLine: simLine(a.id), links: w.links ?? null, params: params.length });
}
const index = `// Generated by packages/archetypes/scripts/feeler-defs.mjs; never edit by hand.
// The 22 STYLUS THINPOT candidates (M06-T10) in page order, with what the page
// says about each: bench name and group, line range, sim model id and line,
// the proven entry it links to.

import type { ArchetypeDef } from "@hackbuild/spec";
${table.map((t) => `import { ${t.name} } from "./${t.sim}.js";`).join("\n")}

export interface FeelerRow {
  readonly id: string;
  readonly bench: string;
  readonly group: "well behaved" | "piezoresistive" | "metamaterial" | "hybrid" | "exotic";
  readonly lines: readonly [number, number];
  readonly sim: string;
  readonly simLine: number;
  readonly links: string | null;
}

export const FEELER_TABLE: readonly FeelerRow[] = [
${table.map((t) => `  { id: "${t.id}", bench: ${JSON.stringify(t.bench)}, group: "${t.group}", lines: [${t.line}, ${t.end}], sim: "${t.sim}", simLine: ${t.simLine}, links: ${JSON.stringify(t.links)} },`).join("\n")}
];

export const FEELER_DEFS: readonly ArchetypeDef[] = [${table.map((t) => t.name).join(", ")}] as unknown as readonly ArchetypeDef[];
`;
writeFileSync(path.join(outDir, "index.ts"), index);
process.stdout.write(`wrote ${table.length} candidates, ${table.reduce((s, t) => s + t.params, 0)} params; renamed ${renamed.join(", ")} to mountHoleD\n`);
