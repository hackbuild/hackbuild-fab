// Each stored input taken again from its archive source: the source still
// has the sha256 its row and lineage row record, and the member or line
// range the row names equals the committed file byte for byte. Reads the
// owner's archives through localSource, so it runs on the owner runner
// (.github/scripts/owner-files.mjs) and never skips.

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
// Imported by its repo path so .github/scripts/owner-files.mjs routes this file to the owner runner.
import { localSource } from "../../tools/test-support/originals-root.js";
import { storedFolders, storedRows, takeStored } from "./stored-inputs.js";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const sha = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");

describe.each(storedFolders())("%s", (folder) => {
  test.each(storedRows(folder).map((r) => [r.path, r] as const))("%s is taken from its source", (_, r) => {
    const source = readFileSync(localSource(r.source));
    expect(sha(source), `${r.source} sha256`).toBe(r.sourceSha256);
    expect(takeStored(r, source).equals(readFileSync(`${ROOT}${folder}/${r.path}`)), `${r.path} equals its take from ${r.source}`).toBe(true);
  });
});
