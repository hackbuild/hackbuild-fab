#!/usr/bin/env node
// hbf runs the compiled CLI in core/dist, which is gitignored. A fresh clone
// builds it once with `npx tsc -b` from the repo root.
const cli = new URL("../dist/cli.js", import.meta.url);
try {
  await import(cli.href);
} catch (err) {
  if (err?.code === "ERR_MODULE_NOT_FOUND" && String(err.message).includes(cli.pathname)) {
    process.stderr.write("hbf: core/dist/cli.js is missing; run `npx tsc -b` from the repo root, then retry\n");
    process.exit(1);
  }
  throw err;
}
