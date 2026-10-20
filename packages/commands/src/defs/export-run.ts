import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { chase, commonFlags, example, inputOf, outputOf, params, preset } from "../shared.js";

export const spec: CommandSpec<"export.run"> = {
  name: "export.run",
  group: "make",
  description: [
    "Write fabrication files after the build and every check pass: 3mf from a chase, dxf, svg-cut or plate 3mf from a nest scene (cli only until M10), gerbers, bom or cpl from a board chase after the provenance gate (E_PROVENANCE, exit 4, on an inferred part row), and kicad or wiring with no gate; a failing build returns its findings and writes nothing.",
    "On the cli it asks once on an interactive terminal and writes only on y; without a terminal it returns E_GATE_UNAVAILABLE with the line a person runs.",
    "There is no flag or environment variable that approves an export.",
    "Do not use it to preview; dryRun runs build, checks and the preflight and writes nothing.",
  ].join(" "),
  input: inputOf<"export.run">(z.object({
    chase: chase.exactOptional(),
    scene: z.string().min(1).exactOptional().describe("cli only until M10: a nest scene, for example slug-sheets or ogee16-r16p-plates (M07-T14)"),
    kind: z.string().min(1).describe("exporter id; hbf registers 3mf, dxf, svg-cut and the board kinds gerbers, bom, cpl, kicad, circuit-json and wiring"),
    machine: z.string().min(1).exactOptional().describe("profile machine id; must match the part's machine"),
    params: params.exactOptional(),
    preset: preset.exactOptional(),
    kerfMode: z.enum(["outline", "none"]).exactOptional().describe("sheet exports only; a 3mf ignores it"),
    dialect: z.enum(["body-centre", "mm-suffix"]).exactOptional().describe("kind cpl only: body-centre (default) or mm-suffix; which assembler wants which is unconfirmed"),
    dryRun: z.boolean().exactOptional().describe("build, check and preflight; write nothing"),
    cursor: z.string().exactOptional(),
  }).strict()),
  output: outputOf<"export.run">(),
  examples: [
    { input: { chase: "reference/keys/flex-pair", kind: "3mf", machine: "ffc5p" }, note: "the flex pair 3mf for the creator 5 pro" },
    { input: { chase: "reference/keys/flex-pair", kind: "3mf", dryRun: true }, note: "preflight only" },
    { input: example<"export.run">({ scene: "slug-sheets", kind: "dxf" }), note: "the ten slug laser sheets as dxf, cli only until M10" },
    { input: { chase: "reference/boards/spindle-r1", kind: "gerbers" }, note: "spindle r1 gerbers; stops at E_PROVENANCE, exit 4, while its hand pads read inferred" },
    { input: { chase: "reference/boards/shunt-art", kind: "cpl", dialect: "mm-suffix", dryRun: true }, note: "the shunt placement file in the mm-suffix dialect, preflight only" },
  ],
  writes: "outside",
  cli: {
    target: "chase",
    flags: {
      ...commonFlags, kind: { field: "kind", kind: "string" }, machine: { field: "machine", kind: "string" },
      "kerf-mode": { field: "kerfMode", kind: "string" }, "dry-run": { field: "dryRun", kind: "switch" }, cursor: { field: "cursor", kind: "string" },
      scene: { field: "scene", kind: "string" }, dialect: { field: "dialect", kind: "string" },
    },
    transport: ["out"],
    targetOptional: true,
  },
};
