// Every tools/py test, run from `npm test` so a local green check covers
// tools/py too (the CI job `corpus` runs the same command). Whole
// directories, never a file list, and every test_*.py under tools/py must
// sit in one of them. Without uv the suite is skipped and reported as not
// run, never as a pass.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const UV = spawnSync("uv", ["--version"], { encoding: "utf8" }).status === 0;
/** The CI epoch, TESTING.md 6.3: 2026-10-04T00:00:00Z. */
const CI_EPOCH = "1791072000";
const LIMIT_MS = 20 * 60 * 1000;
/** The pytest directories, both here and in the ci.yml corpus step. */
const PATHS = ["tools/py/test", "tools/py/board/test"];
/** Test files run by their own CI step, never by pytest over PATHS: the KEYWAY oracle (M05-T13). */
const OWN_STEP = { "tools/py/copper/test_oracle.py": "uv run --project tools/py tools/py/copper/test_oracle.py" };
const PYTEST = ["uv", "run", "--project", "tools/py", "pytest", "-q", "-rs", ...PATHS];

/** Every test_*.py under tools/py, outside virtualenvs and caches. */
function pyTests(dir = "tools/py") {
  const out = [];
  for (const e of readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name === "__pycache__" || e.name === "node_modules") continue;
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...pyTests(rel));
    else if (/^test_.*\.py$/.test(e.name)) out.push(rel);
  }
  return out;
}

test("every tools/py test file lies under a pytest path or has its own CI step", () => {
  const files = pyTests();
  assert.ok(files.length >= 13, `test files found: ${files.length}`);
  const ungated = files.filter((f) => !OWN_STEP[f] && !PATHS.some((p) => f.startsWith(`${p}/`)));
  assert.deepEqual(ungated, []);
});

test("the CI corpus job runs pytest over the same paths and each own-step file", () => {
  const ci = readFileSync(path.join(ROOT, ".github/workflows/ci.yml"), "utf8");
  assert.ok(ci.includes(PYTEST.join(" ")), `ci.yml runs ${PYTEST.join(" ")}`);
  for (const cmd of Object.values(OWN_STEP)) assert.ok(ci.includes(cmd), `ci.yml runs ${cmd}`);
});

test("every tools/py test passes", { skip: UV ? false : "not run: uv not found" }, async (t) => {
  const child = spawn(PYTEST[0], PYTEST.slice(1), {
    cwd: ROOT,
    env: { ...process.env, SOURCE_DATE_EPOCH: CI_EPOCH },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const out = [];
  child.stdout.on("data", (c) => out.push(c));
  child.stderr.on("data", (c) => out.push(c));
  const stop = () => child.exitCode === null && child.signalCode === null && child.kill("SIGKILL");
  t.after(stop);
  const timer = setTimeout(stop, LIMIT_MS);
  const [code, signal] = await new Promise((resolve) => child.on("close", (c, s) => resolve([c, s])));
  clearTimeout(timer);
  const log = Buffer.concat(out).toString("utf8");
  t.diagnostic(log.trim().split("\n").slice(-12).join("\n"));
  assert.equal(signal, null, `pytest killed by ${signal} after ${LIMIT_MS} ms`);
  assert.equal(code, 0, `pytest exited ${code}\n${log.slice(-4000)}`);
});
