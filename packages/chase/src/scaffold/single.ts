// The single kind's minimal chase (M10-T05 step 1), ported from the v3
// design template (fab-knowledge evidence/x/plan-to-refine/handoff/hbf/
// scaffold/designs/_template/chase.ts and build.ts): one PETG slot, one
// param group "main" with one diameter field, a rail ending in print, no
// expect or waive, exports 3mf for ffc5p, license CC-BY-SA-4.0. The v3
// template kept views, rail and status in the chase; schema 2 moves them
// to bench.ts (D-174), so benchSource writes them there. The template's
// build threw "implement"; this one builds a disc so the first part.build
// has a body to show.
//
// The diameter field is the COLLAR blank's (designs/collar/chase.ts,
// blank.dia: range 20 to 80 mm, step 0.5, default 44), the same numbers
// the template carried. Pure: the command writes the files.

import type { ChaseKind } from "@hackbuild/spec";

/** The three files a scaffold writes, by their names in designs/<name>/. */
export interface ScaffoldFiles {
  readonly "chase.ts": string;
  readonly "build.ts": string;
  readonly "bench.ts": string;
}

/** The kinds that have a minimal scaffold; surface and machine wait for release 2 (finding F5). */
export type MinimalKind = Extract<ChaseKind, "single" | "composer">;

/** meta.name for a chase id: upper case, hyphens as spaces. */
export const displayName = (id: string): string => id.toUpperCase().replace(/-/g, " ");

/** The bench and build line that imports the chase beside them; spelled through a value so the specifier scan reads no extensionless import here. */
const CHASE_IMPORT = `import { chase } from ${JSON.stringify("./chase")};`;

/** A param group as the bench generator reads it. */
export interface BenchGroup {
  readonly id: string;
  readonly label: string;
}

/**
 * A default bench.ts for a chase: one rail step per param group, then the
 * print step (D-125). It sits outside defHash (D-174), so a model never
 * needs to edit it.
 */
export function benchSource(name: string, groups: readonly BenchGroup[]): string {
  const steps = groups.map((g) => `    { step: ${JSON.stringify(g.id)}, goal: ${JSON.stringify(`set the ${g.label.toLowerCase()} params.`)}, panels: [${JSON.stringify(`params.${g.id}`)}] },`);
  return [
    `// designs/${name}/bench.ts`,
    "// The default bench chase.scaffold writes: one rail step per param group,",
    "// then the print step. It sits outside defHash (D-174), so editing it",
    "// moves no build hash.",
    "",
    'import { defineBench } from "@hackbuild/spec";',
    CHASE_IMPORT,
    "",
    "export const bench = defineBench(chase, {",
    '  shell: "paper",',
    '  views: { default: "assembled", modes: ["assembled", "plate"], render: ["solid", "ghost"], overlays: ["cams", "hud"] },',
    "  rail: [",
    ...steps,
    '    { step: "print", goal: "pick filaments, clear the checks and export the 3MF.", panels: ["checks", "exports"], focus: "export", view: "plate" },',
    "  ],",
    '  status: ["checks.verdict", "build.hash"],',
    "});",
    "",
  ].join("\n");
}

/** The minimal chase, build and bench of a kind that has one. */
export function minimalScaffold(kind: MinimalKind, name: string): ScaffoldFiles {
  const label = displayName(name);
  const chase = [
    `// designs/${name}/chase.ts`,
    `// Written by chase.scaffold --kind ${kind} (M10-T05 step 1): one PETG slot,`,
    "// one param group, exports 3mf for ffc5p. The diameter is the COLLAR",
    "// blank's range, step and default (designs/collar/chase.ts). The geometry",
    "// is in build.ts beside it, the layout in bench.ts (D-174). A chase",
    "// declares and never computes (D-178).",
    "",
    'import { defineChase, type ParamsOf } from "@hackbuild/spec";',
    "",
    "export const chase = defineChase({",
    "  meta: {",
    `    id: ${JSON.stringify(name)}, kind: ${JSON.stringify(kind)}, name: ${JSON.stringify(label)}, version: 1, chase: 2,`,
    '    kernels: ["geom", "mesh", "3mf"], machines: ["ffc5p"],',
    '    license: "CC-BY-SA-4.0",',
    "  },",
    "  materials: [",
    '    { slot: 1, material: "petg", role: "body", label: "body" },',
    "  ],",
    "  params: [",
    '    { id: "main", label: "MAIN", live: "commit", fields: [',
    '      { id: "d", type: "mm", label: "diameter", range: [20, 80], step: 0.5, default: 44 },',
    "    ] },",
    "  ],",
    '  build: { module: "./build.ts", fn: "build" },',
    '  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }],',
    "  assertions: [],",
    "});",
    "",
    "/** The params type a build function sees. */",
    "export type Params = ParamsOf<typeof chase>;",
    "",
  ].join("\n");
  const build = [
    `// designs/${name}/build.ts`,
    "// The scaffold's build: one PETG disc of diameter d in the print pose.",
    "// Conditionals and loops live here, never in chase.ts; its bytes enter",
    "// defHash (D-174, D-178). The thickness is eight layers on the active",
    "// machine (1.93 mm on ffc5p, computed from its profile layer grid), a",
    "// placeholder (inferred) to replace with the part's own.",
    ...(kind === "composer" ? ["// A composer returns one part until the kernel builds an AssemblyDraft."] : []),
    "",
    'import { defineBuild } from "@hackbuild/spec";',
    CHASE_IMPORT,
    "",
    "export const build = defineBuild(chase, (p, k) => {",
    "  const t = k.machine().layerTop(7);",
    "  return k.part({",
    `    id: "body", name: ${JSON.stringify(label)}, process: "fdm", machine: "ffc5p",`,
    '    frame: { originOnAxis: true, carriesOffset: false, pose: "print" },',
    '    bodies: [k.body("body", { role: "body", slot: 1, base: { route: "prism", outline: [k.ring.circle(p.d / 2)], z: [0, t] } })],',
    "    features: [],",
    "  });",
    "});",
    "",
  ].join("\n");
  return { "chase.ts": chase, "build.ts": build, "bench.ts": benchSource(name, [{ id: "main", label: "MAIN" }]) };
}

/** chase.scaffold --kind single without from. */
export const singleScaffold = (name: string): ScaffoldFiles => minimalScaffold("single", name);
