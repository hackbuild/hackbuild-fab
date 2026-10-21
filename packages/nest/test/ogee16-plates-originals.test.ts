// M07-T08: the OGEE R16-P plates scene against the plate page itself. The
// PARTS, GROUPS and DRIVE baked into ogee16-plate.html and the page's own
// pack() (plate_template.html lines 263 to 340) are read from the originals
// of record by designs/ogee16/extract/extract-plate.mjs, through
// tools/test-support/originals-root.ts, so this file runs on the owner
// runner (.github/scripts/owner-files.mjs) and never skips.
// ogee16-plates.test.ts holds the rest on stored inputs.

import { beforeAll, describe, expect, test } from "vitest";
import type { NestResult, ProfileLookup } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { packPlates, type PlateScene } from "../src/plates.js";
import { billOf, DRIVES, INSTANCE_RULES, ogee16PlatesScene, type Drive } from "../scenes/ogee16-r16p-plates.js";
// @ts-expect-error the extraction tool is plain JavaScript with no declarations
import { data, packer } from "../../../designs/ogee16/extract/extract-plate.mjs";

interface PagePart { id: string; qty: number; w: number; d: number; h: number }
const page = data() as { PARTS: PagePart[]; GROUPS: unknown; DRIVE: Record<Drive, string[]> };

interface PagePlaced { p: PagePart; x: number; y: number; rot: 0 | 90 }
/** The page's own pack() at its gap 4 on its PARTS (plate_template.html lines 263 to 340, run by the M07-T01 tool). */
function pagePack(drive: Drive): PagePlaced[][] {
  const api = new Function("PARTS", "GROUPS", "DRIVE", packer() as string)(page.PARTS, page.GROUPS, page.DRIVE) as { setDrive: (d: string) => void; pack: () => PagePlaced[][] };
  api.setDrive(drive);
  return api.pack();
}

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

describe("the bill against the page (computed, D-186)", () => {
  test("equals the PARTS and DRIVE baked into ogee16-plate.html", () => {
    for (const d of DRIVES) {
      const off = new Set(DRIVES.filter((k) => k !== d).flatMap((k) => page.DRIVE[k]));
      expect(billOf(d, 4)).toEqual(page.PARTS.filter((p) => !off.has(p.id)).map((p) => [p.id, p.qty]));
    }
    expect(INSTANCE_RULES.filter((r) => r.drive !== "common").map((r) => r.id).sort()).toEqual([...page.DRIVE.knobs, ...page.DRIVE.servos].sort());
  });
});

describe("footprints through the imported route (computed)", () => {
  test("w, d and h equal the page's PARTS to 0.01 mm", () => {
    const parts = [...scenes.knobs.parts, ...scenes.servos.parts.filter((p) => page.DRIVE.servos.includes(p.id))];
    expect(parts).toHaveLength(25);
    for (const p of parts) {
      const want = page.PARTS.find((q) => q.id === p.id)!;
      expect(Math.abs(p.w - want.w), `${p.id} w`).toBeLessThanOrEqual(0.005 + 1e-9);
      expect(Math.abs(p.d - want.d), `${p.id} d`).toBeLessThanOrEqual(0.005 + 1e-9);
      expect(Math.abs(p.h - want.h), `${p.id} h`).toBeLessThanOrEqual(0.005 + 1e-9);
    }
  });
});

describe.each(DRIVES)("plates, %s drive (computed)", (drive) => {
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
    // (computed); ogee16-plates.test.ts holds that layout to 0 overlaps and the 4 mm gap.
    expect(moved.map((m) => m.split(":")[0])).toEqual(["rail 1"]);
    expect(r.placements.filter((p) => p.rot === 90).length).toBe(13);
  });
});
