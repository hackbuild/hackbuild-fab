// Profile data conformance (M01-T03 step 5, PROFILE.md 14): every material
// and constant row in packages/profile/data passes a zod schema of the
// spec/profile.ts shape. The seed itself is checked by
// tools/test/seed-conformance.test.ts (M-1-T07); the rows ProfileLookup
// serves live in data/, so they are checked here. Load rules (tiers,
// measured needs a coupon) stay in src/provenance.ts and are not repeated.

import { describe, expect, test } from "vitest";
import { z } from "zod";
import { PROCESSES, TIERS, type BendDirection, type ResistivityDirection, type StrainLimit } from "@hackbuild/spec";
import { PROFILE_DATA, PROVENANCE_METHODS } from "../src/index";

const DIRECTIONS = ["along", "across", "through", "bulk"] as const satisfies readonly ResistivityDirection[];
const BENDS = ["inPlane", "acrossLayers"] as const satisfies readonly BendDirection[];
const USES = ["snap", "click", "fatigue"] as const satisfies readonly StrainLimit["use"][];
const DATE_RE = /^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/;

const provenance = z.object({
  tier: z.enum(TIERS),
  method: z.enum(PROVENANCE_METHODS as [string, ...string[]]),
  date: z.string().regex(DATE_RE),
  machine: z.string().min(1).optional(),
  coupon: z.string().min(1).optional(),
  conditions: z.record(z.string(), z.unknown()).optional(),
  source: z.string().trim().min(1),
}).strict();

const positive = z.number().positive();
const resistivityRow = z.object({
  id: z.string().regex(/^[a-z0-9-]+\.[a-z0-9.-]+$/),
  direction: z.enum(DIRECTIONS),
  ohmCm: z.union([positive, z.tuple([positive, positive]).refine(([lo, hi]) => lo <= hi, "range lo above hi")]),
  form: z.enum(["raw-filament", "molded", "printed"]),
  brand: z.string().min(1),
  provenance,
  note: z.string().min(1).optional(),
}).strict();

const strainRow = z.object({
  use: z.enum(USES),
  bend: z.enum(BENDS),
  pct: positive,
  rangePct: z.tuple([positive, positive]).optional(),
  provenance,
}).strict();

const material = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  processes: z.array(z.enum(PROCESSES)).min(1),
  brand: z.string().min(1).optional(),
  densityGcm3: positive.optional(),
  modulusMPa: positive.optional(),
  resistivity: z.array(resistivityRow),
  strain: z.array(strainRow),
  creep: z.enum(["low", "high", "unknown"]),
  frictionStatic: z.record(z.string(), positive).optional(),
  thickness: positive.optional(),
  handling: z.object({
    abrasive: z.boolean(), flexible: z.boolean(), minNozzleMm: positive.optional(), provenance,
  }).strict().optional(),
  provenance,
}).strict().superRefine((m, ctx) => {
  if (m.processes.includes("fdm") && m.handling === undefined) ctx.addIssue({ code: "custom", message: `fdm material ${m.id} needs handling` });
  for (const r of m.resistivity) {
    if (!r.id.startsWith(`${m.id}.`)) ctx.addIssue({ code: "custom", message: `resistivity row ${r.id} not under ${m.id}` });
    if (m.brand !== undefined && r.brand !== m.brand && r.form !== "raw-filament") {
      ctx.addIssue({ code: "custom", message: `row ${r.id} brand ${r.brand} on a ${m.brand} material (C-09)` });
    }
  }
});

const constant = z.object({
  id: z.string().min(1),
  value: z.number().finite(),
  unit: z.string().min(1),
  provenance,
}).strict();

describe("profile data conformance", () => {
  const mats = (PROFILE_DATA.materials as { materials: unknown[] }).materials;
  const cons = [
    ...(PROFILE_DATA.constants as { constants: unknown[] }).constants,
    ...(PROFILE_DATA.opacity as { constants: unknown[] }).constants,
  ];

  test("every material row passes the schema", () => {
    const bad = mats.map((m, i) => ({ i, r: material.safeParse(m) })).filter((x) => !x.r.success)
      .map((x) => `${x.i}: ${x.r.error?.issues.map((s) => `${s.path.join("/")} ${s.message}`).join("; ")}`);
    expect(bad).toEqual([]);
  });

  test("every constant row passes the schema", () => {
    const bad = cons.map((c, i) => ({ i, r: constant.safeParse(c) })).filter((x) => !x.r.success).map((x) => x.i);
    expect(bad).toEqual([]);
  });

  test("resistivity row ids are unique across materials", () => {
    const ids = mats.flatMap((m) => (m as { resistivity: { id: string }[] }).resistivity.map((r) => r.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("the schema refuses a misfiled form and a foreign brand", () => {
    const cpla = structuredClone(mats.find((m) => (m as { id: string }).id === "cpla")) as { resistivity: Record<string, unknown>[] };
    const first = cpla.resistivity[0] as Record<string, unknown>;
    expect(material.safeParse(cpla).success).toBe(true);
    expect(material.safeParse({ ...cpla, resistivity: [{ ...first, form: "print" }] }).success).toBe(false);
    expect(material.safeParse({ ...cpla, resistivity: [{ ...first, brand: "Protopasta" }] }).success).toBe(false);
  });
});
