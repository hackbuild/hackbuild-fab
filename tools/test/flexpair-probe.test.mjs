// The exit B kit for M-S-T10: tools/skeleton/flexpair_probe and
// reference/keys/flex-pair/EXIT-B.md. The probe's pins and timing and the
// checklist's export line, bytes and sha256 are copies of the generated print
// card in reference/keys/flex-pair/README.md, so each is held equal to it here.
// The compile runs the TESTING.md 11 verdict (nonzero exit, or any line
// matching "warning:" case-insensitive, fails) when arduino-cli and the pinned
// core are on this machine, and is skipped as not run otherwise.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const SKETCH = "tools/skeleton/flexpair_probe";
const INO = read(`${SKETCH}/flexpair_probe.ino`);
const README = read("reference/keys/flex-pair/README.md");
const EXIT_B = read("reference/keys/flex-pair/EXIT-B.md");
const CORE = { id: "rp2040:rp2040", version: "6.1.0" };
const FQBN = "rp2040:rp2040:rpipico";

/** The generated print card block of the README. */
function card() {
  const m = README.match(/<!-- generated: print card[^>]*-->([\s\S]*?)<!-- end generated: print card -->/);
  assert.ok(m, "README carries the generated print card");
  return m[1];
}

/** Hookup rows of the card: net, port, pin number, drive us, wait us. */
function cardHookup() {
  const rows = [...card().matchAll(/^\| (K\d+) \| (port\.key\d+) \| rp2040 GP(\d+), charge-release, drive high (\d+) us, wait (\d+) us/gm)];
  assert.ok(rows.length >= 1, "print card lists at least one key hookup row");
  return rows.map((r) => ({ net: r[1], port: r[2], pin: Number(r[3]), driveUs: Number(r[4]), waitUs: Number(r[5]) }));
}

const inoConst = (name) => {
  const m = INO.match(new RegExp(`^static const \\w+ ${name} = (\\d+);`, "m"));
  assert.ok(m, `probe declares ${name}`);
  return Number(m[1]);
};

test("probe key table equals the print card hookup rows", () => {
  const keys = [...INO.matchAll(/^\s*\{ "(K\d+)", (\d+), "(port\.key\d+)" \},/gm)].map((m) => ({ net: m[1], pin: Number(m[2]), port: m[3] }));
  const want = cardHookup().map(({ net, pin, port }) => ({ net, pin, port }));
  assert.deepEqual(keys, want);
});

test("probe charge and wait equal the print card drive and wait", () => {
  for (const row of cardHookup()) {
    assert.equal(inoConst("CHARGE_US"), row.driveUs, `${row.net} drive`);
    assert.equal(inoConst("WAIT_US"), row.waitUs, `${row.net} wait`);
  }
  assert.ok(inoConst("LIMIT_US") > inoConst("WAIT_US"), "the window outlasts the wait, so a release is timed");
  assert.equal(inoConst("SUMMARY_EVERY"), 50, "summary every 50 presses, the M-S-T10 plan budget");
});

test("EXIT-B export line, bytes and sha256 equal the print card", () => {
  const c = card();
  const file = c.match(/^- file: out\/(flex-pair-two\.3mf), (\d+) bytes, sha256 ([0-9a-f]{64})$/m);
  assert.ok(file, "print card has the preset two file line");
  const write = c.match(/`SOURCE_DATE_EPOCH=(\d+) npx --no-install hbf export\.run (\S+) --kind 3mf --preset two --out (\S+)`/);
  assert.ok(write, "print card has the write line");
  const line = `SOURCE_DATE_EPOCH=${write[1]} npx --no-install hbf export.run ${write[2]} --kind 3mf --preset two --machine ffc5p --out ${write[3]}`;
  assert.ok(EXIT_B.includes(line), `EXIT-B carries: ${line}`);
  assert.ok(EXIT_B.includes(`${file[2]} bytes, sha256\n      ${file[3]}`) || EXIT_B.includes(`${file[2]} bytes, sha256 ${file[3]}`),
    `EXIT-B expects ${file[2]} bytes and sha256 ${file[3]}`);
  assert.equal(write[1], "315532800", "epoch pinned");
});

test("EXIT-B wiring names each card pin and the README links EXIT-B", () => {
  for (const row of cardHookup()) {
    assert.match(EXIT_B, new RegExp(`^\\| ${row.net} \\| [^|]+ \\| GP${row.pin} \\|`, "m"), `${row.net} wired to GP${row.pin}`);
  }
  assert.match(EXIT_B, /^\| GND \| [^|]+ \| GND \|/m);
  assert.match(README, /\(EXIT-B\.md\)/);
});

/** Is arduino-cli on PATH with the pinned core installed? Returns a reason when not. */
function toolchain() {
  const r = spawnSync("arduino-cli", ["core", "list", "--json"], { encoding: "utf8" });
  if (r.error || r.status !== 0) return "arduino-cli not on PATH";
  let platforms;
  try {
    platforms = JSON.parse(r.stdout).platforms ?? [];
  } catch {
    return "arduino-cli core list gave no json";
  }
  const p = platforms.find((x) => x.id === CORE.id);
  if (!p) return `core ${CORE.id} not installed`;
  if (p.installed_version !== CORE.version) return `core ${CORE.id} is ${p.installed_version}, pinned ${CORE.version}`;
  return null;
}

test("probe compiles clean on the pinned core (TESTING.md 11)", { timeout: 600_000 }, (t) => {
  const missing = toolchain();
  if (missing) {
    t.skip(`not run: ${missing}`);
    return;
  }
  const r = spawnSync("arduino-cli", ["compile", "--fqbn", FQBN, "--warnings", "all", "--no-color", SKETCH],
    { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  assert.equal(r.status, 0, `compile exit ${r.status}\n${out}`);
  const warnings = out.split("\n").filter((l) => /warning:/i.test(l));
  assert.deepEqual(warnings, [], "no warning lines");
});
