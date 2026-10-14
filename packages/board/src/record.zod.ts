// Record rules (M08-T02 step 3). zod checks the shape; the rules below check
// what a shape cannot: the outline sits in the board frame (bounding-box
// minimum at the origin, counter-clockwise, first point not repeated), every
// pad key ref.pin is unique, every net member names a pad on that net, every
// pad on a net is a member of it, nets and members are sorted, vias, tracks,
// jumpers and bridges name nets and pads that exist, and recordHash equals
// the hash of the record. Shape and order faults are E_SCHEMA; a name that
// points at nothing is E_REF with didYouMean, both at a JSON pointer.

import { z } from "zod";
import { TIERS, commandError, didYouMean, type BoardRecord, type ErrorCode } from "@hackbuild/spec";
import { padKey } from "./record.js";
import { recordHash } from "./record-hash.js";

/** The board frame origin may sit off zero by this much and still read as zero, mm (the hash grid, D-051). */
const ORIGIN_TOL_MM = 1e-6;

const num = z.number().finite();
const len = num.nonnegative();
const pt = z.tuple([num, num]);
const side = z.enum(["top", "bottom"]);
const copper = z.union([z.enum(["F.Cu", "B.Cu"]), z.templateLiteral(["In", z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]), ".Cu"])]);
const tier = z.enum(TIERS);

/**
 * Names that land in the fab files, held to character sets so no name can
 * break a CSV row, the netlist's whitespace split or the ref.pin key. A ref
 * is a letter then letters, digits or underscores: it is the one name in
 * the BOM and CPL, so it can never start a spreadsheet formula, and it has
 * no dot, since the pad key splits on the first one. A pin and a net are
 * letters, digits and _ + - / . # ~, a net also ?, never whitespace, a
 * comma, a quote, = or @; a leading + or - stays legal for KiCad's "+5V"
 * and a battery's "-" pin, which reach no CSV. Every name in the SPINDLE,
 * SHUNT and LUG files fits (pins "2/2", nets "GND?", "5V_MOD").
 */
export const REF_RE = /^[A-Za-z][A-Za-z0-9_]*$/;
export const PIN_RE = /^[A-Za-z0-9_+\-\/.#~]+$/;
export const NET_RE = /^[A-Za-z0-9_+\-\/.#~?]+$/;
const refName = z.string().regex(REF_RE, "ref must be a letter then letters, digits or underscores");
const pinName = z.string().regex(PIN_RE, "pin must be letters, digits or _ + - / . # ~");
const netName = z.string().regex(NET_RE, "net must be letters, digits or _ + - / . # ~ ?");

const provenance = z.object({
  tier,
  method: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  machine: z.string().optional(),
  coupon: z.string().optional(),
  conditions: z.record(z.string(), z.unknown()).optional(),
  source: z.string().min(1),
}).strict();

const pad = z.object({
  ref: refName, pin: pinName, net: z.union([z.literal(""), netName]), side, through: z.boolean(),
  shape: z.enum(["rect", "oval", "circle", "roundrect"]),
  x: num, y: num, w: len, h: len, rot: num, drill: len.optional(), holeDx: num.optional(),
}).strict();

const part = z.object({
  ref: refName, value: z.string(), catalogId: z.string().min(1), tier, side,
  x: num, y: num, rot: num,
  body: z.object({ w: len, h: len, z: len }).strict(),
  model: z.union([
    z.object({ uri: z.string().min(1), standIn: z.literal(false) }).strict(),
    z.object({ standIn: z.literal(true), reason: z.string().min(1) }).strict(),
  ]).optional(),
  mpn: z.string().optional(),
  note: z.string().optional(),
}).strict();

const ring = z.array(pt).min(3);

export const boardRecordSchema = z.object({
  schema: z.literal(1),
  backend: z.enum(["direct", "tscircuit"]),
  board: z.object({
    outline: z.array(pt).min(3),
    thickness: len,
    copperLayers: z.union([z.literal(2), z.literal(4)]),
    finish: z.enum(["HASL", "ENIG"]).optional(),
  }).strict(),
  parts: z.array(part),
  pads: z.array(pad),
  nets: z.array(z.object({ name: netName, members: z.array(z.string().min(1)), required: z.number().int().nonnegative().optional() }).strict()),
  vias: z.array(z.object({ net: netName, x: num, y: num, drill: len, pad: len, layers: z.tuple([copper, copper]) }).strict()),
  holes: z.array(z.object({ x: num, y: num, drill: len, plated: z.literal(false), role: z.enum(["mount", "tooling"]) }).strict()),
  tracks: z.array(z.object({ net: netName, layer: copper, width: len, pts: z.array(pt).min(2) }).strict()),
  jumpers: z.array(z.object({ ref: refName, pads: z.tuple([z.string(), z.string()]), default: z.enum(["open", "closed"]), joins: z.tuple([z.string(), z.string()]) }).strict()),
  bridges: z.array(z.object({ nets: z.tuple([z.string(), z.string()]), through: z.string().min(1), reason: z.string().min(1) }).strict()),
  reads: z.array(z.object({ catalogId: z.string().min(1), field: z.string().min(1), provenance }).strict()),
  zones: z.array(z.object({ net: netName, layer: copper, outline: ring, clearance: len }).strict()).optional(),
  keepouts: z.array(z.object({
    id: z.string().min(1), kind: z.enum(["antenna", "keepout"]), layers: z.array(copper).min(1), outline: ring,
    forbids: z.array(z.enum(["pour", "track", "via", "copper"])).min(1), module: z.string().min(1).optional(),
  }).strict()).optional(),
  slots: z.array(z.object({ id: z.string().min(1), kind: z.enum(["routed", "thermal"]), x: num, y: num, w: len, h: len, r: len, rot: num }).strict()).optional(),
  silk: z.array(z.object({
    side, text: z.string().min(1), x: num, y: num, size: len, anchor: z.enum(["start", "middle", "end"]), rot: num, mirror: z.boolean(),
    font: z.string().min(1).optional(),
  }).strict()).optional(),
  recordHash: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();

const fail = (code: ErrorCode, path: string, hint: string, extra: { got?: unknown; expected?: string; didYouMean?: readonly string[] } = {}): never => {
  throw commandError({ code, path, hint, record: "board-pcb", ...extra });
};

/** Signed area of a ring, mm2; positive when counter-clockwise with +y up. */
function signedArea(ring: readonly (readonly [number, number])[]): number {
  let a = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const p = ring[i]!;
    const q = ring[(i + 1) % ring.length]!;
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

/** Validate a record; returns it typed or throws E_SCHEMA or E_REF at a JSON pointer. */
export function parseBoardRecord(value: unknown): BoardRecord {
  const r = boardRecordSchema.safeParse(value);
  if (!r.success) {
    const issue = r.error.issues[0]!;
    fail("E_SCHEMA", `/${issue.path.map(String).join("/")}`, `board record: ${issue.message.toLowerCase()}`);
  }
  const rec = value as BoardRecord;

  const ring = rec.board.outline;
  const minX = Math.min(...ring.map((p) => p[0]));
  const minY = Math.min(...ring.map((p) => p[1]));
  if (Math.abs(minX) > ORIGIN_TOL_MM || Math.abs(minY) > ORIGIN_TOL_MM) {
    fail("E_SCHEMA", "/board/outline", "outline bounding-box minimum is off the origin; move the board frame at the adapter", { got: [minX, minY], expected: "[0, 0] within 1e-6 mm" });
  }
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  if (first[0] === last[0] && first[1] === last[1]) fail("E_SCHEMA", `/board/outline/${ring.length - 1}`, "outline repeats its first point; drop the closing point");
  if (signedArea(ring) <= 0) fail("E_SCHEMA", "/board/outline", "outline is clockwise or empty; reverse it to counter-clockwise with +y up", { got: signedArea(ring) });

  const pads = new Map<string, { net: string; i: number }>();
  rec.pads.forEach((p, i) => {
    const key = padKey(p);
    if (pads.has(key)) fail("E_SCHEMA", `/pads/${i}`, `pad ${key} appears twice; every ref.pin is unique`, { got: key });
    pads.set(key, { net: p.net, i });
  });
  const keys = [...pads.keys()];

  const nets = new Map<string, number>();
  rec.nets.forEach((n, i) => {
    if (i > 0 && !(rec.nets[i - 1]!.name < n.name)) fail("E_SCHEMA", `/nets/${i}`, `nets are not sorted by name, or ${n.name} repeats`, { got: n.name });
    nets.set(n.name, i);
    n.members.forEach((m, j) => {
      if (j > 0 && !(n.members[j - 1]! < m)) fail("E_SCHEMA", `/nets/${i}/members/${j}`, `members of ${n.name} are not sorted, or ${m} repeats`, { got: m });
      const p = pads.get(m);
      if (p === undefined) fail("E_REF", `/nets/${i}/members/${j}`, `net ${n.name} names pad ${m}, which the record does not hold`, { got: m, didYouMean: didYouMean(m, keys) });
      else if (p.net !== n.name) fail("E_SCHEMA", `/nets/${i}/members/${j}`, `pad ${m} is on net ${p.net === "" ? "no-connect" : p.net}, listed under ${n.name}`, { got: p.net });
    });
  });
  const netNames = [...nets.keys()];
  const needNet = (name: string, path: string, what: string): void => {
    if (!nets.has(name)) fail("E_REF", path, `${what} names net ${name}, which the record does not hold`, { got: name, didYouMean: didYouMean(name, netNames) });
  };
  rec.pads.forEach((p, i) => {
    if (p.net === "") return;
    needNet(p.net, `/pads/${i}/net`, `pad ${padKey(p)}`);
    if (!rec.nets[nets.get(p.net)!]!.members.includes(padKey(p))) fail("E_SCHEMA", `/pads/${i}`, `pad ${padKey(p)} is on net ${p.net} and missing from its members`);
  });
  rec.vias.forEach((v, i) => needNet(v.net, `/vias/${i}/net`, "via"));
  rec.tracks.forEach((t, i) => needNet(t.net, `/tracks/${i}/net`, "track"));
  rec.jumpers.forEach((jp, i) => {
    jp.pads.forEach((k, j) => {
      if (!pads.has(k)) fail("E_REF", `/jumpers/${i}/pads/${j}`, `jumper ${jp.ref} names pad ${k}, which the record does not hold`, { got: k, didYouMean: didYouMean(k, keys) });
    });
    jp.joins.forEach((n, j) => needNet(n, `/jumpers/${i}/joins/${j}`, `jumper ${jp.ref}`));
  });
  rec.bridges.forEach((b, i) => b.nets.forEach((n, j) => needNet(n, `/bridges/${i}/nets/${j}`, `bridge through ${b.through}`)));
  (rec.zones ?? []).forEach((zn, i) => needNet(zn.net, `/zones/${i}/net`, "zone"));

  const want = recordHash(rec);
  if (rec.recordHash !== want) fail("E_SCHEMA", "/recordHash", "recordHash does not match the record; restamp it with withHash", { got: rec.recordHash, expected: want });
  return rec;
}
