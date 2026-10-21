// spec/command-io/<name>.ts fragments fill the generated regions of the
// committed spec/commands.ts (tools/gen/registries/commands.mjs,
// R1-split-01), and the generator refuses a fragment whose head line, file
// name or interface disagree.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gather, ioName, outputs, render } from "../gen/registries/commands.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));

function tempRoot(edit) {
  const dir = mkdtempSync(join(tmpdir(), "hbf-commands-"));
  cpSync(join(root, "spec", "commands.ts"), join(dir, "spec", "commands.ts"));
  cpSync(join(root, "spec", "command-io"), join(dir, "spec", "command-io"), { recursive: true });
  edit(join(dir, "spec", "command-io"));
  return dir;
}

test("the generated regions equal the committed spec/commands.ts byte for byte", () => {
  const [out] = outputs(root);
  assert.equal(out.path, "spec/commands.ts");
  assert.equal(out.text, readFileSync(join(root, "spec", "commands.ts"), "utf8"));
});

test("every CommandName has one fragment and CommandIO maps it to its interface", () => {
  const text = readFileSync(join(root, "spec", "commands.ts"), "utf8");
  const names = [...text.slice(text.indexOf("export const COMMAND_NAMES"), text.indexOf("] as const;", text.indexOf("export const COMMAND_NAMES"))).matchAll(/"([a-z.-]+)"/g)].map((m) => m[1]);
  assert.deepEqual([...names].sort(), gather(root).map((c) => c.name).sort());
  for (const n of names) assert.match(text, new RegExp(`^  "${n.replace(/\./g, "\\.")}": ${ioName(n)};$`, "m"));
});

test("a new fragment joins its group after the frozen order, and cli only joins CLI_ONLY", () => {
  const dir = tempRoot((io) => writeFileSync(join(io, "aa.new.ts"), "// command aa.new, group look, cli only.\n\nexport interface AaNewIO {\n  input: {};\n  output: {};\n}\n"));
  try {
    const t = render(dir);
    assert.match(t, /\/\/ look \(4\)\n  "view\.render", "chase\.render", "project\.graph", "aa\.new",/);
    assert.match(t, /export const CLI_ONLY = \[[^\]]*"aa\.new"/);
    assert.match(t, /^import type \{ AaNewIO \} from "\.\/command-io\/aa\.new";$/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a head line naming another command, an unknown group or a missing interface is refused", () => {
  for (const [file, text, why] of [
    ["x.one.ts", "// command x.two, group look.\n\nexport interface XOneIO {\n}\n", /names the command x\.two/],
    ["x.one.ts", "// command x.one, group paint.\n\nexport interface XOneIO {\n}\n", /names group paint/],
    ["x.one.ts", "// command x.one, group look.\n\nexport interface XoneIO {\n}\n", /exports no interface XOneIO/],
  ]) {
    const dir = tempRoot((io) => writeFileSync(join(io, file), text));
    try {
      assert.throws(() => render(dir), why);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});
