// Stored (uncompressed) zips for legacy files whose bytes carry a character
// the voice law bans (an emoji entity, a dash in a third-party comment).
// RULES.md allows no such character in a repo file and lint-voice can never
// allow one, so the file is kept byte identical as a zip member, the way
// boss-src.zip keeps build.py (D-142); an archive under a legacy-archive
// allow row is scanned and its findings are warnings. The writer is
// deterministic: members in the order given, each with the UTC DOS time of its
// mtime, no extra fields, so the same members give the same zip.
// Usage: node tools/legacy/stored-zip.mjs <out.zip> <name>=<file>...
import { crc32 } from "node:zlib";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** DOS date and time of a Date in UTC, so the bytes do not depend on the time zone. */
function dos(d) {
  const time = (d.getUTCHours() << 11) | (d.getUTCMinutes() << 5) | (d.getUTCSeconds() >> 1);
  const date = ((d.getUTCFullYear() - 1980) << 9) | ((d.getUTCMonth() + 1) << 5) | d.getUTCDate();
  return { time, date };
}

/** A stored zip of the entries, each { name, data: Uint8Array, mtime: Date }. */
export function writeStored(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name, "utf8");
    const data = Buffer.from(e.data);
    const { time, date } = dos(e.mtime);
    const crc = crc32(data) >>> 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(10, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(10, 4);
    central.writeUInt16LE(10, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, data);
    centrals.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(MARK.length, 20);
  return Buffer.concat([...locals, cd, end, MARK]);
}

/** The archive comment every zip this writer makes carries, so a test can find them. */
export const MARK = Buffer.from("written by tools/legacy/stored-zip.mjs", "utf8");

/** True when the zip's comment is MARK. */
export const isStored = (buf) => Buffer.from(buf).subarray(-MARK.length).equals(MARK);

/** Member name to bytes of a stored zip; refuses a compressed member or a CRC that does not match. */
export function readStored(buf) {
  return new Map(storedEntries(buf).map((e) => [e.name, e.data]));
}

/** The entries of a stored zip in central directory order, each { name, data, mtime }, so writeStored can rebuild it. */
export function storedEntries(buf) {
  const b = Buffer.from(buf);
  const at = b.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (at < 0) throw new Error("not a zip: no end of central directory");
  const count = b.readUInt16LE(at + 10);
  let p = b.readUInt32LE(at + 16);
  const out = [];
  for (let i = 0; i < count; i++) {
    if (b.readUInt32LE(p) !== 0x02014b50) throw new Error(`central entry ${i} has no signature`);
    const method = b.readUInt16LE(p + 10);
    const time = b.readUInt16LE(p + 12);
    const date = b.readUInt16LE(p + 14);
    const crc = b.readUInt32LE(p + 16);
    const size = b.readUInt32LE(p + 20);
    const nameLen = b.readUInt16LE(p + 28);
    const extraLen = b.readUInt16LE(p + 30);
    const commentLen = b.readUInt16LE(p + 32);
    const local = b.readUInt32LE(p + 42);
    const name = b.subarray(p + 46, p + 46 + nameLen).toString("utf8");
    if (method !== 0) throw new Error(`${name} is compressed (method ${method}); only stored members are read`);
    const start = local + 30 + b.readUInt16LE(local + 26) + b.readUInt16LE(local + 28);
    const data = b.subarray(start, start + size);
    if ((crc32(data) >>> 0) !== crc) throw new Error(`${name} fails its CRC`);
    const mtime = new Date(Date.UTC((date >> 9) + 1980, ((date >> 5) & 15) - 1, date & 31, time >> 11, (time >> 5) & 63, (time & 31) * 2));
    out.push({ name, data: new Uint8Array(data), mtime });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [outFile, ...pairs] = process.argv.slice(2);
  if (!outFile || pairs.length === 0) {
    console.error("usage: node tools/legacy/stored-zip.mjs <out.zip> <name>=<file>...");
    process.exit(2);
  }
  const entries = pairs.map((pair) => {
    const i = pair.indexOf("=");
    const file = pair.slice(i + 1);
    return { name: pair.slice(0, i), data: readFileSync(file), mtime: statSync(file).mtime };
  });
  writeFileSync(outFile, writeStored(entries));
}
