// Gathers spec/command-io/<name>.ts into the three generated regions of
// spec/commands.ts (R1-split-01): the imports of each command's IO
// interface, the name lists (COMMAND_NAMES, CommandName, COMMAND_GROUP,
// CLI_ONLY) and the CommandIO map. Rule: a new command is a new file
// spec/command-io/<name>.ts whose first line reads
// "// command <name>, group <group>." (", cli only" before the period when it
// has no MCP tool) and which exports one interface <Pascal name>IO with input
// and output; then run npm run registries. Never edit inside a gen: region;
// the rest of spec/commands.ts is hand-written. Files starting _ hold shared
// types and are not commands.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { frozenThenSorted, readFragments } from "../lib.mjs";

export const name = "commands";

// The order COMMAND_NAMES held per group when it was converted; never
// extended. A new command sorts after these within its group.
const FROZEN = {
  query: ["constraints.query", "catalog.find", "catalog.pins", "mech.find", "mech.derive", "arch.find", "knowledge.search", "reference.list"],
  author: ["chase.scaffold", "chase.validate", "chase.diff", "chase.patch", "arch.apply", "init"],
  build: ["part.build", "part.inspect", "part.probe", "asm.solve"],
  prove: ["check.run", "fits.table", "sim.run", "sim.sweep", "circuit.solve", "motion.run", "rules.audit"],
  look: ["view.render", "chase.render", "project.graph"],
  make: ["chase.bake", "nest.pack", "export.run", "draft", "adopt"],
};
const GROUPS = Object.keys(FROZEN);

const HEAD = /^\/\/ command ([a-z][a-z0-9.-]*), group ([a-z]+)(, cli only)?\.$/;

export const ioName = (n) => n.split(/[.-]/).map((w) => w[0].toUpperCase() + w.slice(1)).join("") + "IO";

// The commands in spec/command-io/: { name, group, cliOnly }. Throws on a
// file whose head line, name or interface disagree.
export function gather(root) {
  const dir = join(root, "spec", "command-io");
  if (!existsSync(dir)) throw new Error(`no fragment directory at ${dir}`);
  return readFragments(dir, ".ts").filter((f) => !f.id.startsWith("_")).map((f) => {
    const file = `spec/command-io/${f.id}.ts`;
    const m = HEAD.exec(f.text.split("\n", 1)[0]);
    if (!m) throw new Error(`${file} does not open with "// command ${f.id}, group <group>." (", cli only" before the period for a CLI-only command)`);
    if (m[1] !== f.id) throw new Error(`${file} names the command ${m[1]}; rename the file or the head line`);
    if (!GROUPS.includes(m[2])) throw new Error(`${file} names group ${m[2]}; groups are ${GROUPS.join(", ")}`);
    if (!new RegExp(`^export interface ${ioName(f.id)} \\{$`, "m").test(f.text)) throw new Error(`${file} exports no interface ${ioName(f.id)}`);
    return { name: f.id, group: m[2], cliOnly: m[3] !== undefined };
  });
}

// Comma-joined items wrapped at width, each line indented by two spaces.
function wrap(items, width = 100) {
  const lines = [];
  let cur = "";
  for (const it of items) {
    const next = cur === "" ? `  ${it},` : `${cur} ${it},`;
    if (cur !== "" && next.length > width) {
      lines.push(cur);
      cur = `  ${it},`;
    } else cur = next;
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

function regions(cmds) {
  const byGroup = Object.fromEntries(GROUPS.map((g) => [g, frozenThenSorted(cmds.filter((c) => c.group === g).map((c) => c.name), FROZEN[g])]));
  const order = GROUPS.flatMap((g) => byGroup[g]);
  const imports = [...order].sort().map((n) => `import type { ${ioName(n)} } from "./command-io/${n}.js";`);
  const names = [
    "/**",
    " * The CLI commands by group (D-106), one file each in spec/command-io/.",
    " * asm.declare folds into part.build, and so does import for audit (D-146,",
    " * D-160): part.build with `import` set builds one Part from an STL, GLB,",
    " * STEP, WRL or OpenSCAD file.",
    " */",
    "export const COMMAND_NAMES = [",
    ...GROUPS.flatMap((g) => [`  // ${g} (${byGroup[g].length})`, ...wrap(byGroup[g].map((n) => `"${n}"`))]),
    "] as const;",
    "export type CommandName = (typeof COMMAND_NAMES)[number];",
    "",
    "export const COMMAND_GROUP = {",
    ...GROUPS.flatMap((g) => wrap(byGroup[g].map((n) => `"${n}": "${g}"`))),
    "} as const satisfies Record<CommandName, Group>;",
    "",
    "/** CLI-only commands, marked cli only in their spec/command-io file; project.graph is also served as a resource (hbf://project/graph), the rest wait on the MCP projection decision (engine brief finding F4). */",
    `export const CLI_ONLY = [${order.filter((n) => cmds.find((c) => c.name === n).cliOnly).map((n) => `"${n}"`).join(", ")}] as const satisfies readonly CommandName[];`,
  ];
  const io = order.map((n) => `  "${n}": ${ioName(n)};`);
  return { imports, names, io };
}

// Replace the lines between "// gen:command-io <key>" and "// end gen:command-io <key>".
function fill(text, key, lines) {
  const open = `// gen:command-io ${key} (npm run registries; never edit by hand)`;
  const close = `// end gen:command-io ${key}`;
  const a = text.indexOf(`${open}\n`);
  const b = text.indexOf(`${close}\n`);
  if (a < 0 || b < a || text.indexOf(`${open}\n`, a + 1) >= 0) throw new Error(`spec/commands.ts needs one "${open}" line before one "${close}" line`);
  return text.slice(0, a + open.length + 1) + (lines.length ? lines.join("\n") + "\n" : "") + text.slice(b);
}

export function render(root) {
  const r = regions(gather(root));
  let t = readFileSync(join(root, "spec", "commands.ts"), "utf8");
  t = fill(t, "imports", r.imports);
  t = fill(t, "names", r.names);
  t = fill(t, "io", r.io);
  return t;
}

export function outputs(root) {
  return [{ path: "spec/commands.ts", text: render(root) }];
}
