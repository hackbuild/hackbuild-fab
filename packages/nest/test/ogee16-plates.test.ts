// M07-T08: the OGEE R16-P printed bill on 256 mm plates. The bill the scene
// derives from its instance rules is held to three sources it does not
// read: build_plate.py's QTY (pinned designs/ogee16/legacy/source/build_plate.py
// lines 5 to 12), the PARTS baked into ogee16-plate.html (read by the
// M07-T01 tool) and the closed forms of D-186. The footprints the imported
// route measures are held to the page's PARTS to 0.01 mm, the page's own
// rounding. The layout is audited here on footprint rectangles with
// arithmetic of this file, and held to the committed legacy record
// (packages/nest/records/ogee16-plates-legacy.json, the page's pack()).

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import { isThrownCommandError, type NestResult, type ProfileLookup } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { audit as meshAudit } from "@hackbuild/mesh";
import { packPlates, plateLayouts, printableParts, type PlateScene } from "../src/plates.js";
import { arraySize, billOf, DRIVES, INSTANCE_RULES, ogee16PlatesScene, type Drive } from "../scenes/ogee16-r16p-plates.js";
// @ts-expect-error the legacy tool is plain JavaScript with no declarations
import { data, packer } from "../../../designs/ogee16/legacy/tools/extract-plate.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const BUILD_PLATE = path.join(ROOT, "designs/ogee16/legacy/source/build_plate.py");
const BUILD_PLATE_SHA256 = "dc3f1772312360fda22e3ef5f89ebc243e714fbf88fc1498e30c6a2bfd0664ed";

interface LegacyDrive { gap4: { plates: number; pieces: number; types: number; labels: string[] }; autoGap: { gap: number; plates: number } }
const record = JSON.parse(readFileSync(path.join(ROOT, "packages/nest/records/ogee16-plates-legacy.json"), "utf8")) as { result: Record<Drive, LegacyDrive> };

interface PagePart { id: string; qty: number; w: number; d: number; h: number }
const page = data() as { PARTS: PagePart[]; GROUPS: unknown; DRIVE: Record<Drive, string[]> };

interface PagePlaced { p: PagePart; x: number; y: number; rot: 0 | 90 }
/** The page's own pack() at its gap 4 on its PARTS (plate_template.html lines 263 to 340, run by the M07-T01 tool). */
function pagePack(drive: Drive): PagePlaced[][] {
  const api = new Function("PARTS", "GROUPS", "DRIVE", packer() as string)(page.PARTS, page.GROUPS, page.DRIVE) as { setDrive: (d: string) => void; pack: () => PagePlaced[][] };
  api.setDrive(drive);
  return api.pack();
}

/** build_plate.py's hand bill, read from the pinned file: COMMON (lines 5 to 8), KNOB_DRIVE (line 11), SERVO_DRIVE (line 12). */
function handBill(): Record<"COMMON" | "KNOB_DRIVE" | "SERVO_DRIVE", [string, number][]> {
  const bytes = readFileSync(BUILD_PLATE);
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(BUILD_PLATE_SHA256);
  const lines = bytes.toString("utf8").split("\n");
  const pairs = (from: number, to: number, marker: string): [string, number][] => {
    expect(lines[from - 1]!.startsWith(marker), `build_plate.py line ${from} starts with ${marker}`).toBe(true);
    return [...lines.slice(from - 1, to).join("\n").matchAll(/\("(\w+)",(\d+)\)/g)].map((m) => [m[1]!, Number(m[2])]);
  };
  return { COMMON: pairs(5, 8, "COMMON = ["), KNOB_DRIVE: pairs(11, 11, "KNOB_DRIVE  = ["), SERVO_DRIVE: pairs(12, 12, "SERVO_DRIVE = [") };
}

const sum = (b: readonly (readonly [string, number])[]): number => b.reduce((n, [, q]) => n + q, 0);

let profile: ProfileLookup;
const scenes = {} as Record<Drive, PlateScene>;
const results = {} as Record<Drive, NestResult>;
beforeAll(() => {
  profile = createProfileLookup(loadProfile());
  for (const d of DRIVES) {
    scenes[d] = ogee16PlatesScene(profile, d);
    results[d] = packPlates(scenes[d], profile);
  }
});

describe("the bill comes from instance counts (computed, D-186)", () => {
  test("N is 4, read from params.scad", () => {
    expect(arraySize()).toBe(4);
  });

  test("closed forms: knobs 12 + 8N + 5N^2 in 20 types, servos 15 + 6N + 5N^2 in 21; 124 and 119 at N 4", () => {
    for (const n of [2, 3, 4, 5, 8]) {
      expect(sum(billOf("knobs", n))).toBe(12 + 8 * n + 5 * n * n);
      expect(sum(billOf("servos", n))).toBe(15 + 6 * n + 5 * n * n);
    }
    expect([sum(billOf("knobs", 4)), billOf("knobs", 4).length]).toEqual([124, 20]);
    expect([sum(billOf("servos", 4)), billOf("servos", 4).length]).toEqual([119, 21]);
  });

  test("equals build_plate.py QTY: COMMON 16 types 107 pieces, KNOB_DRIVE 4 and 17, SERVO_DRIVE 5 and 12", () => {
    const hand = handBill();
    expect([hand.COMMON.length, sum(hand.COMMON)]).toEqual([16, 107]);
    expect([hand.KNOB_DRIVE.length, sum(hand.KNOB_DRIVE)]).toEqual([4, 17]);
    expect([hand.SERVO_DRIVE.length, sum(hand.SERVO_DRIVE)]).toEqual([5, 12]);
    expect(billOf("knobs", 4)).toEqual([...hand.COMMON, ...hand.KNOB_DRIVE]);
    expect(billOf("servos", 4)).toEqual([...hand.COMMON, ...hand.SERVO_DRIVE]);
  });

  test("equals the PARTS and DRIVE baked into ogee16-plate.html", () => {
    for (const d of DRIVES) {
      const off = new Set(DRIVES.filter((k) => k !== d).flatMap((k) => page.DRIVE[k]));
      expect(billOf(d, 4)).toEqual(page.PARTS.filter((p) => !off.has(p.id)).map((p) => [p.id, p.qty]));
    }
    expect(INSTANCE_RULES.filter((r) => r.drive !== "common").map((r) => r.id).sort()).toEqual([...page.DRIVE.knobs, ...page.DRIVE.servos].sort());
  });

  test("every rule cites the instances that give its count", () => {
    for (const r of INSTANCE_RULES) expect(r.where, r.id).toMatch(/line/);
  });
});

describe("footprints through the imported route (computed)", () => {
  test("w, d and h equal the page's PARTS to 0.01 mm, parked on z 0 at the origin", () => {
    const parts = [...scenes.knobs.parts, ...scenes.servos.parts.filter((p) => page.DRIVE.servos.includes(p.id))];
    expect(parts).toHaveLength(25);
    for (const p of parts) {
      const want = page.PARTS.find((q) => q.id === p.id)!;
      expect(Math.abs(p.w - want.w), `${p.id} w`).toBeLessThanOrEqual(0.005 + 1e-9);
      expect(Math.abs(p.d - want.d), `${p.id} d`).toBeLessThanOrEqual(0.005 + 1e-9);
      expect(Math.abs(p.h - want.h), `${p.id} h`).toBeLessThanOrEqual(0.005 + 1e-9);
      let lo = [Infinity, Infinity, Infinity];
      for (let i = 0; i < p.mesh.positions.length; i++) lo[i % 3] = Math.min(lo[i % 3]!, p.mesh.positions[i]!);
      expect(lo).toEqual([0, 0, 0]);
      for (const v of p.mesh.positions) expect(Number.isInteger(v * 1024), `${p.id} on the 1/1024 grid`).toBe(true);
    }
  });

  test("the request's footprint rings are the parts' XY bounds", () => {
    for (const d of DRIVES) {
      for (const it of scenes[d].request.items) {
        const p = scenes[d].parts.find((q) => q.id === it.id)!;
        expect(it.rings).toEqual([[[0, 0], [p.w, 0], [p.w, p.d], [0, p.d]]]);
      }
    }
  });
});

/** Audit of one layout on footprint rectangles: overlaps, out of bounds, minimum gap, types per plate. */
function audit(scene: PlateScene, r: NestResult): { overlaps: number; outOfBounds: number; minGap: number; typesPerPlate: number[]; pieces: number } {
  const [W, H] = scene.request.sheet;
  const m = scene.request.margin;
  const byId = new Map(scene.parts.map((p) => [p.id, p]));
  let overlaps = 0, outOfBounds = 0, minGap = Infinity;
  const typesPerPlate: number[] = [];
  for (let s = 0; s < r.sheets; s++) {
    const rects = r.placements.filter((p) => p.sheet === s).map((p) => {
      const part = byId.get(p.id)!;
      const turned = p.rot === 90 || p.rot === 270;
      return { id: p.id, x: p.at[0], y: p.at[1], w: turned ? part.d : part.w, h: turned ? part.w : part.d };
    });
    typesPerPlate.push(new Set(rects.map((q) => q.id)).size);
    for (const q of rects) if (q.x < m - 1e-9 || q.y < m - 1e-9 || q.x + q.w > W - m + 1e-9 || q.y + q.h > H - m + 1e-9) outOfBounds++;
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const A = rects[i]!, B = rects[j]!;
        const dx = Math.max(B.x - (A.x + A.w), A.x - (B.x + B.w)), dy = Math.max(B.y - (A.y + A.h), A.y - (B.y + B.h));
        if (dx < -1e-9 && dy < -1e-9) overlaps++;
        minGap = Math.min(minGap, Math.max(dx, dy));
      }
    }
  }
  return { overlaps, outOfBounds, minGap, typesPerPlate, pieces: r.placements.length };
}

describe.each(DRIVES)("plates, %s drive (computed)", (drive) => {
  const want = { knobs: { pieces: 124, types: 20, plates: 20 }, servos: { pieces: 119, types: 21, plates: 21 } }[drive];

  test("bed 256 x 256 from machine centauri, margin 10, gap 4, maxrects-bssf by area, one type per plate", () => {
    const req = scenes[drive].request;
    expect(scenes[drive].machine).toBe("centauri");
    expect(req.sheet).toEqual([256, 256]);
    expect([req.margin, req.gap, req.packer, req.order, req.groupBy]).toEqual([10, 4, "maxrects-bssf", "area", "type"]);
  });

  test("pieces, types and plates; 0 overlaps, 0 out of bounds, minimum gap 4.000 mm", () => {
    const r = results[drive];
    const a = audit(scenes[drive], r);
    expect([a.pieces, scenes[drive].request.items.length, r.sheets]).toEqual([want.pieces, want.types, want.plates]);
    expect([a.overlaps, a.outOfBounds]).toEqual([0, 0]);
    expect(a.minGap.toFixed(3)).toBe("4.000");
    expect(a.typesPerPlate.every((n) => n === 1)).toBe(true);
    expect(r.oversize).toEqual([]);
  });

  test("plates and pieces per plate equal the page's pack() record", () => {
    const r = results[drive];
    const labels = Array.from({ length: r.sheets }, (_, s) => {
      const on = r.placements.filter((p) => p.sheet === s);
      return `${on[0]!.id}:${on.length}`;
    });
    expect(labels).toEqual(record.result[drive].gap4.labels);
    expect([r.sheets, r.placements.length]).toEqual([record.result[drive].gap4.plates, record.result[drive].gap4.pieces]);
  });

  test("every placement's plate, part and turn equal the page's pack() at gap 4; positions within its 0.01 mm footprint rounding but one", () => {
    const r = results[drive];
    const legacyPlates = pagePack(drive);
    const moved: string[] = [];
    let k = 0;
    legacyPlates.forEach((pl, s) => {
      for (const it of pl) {
        const p = r.placements[k++]!;
        expect([p.sheet, p.id, p.rot]).toEqual([s, it.p.id, it.rot]);
        if (Math.abs(p.at[0] - it.x) > 0.01 * pl.length || Math.abs(p.at[1] - it.y) > 0.01 * pl.length) moved.push(`${it.p.id} ${p.copy}: ${p.at.join(",")} vs ${it.x},${it.y}`);
      }
    });
    expect(k).toBe(r.placements.length);
    // The measured footprints sit up to 0.005 mm off the page's rounded PARTS, so one tie between free
    // rectangles breaks the other way: the second rail goes to the other free corner of its plate
    // (computed); the audit above holds that layout to 0 overlaps and the 4 mm gap.
    expect(moved.map((m) => m.split(":")[0])).toEqual(["rail 1"]);
    expect(r.placements.filter((p) => p.rot === 90).length).toBe(13);
  });

  test("gap auto keeps the plate count at gap 16 (computed), the record's autoGap", () => {
    const r = packPlates(ogee16PlatesScene(profile, drive, "auto"), profile);
    expect([r.gap, r.sheets]).toEqual([16, want.plates]);
    expect([r.gap, r.sheets]).toEqual([record.result[drive].autoGap.gap, record.result[drive].autoGap.plates]);
    const a = audit(scenes[drive], r);
    expect([a.overlaps, a.outOfBounds]).toEqual([0, 0]);
    expect(a.minGap).toBeGreaterThanOrEqual(16 - 1e-9);
  });

  test("plateLayouts moves each turned part so its footprint lands on the placement", () => {
    const r = results[drive];
    const layouts = plateLayouts(r, scenes[drive].parts);
    expect(layouts).toHaveLength(r.sheets);
    let n = 0;
    for (const lay of layouts) {
      for (const [id, list] of Object.entries(lay.instances)) {
        const part = scenes[drive].parts.find((p) => p.id === id)!;
        const placed = r.placements.filter((p) => p.sheet === lay.plate && p.id === id).sort((a, b) => a.copy - b.copy);
        expect(list).toHaveLength(placed.length);
        list.forEach((inst, k) => {
          // the footprint corners turned about the origin by rotZ, then moved by at
          const c = Math.round(Math.cos((inst.rotZ * Math.PI) / 180)), s = Math.round(Math.sin((inst.rotZ * Math.PI) / 180));
          const corners = [[0, 0], [part.w, 0], [part.w, part.d], [0, part.d]].map(([x, y]) => [c * x! - s * y! + inst.at[0], s * x! + c * y! + inst.at[1]]);
          expect(Math.min(...corners.map((q) => q[0]!))).toBeCloseTo(placed[k]!.at[0], 9);
          expect(Math.min(...corners.map((q) => q[1]!))).toBeCloseTo(placed[k]!.at[1], 9);
          expect(inst.rotZ).toBe(placed[k]!.rot);
          n++;
        });
      }
    }
    expect(n).toBe(want.pieces);
  });
});

describe("printableParts (computed)", () => {
  test("rowbar_asm's 4 zero-area triangles from the weld are rebuilt away; every other part passes through untouched", async () => {
    const parts = [...scenes.knobs.parts, ...scenes.servos.parts.filter((p) => page.DRIVE.servos.includes(p.id))];
    const failing = parts.filter((p) => !meshAudit(p.mesh).ok).map((p) => [p.id, meshAudit(p.mesh).degenerate]);
    expect(failing).toEqual([["rowbar_asm", 4]]);
    const out = await printableParts(parts);
    out.forEach((p, i) => {
      expect(meshAudit(p.mesh).ok, p.id).toBe(true);
      if (p.id !== "rowbar_asm") expect(p, p.id).toBe(parts[i]);
    });
    const before = parts.find((p) => p.id === "rowbar_asm")!, after = out.find((p) => p.id === "rowbar_asm")!;
    expect([after.w, after.d, after.h]).toEqual([before.w, before.d, before.h]);
    expect(after.mesh.triangles.length).toBe(before.mesh.triangles.length);
  });

  test("an open mesh is E_KERNEL", async () => {
    const p = scenes.knobs.parts[0]!;
    const open = { ...p, mesh: { positions: p.mesh.positions, triangles: p.mesh.triangles.slice(3) } };
    await expect(printableParts([open])).rejects.toMatchObject({ hbf: { code: "E_KERNEL" } });
  });
});

describe("refusals", () => {
  const codeOf = (fn: () => unknown): string | undefined => {
    try {
      fn();
    } catch (e) {
      return isThrownCommandError(e) ? e.hbf.code : `not a command error: ${String(e)}`;
    }
    return undefined;
  };

  test("a bed past the envelope, a sheet machine and a part taller than the build volume are E_SCHEMA", () => {
    const s = scenes.knobs;
    expect(codeOf(() => packPlates({ ...s, request: { ...s.request, sheet: [300, 256] } }, profile))).toBe("E_SCHEMA");
    expect(codeOf(() => packPlates({ ...s, machine: "sheet600" }, profile))).toBe("E_SCHEMA");
    expect(codeOf(() => packPlates({ ...s, parts: s.parts.map((p, i) => (i === 0 ? { ...p, h: 300 } : p)) }, profile))).toBe("E_SCHEMA");
    expect(codeOf(() => packPlates({ ...s, parts: s.parts.slice(1) }, profile))).toBe("E_SCHEMA");
  });
});
