// docs/plan/decisions/D-NNN.md fragments and _layout.md gather into the
// committed docs/plan/DECISIONS.md (tools/gen/registries/decisions.mjs, R1-split-01),
// and the generator refuses a fragment whose name, row and heading disagree or
// that no entries range of the layout takes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gather, outputs, render } from "../gen/registries/decisions.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));

const frag = (id, title = `t ${id}`) => `| ${id} | ${title} | decided | Area |\n\n### ${id} ${title}\n\n| field | value |\n|---|---|\n| Status | decided |\n`;

function tempRoot(layout, files) {
  const dir = mkdtempSync(join(tmpdir(), "hbf-decisions-"));
  mkdirSync(join(dir, "docs", "plan", "decisions"), { recursive: true });
  writeFileSync(join(dir, "docs", "plan", "decisions", "_layout.md"), layout);
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, "docs", "plan", "decisions", name), text);
  return dir;
}

const LAYOUT = "# Decisions\n\n## Index\n\n| id | title | status | area |\n|---|---|---|---|\n<!-- decisions:index -->\n\n## One\n\n<!-- decisions:entries D-001 D-001 -->\n\n## Two\n\n<!-- decisions:entries D-002 on -->\n\n## Owner queue\n";

test("gathered fragments equal the committed DECISIONS.md byte for byte", () => {
  const [out] = outputs(root);
  assert.equal(out.path, "docs/plan/DECISIONS.md");
  assert.equal(out.text, readFileSync(join(root, "docs", "plan", "DECISIONS.md"), "utf8"));
});

test("every committed ### D- heading and index row has its own fragment", () => {
  const text = readFileSync(join(root, "docs", "plan", "DECISIONS.md"), "utf8");
  const heads = [...text.matchAll(/^### (D-\d+) /gm)].map((m) => m[1]);
  const index = text.slice(text.indexOf("\n## Index\n"), text.indexOf("\n## ", text.indexOf("\n## Index\n") + 1));
  const rows = [...index.matchAll(/^\| (D-\d+) \|/gm)].map((m) => m[1]);
  const frags = gather(root);
  assert.deepEqual(frags.map((f) => f.id), rows);
  assert.deepEqual(frags.filter((f) => f.entry !== null).map((f) => f.id), heads);
});

test("rows and entries come out in id order under their layout ranges", () => {
  const dir = tempRoot(LAYOUT, { "D-003.md": frag("D-003"), "D-001.md": frag("D-001"), "D-002.md": "| D-002 | never issued | decided | Area |\n" });
  try {
    const t = render(dir);
    assert.match(t, /\| D-001 \|.*\n\| D-002 \|.*\n\| D-003 \|/);
    assert.ok(t.indexOf("## One") < t.indexOf("### D-001") && t.indexOf("### D-001") < t.indexOf("## Two"));
    assert.ok(t.indexOf("## Two") < t.indexOf("### D-003") && t.indexOf("### D-003") < t.indexOf("## Owner queue"));
    assert.ok(!t.includes("### D-002"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a fragment whose row or heading names another id is refused", () => {
  for (const text of [frag("D-009"), "| D-001 | x | decided | A |\n\n### D-009 x\n"]) {
    const dir = tempRoot(LAYOUT, { "D-001.md": text });
    try {
      assert.throws(() => render(dir), /D-001/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("an entry no layout range takes is refused", () => {
  const dir = tempRoot(LAYOUT.replace("<!-- decisions:entries D-002 on -->", "<!-- decisions:entries D-002 D-002 -->"), { "D-001.md": frag("D-001"), "D-005.md": frag("D-005") });
  try {
    assert.throws(() => render(dir), /takes D-005/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
