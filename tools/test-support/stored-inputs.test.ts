// The stored inputs as committed, with no archive: every file a
// stored-inputs.json lists has its sha256 and size, every file in such a
// folder is listed, and every row names a lineage row with the same source
// and source sha256. A stored file changed by one byte fails here.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { storedFiles, storedFolders, storedRows, takeStored, zipMember } from "./stored-inputs.js";
import { deflateRawSync } from "node:zlib";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const sha = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");
const lineage = JSON.parse(readFileSync(`${ROOT}lineage.json`, "utf8")) as { id: string; source: string; sha256: string; dest: string | null; fixes: string[] }[];
const folders = storedFolders();

test("the stored-input folders are found by their manifest", () => {
  expect(folders).toEqual(expect.arrayContaining(["packages/motion/inputs", "packages/sim/fixtures/davit-stored", "packages/sim/scenes/inputs"]));
});

describe.each(folders)("%s", (folder) => {
  const rows = storedRows(folder);

  test("every file is listed once, and every row has its file", () => {
    expect(rows.map((r) => r.path)).toEqual(storedFiles(folder));
    expect(new Set(rows.map((r) => r.path)).size).toBe(rows.length);
  });

  test.each(rows.map((r) => [r.path, r] as const))("%s has its sha256 and size", (_, r) => {
    const b = readFileSync(`${ROOT}${folder}/${r.path}`);
    expect(b.length).toBe(r.bytes);
    expect(sha(b)).toBe(r.sha256);
  });

  test("each row names a lineage row with its source and source sha256 that records the stored path", () => {
    for (const r of rows) {
      const row = lineage.find((l) => l.id === r.lineage);
      expect(row, `${r.path}: lineage row ${r.lineage}`).toBeDefined();
      expect([row!.source, row!.sha256]).toEqual([r.source, r.sourceSha256]);
      const at = `${folder}/${r.path}`;
      expect(row!.dest === at || row!.fixes.some((f) => f.includes(at)), `${r.lineage} names ${at}`).toBe(true);
    }
  });
});

test("takeStored reads a deflated and a stored zip member and a line range", () => {
  const body = Buffer.from("solid a\nendsolid a\n");
  const zip = (method: 0 | 8): Buffer => {
    const name = Buffer.from("stl/a.stl");
    const data = method === 8 ? deflateRawSync(body) : body;
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(method, 8); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(body.length, 22); local.writeUInt16LE(name.length, 26);
    const cen = Buffer.alloc(46); cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(method, 10); cen.writeUInt32LE(data.length, 20); cen.writeUInt32LE(body.length, 24); cen.writeUInt16LE(name.length, 28); cen.writeUInt32LE(0, 42);
    const cdAt = local.length + name.length + data.length;
    const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10); end.writeUInt32LE(cen.length + name.length, 12); end.writeUInt32LE(cdAt, 16);
    return Buffer.concat([local, name, data, cen, name, end]);
  };
  expect(zipMember(zip(8), "stl/a.stl").equals(body)).toBe(true);
  expect(zipMember(zip(0), "stl/a.stl").equals(body)).toBe(true);
  expect(() => zipMember(zip(8), "stl/b.stl")).toThrow(/no member stl\/b.stl/);
  const row = { path: "x", sha256: "", bytes: 0, source: "s", sourceSha256: "", lineage: "l" };
  expect(takeStored({ ...row, lines: [2, 3] }, Buffer.from("a\nb\nc\nd\n")).toString()).toBe("b\nc\n");
});
