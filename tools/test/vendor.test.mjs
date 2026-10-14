// M09-T02 step 9: the packed hackbuild-ui branch is vendored with its sha256,
// and packages/ui installs exactly that file until 0.3.0 is on npm.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const vendor = join(repo, "tools/vendor");

const sums = () =>
  readFileSync(join(vendor, "SHA256SUMS"), "utf8").split("\n").filter(Boolean).map((line) => {
    const m = line.match(/^([0-9a-f]{64}) [ *](.+)$/);
    assert.ok(m, `SHA256SUMS line in shasum format: ${line}`);
    return { sha: m[1], name: m[2] };
  });

test("every vendored file matches its SHA256SUMS line, and every tarball has one", () => {
  const rows = sums();
  for (const { sha, name } of rows) {
    const got = createHash("sha256").update(readFileSync(join(vendor, name))).digest("hex");
    assert.equal(got, sha, `${name} sha256`);
  }
  const listed = new Set(rows.map((r) => r.name));
  for (const f of readdirSync(vendor).filter((n) => n.endsWith(".tgz"))) assert.ok(listed.has(f), `${f} listed in SHA256SUMS`);
});

test("packages/ui depends on a listed hackbuild-ui tarball or an exact 0.3.0", () => {
  const spec = JSON.parse(readFileSync(join(repo, "packages/ui/package.json"), "utf8")).dependencies?.["@virgilvox/hackbuild-ui"];
  assert.ok(spec, "packages/ui names @virgilvox/hackbuild-ui");
  if (!spec.startsWith("file:")) {
    assert.equal(spec, "0.3.0", "an npm dependency is the exact published version");
    return;
  }
  const file = resolve(repo, "packages/ui", spec.slice("file:".length));
  assert.equal(dirname(file), vendor, "the tarball lives in tools/vendor");
  assert.match(basename(file), /^hackbuild-ui-0\.3\.0-(pr\.)?[0-9a-f]{7}\.tgz$/);
  assert.ok(existsSync(file), `${basename(file)} exists`);
  assert.ok(sums().some((r) => r.name === basename(file)), `${basename(file)} has a sha256 line`);
  const lock = JSON.parse(readFileSync(join(repo, "package-lock.json"), "utf8"));
  const entry = lock.packages["node_modules/@virgilvox/hackbuild-ui"];
  assert.ok(entry, "the lock file carries the dependency");
  assert.equal(entry.resolved, `file:tools/vendor/${basename(file)}`);
  assert.equal(entry.version, "0.3.0");
  const integrity = "sha512-" + createHash("sha512").update(readFileSync(file)).digest("base64");
  assert.equal(entry.integrity, integrity, "lock integrity matches the vendored bytes");
});
