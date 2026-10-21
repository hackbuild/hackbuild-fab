// Every M03, M05, M06, M07 and M08 Exit row command is run by a CI job
// (MILESTONES.md 3.3, M03-T14, M05-T17, M06-T13, M07-T15, M08). The commands are read from the Exit table of each card,
// so a row added to a card without a CI step fails here. A row is proven when
// ci.yml runs its script or hbf command, or when a tools/test file the unit
// job runs runs that script as a process (an import or a mention does not
// count, since a test that imports helpers can skip the run the row names).
// A bare job name (CI `dxf-audit`) is proven by that job in ci.yml. A
// workspace row (`npm test -w packages/nest -- connect`) is proven by an
// `npx vitest run` line of ci.yml whose filter holds that workspace, since CI
// runs the workspace vitest files once from the root config (exit-a, parity;
// R1-rails-ci-hooks-03), and its filter must match a test file of that
// workspace, since vitest fails a filter that matches none.
// Rows CI cannot run carry their reason in NOT_IN_CI; an exemption that no
// longer names an Exit row fails.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { planCard, planSkip } from "../test-support/plan-root.mjs";

const root = join(import.meta.dirname, "..", "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const CI = read(".github/workflows/ci.yml");
const JOBS = Object.keys(parse(CI).jobs);
// The cards come from the plan archive (tools/test-support/plan-root.mjs); a test that
// reads them skips as not run on a runner without it.
const SKIP = planSkip();
const CARDS = [
  "M03-inlay.md",
  "M05-circuit-copper.md",
  "M06-canons.md",
  "M07-motion-nest.md",
  "M08-board-catalog.md",
];

/** The script or hbf command a CI step must name for each exit command form. */
export function anchor(cmd) {
  const ws = cmd.match(/^npm test -w (\S+)(?: -- (\S+))?/);
  if (ws) return { kind: "workspace", key: ws[1], workspace: ws[1], filter: ws[2] };
  if (/^[a-z][a-z0-9-]*$/.test(cmd)) return { kind: "job", key: cmd };
  if (cmd === "npm ci") return { kind: "literal", key: cmd };
  // `grep -rn "<text>" <paths>` printing nothing: CI must run the same grep
  if (/^grep /.test(cmd)) return { kind: "literal", key: cmd };
  // `hbf parity reference/...` per row: every reference, which only the parity loop runs
  if (/hbf parity reference\/\.\.\.$/.test(cmd)) return { kind: "parity-all", key: "reference/..." };
  const parity = cmd.match(/hbf parity (reference\/\S+)/);
  if (parity) return { kind: "parity-loop", key: parity[1] };
  const hbf = cmd.match(/hbf ([a-z.]+ (?:--artifact )?\S+)/);
  if (hbf) return { kind: "literal", key: `hbf ${hbf[1]}` };
  const script = cmd.match(/(?:^|\s)((?:tools|designs|packages|core)\/[\w./-]+\.(?:py|mjs|ts|sh))/);
  if (script) return { kind: "literal", key: script[1] };
  return null;
}

/** Backticked commands in the last column of the card's Exit table. */
export function exitCommands(md) {
  const at = md.indexOf("\n## Exit");
  assert.ok(at >= 0, "Exit section present");
  const end = md.indexOf("\n## ", at + 1);
  const rows = md.slice(at, end < 0 ? undefined : end).split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| exit number") && !l.startsWith("|---"));
  assert.ok(rows.length > 0, "Exit table rows present");
  const out = [];
  for (const row of rows) {
    const cells = row.split(" | ");
    const last = cells[cells.length - 1];
    let ws = null;
    let prev = null;
    for (const m of last.matchAll(/`([^`]+)`/g)) {
      let cmd = m[1];
      // `hbf parity reference/mechanisms/geneva-3`, `.../detent-strip`: the elided head is the previous command's
      const tail = cmd.match(/^\.\.\.\/([\w-]+)$/);
      if (tail && prev) cmd = prev.replace(/[\w-]+$/, tail[1]);
      prev = cmd;
      // `hbf parity reference/copper/<name>`: one row per board folder under that area, `_` folders being shared harness and inputs (M05-T15)
      const each = cmd.match(/^(.*hbf parity reference\/[a-z-]+)\/<name>$/);
      if (each) {
        const area = each[1].slice(each[1].indexOf("reference/"));
        for (const d of readdirSync(join(root, area), { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith("_"))) out.push(`${each[1]}/${d.name}`);
        continue;
      }
      const head = cmd.match(/^(npm test -w \S+) -- /);
      if (head) ws = head[1];
      // `npm test -w packages/motion -- ogee-kin`, `derrick-fk`: a bare word after a workspace command is its next filter
      if (ws !== null && /^[a-z][a-z0-9-]*$/.test(cmd) && !last.includes(`CI \`${cmd}\``)) out.push(`${ws} -- ${cmd}`);
      else out.push(cmd);
    }
  }
  return out;
}

const LEGACY_ZIP = "the shipped SPINDLE R1 gerber zip it compares against lives in fab-work-directory outside the repo (lineage spindle.pcb/r1)";
const D250 = "T10 and T11 wait on D-250 (Node 24); the Exit row says not run at the M08 close";
const NOT_IN_CI = {
  "M03-inlay.md": {
    "tools/py/harness/collar_parity.py":
      "reads the COLLAR fonts, the seed mark and both COLLAR 3MFs from lineage sources outside the repo (fab-work-directory, fab-knowledge); M03-T14 card defect",
  },
  "M08-board-catalog.md": {
    "tools/py/board/reparse.py": `--legacy <zip>: ${LEGACY_ZIP}`,
    "hbf check.run --artifact <kicad_pcb>": "<kicad_pcb> is the new or the legacy SPINDLE R1 file; the legacy one lives outside the repo and needs record.json beside it (M08-T08)",
    "hbf part.build reference/boards/lug-hat": D250,
    "hbf check.run --artifact tools/corpus/board/known-bad/auger.circuit.json": D250,
    "npm test -w packages/board -- circuit-json": `${D250}; packages/board has no circuit-json test yet`,
  },
  "M06-canons.md": {
    "reference/mechanisms/geneva-3": "the folder does not exist; M06-T04 defers the KNURL Geneva and detent references to M10-T08 (raster-traced bodies), m06-report Exit row",
    "reference/mechanisms/detent-strip": "the folder does not exist; M06-T04 defers it to M10-T08 with geneva-3",
  },
  "M07-motion-nest.md": {
    "tools/sparrow/build.sh":
      "clones sparrow at its pinned commit over the network and builds it with cargo and the wasm32 target, then runs 60 s strips; an evaluation, never a dependency (D-137). tools/test/sparrow-eval.test.mjs, which the unit job runs, holds packages/nest/records/sparrow-eval.json and the verdict to each other; M07-T15 card defect",
  },
};

const unitTests = readdirSync(join(root, "tools/test")).filter((f) => f.endsWith(".test.mjs")).map((f) => read(`tools/test/${f}`));
/** A tools/test file joins the script path and hands it to spawnSync or execFileSync. */
const spawned = (key) => unitTests.some((t) => t.includes(`'${key}'`) && /(spawnSync|execFileSync)\(process\.execPath, \[script\b/.test(t));
const unitRunsToolTests = CI.includes("node --test tools/test/*.test.mjs");
const parityLoop = CI.includes("for d in reference/*/*/") && CI.includes('npx --no-install hbf parity "${d%/}"');
/** The loop also runs a reference whose chase is a surface chase (core/src/commands/surface.ts). */
const parityLoopSurface = parityLoop && CI.includes('test -f "${d}chase.surface.ts"');
/** Directory arguments of every `npx vitest run` line in ci.yml, the `$(...)` excludes left out. */
const vitestDirs = [...CI.matchAll(/npx vitest run ([^\n$]+)/g)].flatMap((m) => m[1].trim().split(/\s+/));
/** A root vitest run whose directory argument is the workspace or holds it. */
const vitestRunsWorkspace = (ws) => vitestDirs.some((d) => ws === d.replace(/\/$/, "") || ws.startsWith(`${d.replace(/\/$/, "")}/`));
const has = (p) => existsSync(join(root, p));

/** Test files of a workspace whose name contains the filter, as vitest matches a filter. */
const filterMatches = (ws, filter) => readdirSync(join(root, ws, "test"), { recursive: true }).filter((f) => /\.test\.ts$/.test(f) && f.includes(filter));

function proven(a) {
  if (a.kind === "workspace") return vitestRunsWorkspace(a.workspace) && (a.filter === undefined || filterMatches(a.workspace, a.filter).length > 0);
  if (a.kind === "job") return JOBS.includes(a.key);
  if (a.kind === "parity-all") return parityLoop;
  if (a.kind === "parity-loop") return parityLoop && (has(`${a.key}/chase.ts`) || (parityLoopSurface && has(`${a.key}/chase.surface.ts`)));
  // a test file is also run by an `npx vitest run <dir>` line whose dir holds it
  const inVitestDir = a.key.endsWith(".test.ts") && vitestDirs.some((d) => a.key.startsWith(`${d.replace(/\/$/, "")}/`));
  return CI.includes(a.key) || inVitestDir || (unitRunsToolTests && spawned(a.key));
}

for (const card of CARDS) {
  const id = card.match(/(M\d+)-/)[1];
  const exempt = NOT_IN_CI[card] ?? {};

  test(`every ${id} Exit row command is run by a CI job or carries a reason`, { skip: SKIP }, () => {
    const cmds = exitCommands(planCard(card));
    assert.ok(cmds.length >= 5, "Exit commands read");
    const missing = [];
    for (const cmd of cmds) {
      const a = anchor(cmd);
      assert.ok(a, `no anchor for exit command ${cmd}`);
      // a workspace row's anchor key is shared by every row of that workspace, so its exemption names the command
      if (exempt[a.key] || exempt[cmd]) continue;
      if (!proven(a)) missing.push(cmd);
    }
    assert.deepEqual(missing, []);
  });

  test(`each ${id} CI exemption names a current Exit row and is absent from ci.yml`, { skip: SKIP }, () => {
    const cmds = exitCommands(planCard(card));
    const keys = [...cmds, ...cmds.map((c) => anchor(c)?.key)];
    for (const key of Object.keys(exempt)) {
      assert.ok(keys.includes(key), `${key} is an Exit row command`);
      assert.ok(!CI.includes(key), `${key} runs in ci.yml, so the exemption is stale`);
    }
  });
}

test("the M07 dxf-audit job audits the nest outputs and the corpus manifest (M07-T15 step 1)", () => {
  const job = parse(CI).jobs["dxf-audit"];
  assert.ok(job, "ci.yml has a dxf-audit job");
  const runs = job.steps.map((st) => st.run ?? "").join("\n");
  for (const want of [
    "tools/py/audit_dxf.py packages/nest/test/out",
    "tools/py/audit_dxf.py tools/corpus/dxf --expect tools/corpus/dxf/MANIFEST.json",
    "hbf export.run --scene slug-sheets --kind dxf",
  ]) assert.ok(runs.includes(want), `dxf-audit runs ${want}`);
});

test("anchor reads each command form", () => {
  assert.deepEqual(anchor("npm test -w packages/inlay -- intake"), { kind: "workspace", key: "packages/inlay", workspace: "packages/inlay", filter: "intake" });
  assert.deepEqual(anchor("dxf-audit"), { kind: "job", key: "dxf-audit" });
  assert.deepEqual(anchor("bash tools/sparrow/build.sh"), { kind: "literal", key: "tools/sparrow/build.sh" });
  assert.deepEqual(anchor("npx --no-install hbf parity reference/cosmetic/coin-inlay"), { kind: "parity-loop", key: "reference/cosmetic/coin-inlay" });
  assert.deepEqual(anchor("npx --no-install hbf check.run reference/cosmetic/coin-inlay --json"), { kind: "literal", key: "hbf check.run reference/cosmetic/coin-inlay" });
  assert.deepEqual(anchor("uv run --project tools/py tools/py/harness/sprue_parity.py ..."), { kind: "literal", key: "tools/py/harness/sprue_parity.py" });
  assert.deepEqual(anchor("npx vitest run designs/collar/test/nfc-pause.test.ts"), { kind: "literal", key: "designs/collar/test/nfc-pause.test.ts" });
  assert.equal(anchor("CI and the PR checkbox"), null);
});

test("the M05 copper parity rows expand to every reference/copper board and CI runs their surface chases", { skip: SKIP }, () => {
  const cmds = exitCommands(planCard("M05-circuit-copper.md")).filter((c) => c.includes("reference/copper/"));
  const boards = readdirSync(join(root, "reference/copper"), { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith("_")).map((e) => e.name);
  assert.ok(boards.length >= 8, `copper boards: ${boards.length}`);
  for (const b of boards) assert.ok(cmds.includes(`npx --no-install hbf parity reference/copper/${b}`), `Exit row runs ${b}`);
  assert.ok(!cmds.some((c) => c.includes("<name>")), "no placeholder left");
  assert.ok(parityLoopSurface, "ci.yml parity loop admits chase.surface.ts");
});

test("anchor reads the M06 and M08 command forms", () => {
  assert.deepEqual(anchor("npx --no-install hbf parity reference/..."), { kind: "parity-all", key: "reference/..." });
  assert.deepEqual(anchor("npm ci"), { kind: "literal", key: "npm ci" });
  assert.deepEqual(anchor("npx --no-install hbf check.run --artifact tools/corpus/board/known-bad/auger.circuit.json --json"), { kind: "literal", key: "hbf check.run --artifact tools/corpus/board/known-bad/auger.circuit.json" });
  assert.deepEqual(anchor("npx vitest run core/test/wiring-export.test.ts"), { kind: "literal", key: "core/test/wiring-export.test.ts" });
  const md = "\n## Exit\n\n| exit number | card | command |\n|---|---|---|\n| x | T1 | `npx --no-install hbf parity reference/mechanisms/geneva-3`, `.../detent-strip` |\n";
  assert.deepEqual(exitCommands(md), ["npx --no-install hbf parity reference/mechanisms/geneva-3", "npx --no-install hbf parity reference/mechanisms/detent-strip"]);
});

test("the parity job sets up uv before the reference loop, since a board reference spawns uv (core/src/board.ts)", () => {
  const boards = readdirSync(join(root, "reference/boards"), { withFileTypes: true }).filter((e) => e.isDirectory() && has(`reference/boards/${e.name}/chase.ts`));
  assert.ok(boards.length > 0, "a board reference holds chase.ts");
  const steps = parse(CI).jobs.parity.steps;
  const loop = steps.findIndex((st) => (st.run ?? "").includes("for d in reference/*/*/"));
  const uv = steps.findIndex((st) => (st.uses ?? "").startsWith("astral-sh/setup-uv@"));
  assert.ok(loop >= 0, "parity job runs the reference loop");
  assert.ok(uv >= 0 && uv < loop, `setup-uv is step ${uv}, the reference loop step ${loop}`);
});
