// tools/test/seed-conformance.test.ts
// Seed conformance (D-066, CHECKS.md section 13). The checks, mechanisms,
// archetypes and profile seeds must conform to the spec they seed. Schemas
// are zod objects whose inferred types are tied to spec types with
// `satisfies`, so a spec change the seeds do not follow fails
// `tsc -p tools/tsconfig.json`; vitest strips types and cannot catch it.
// Counts asserted here are as of 2026-10-04; tools/counts.mjs owns the
// published figures (D-010).

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { parse } from "yaml";
import { z } from "zod";
import { KERNEL_IDS, SEVERITIES, TIERS } from "@hackbuild/spec";
import type {
  CheckDef,
  CheckId,
  CheckLevel,
  CheckOrigin,
  KernelId,
  LegalKind,
  Severity,
  Tier,
} from "@hackbuild/spec";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (rel: string): string => readFileSync(join(ROOT, rel), "utf8");

// Type-level equality, so the KernelId link holds in both directions.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const assertType = <T extends true>(): T => true as T;

// Closed vocabularies, written out so the typecheck compares them with spec.
const CHECK_LEVELS = [
  "part", "body", "feature", "assembly", "sheet", "net", "artifact", "source", "page", "project",
] as const satisfies readonly CheckLevel[];
const LEGAL_KINDS = [
  "interval", "set", "multipleOf", "boolean", "exactSet", "none",
] as const satisfies readonly LegalKind[];
const CHECK_STATUSES = ["seed", "entered", "registered", "retired"] as const;
const MILESTONES = [
  "M-1", "M-S", "M00", "M01", "M02", "M03", "M04", "M05", "M06", "M07", "M08",
  "M09", "M10", "M11", "M12", "M13", "M14", "M15", "M16",
] as const;

const kernelId = z.enum(KERNEL_IDS);
assertType<Equal<z.infer<typeof kernelId>, KernelId>>();
assertType<Equal<(typeof CHECK_LEVELS)[number], CheckLevel>>();
assertType<Equal<(typeof LEGAL_KINDS)[number], LegalKind>>();
assertType<Equal<(typeof CHECK_STATUSES)[number], CheckDef["status"]>>();
assertType<Equal<(typeof MILESTONES)[number], NonNullable<CheckDef["pending"]>>>();

const ID_RE = /^CHK-[A-Z0-9]+-[0-9]{2}$/;
const SEMVER_RE = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const DATE_RE = /^20[0-9]{2}-[0-9]{2}(-[0-9]{2})?$/;

const checkId = z.custom<CheckId>((v) => typeof v === "string" && ID_RE.test(v));

const origin = z.object({
  project: z.string().min(1),
  date: z.string().regex(DATE_RE),
  what: z.string().trim().min(1),
});

const checkRow = z.object({
  id: checkId,
  version: z.string().regex(SEMVER_RE),
  title: z.string().trim().min(1),
  appliesTo: z.object({
    level: z.enum(CHECK_LEVELS),
    kinds: z.array(z.string()).exactOptional(),
  }),
  severity: z.enum(SEVERITIES),
  needs: z.array(kernelId),
  legalKind: z.enum(LEGAL_KINDS),
  origin,
  status: z.enum(CHECK_STATUSES),
  pending: z.enum(MILESTONES).exactOptional(),
  constraint: z.string().exactOptional(),
});

// A seed row is data: no run body, `what` inside origin, and a status.
type SeedCheckRow =
  Pick<CheckDef, "id" | "version" | "title" | "severity" | "needs" | "legalKind" | "status" | "pending" | "constraint">
  & { origin: CheckOrigin;
      appliesTo: { level: CheckLevel } };
type CheckRow = z.infer<typeof checkRow>;
const _row = {} as CheckRow satisfies SeedCheckRow;
const _severity = {} as CheckRow["severity"] satisfies Severity;
void _row;
void _severity;

// Candidates (M04-T12, CHECKS.md 9.9) wait for a rule or a limit source: an
// origin and what they wait on, and no id, status or pending milestone.
const candidateRow = z.object({ title: z.string().trim().min(1), origin: origin.extend({ evidence: z.string().nullable() }), waitsOn: z.string().trim().min(1) }).strict();
const checksFile = z.object({ note: z.string().min(1), checks: z.array(checkRow), candidates: z.array(candidateRow).exactOptional() }).strict();

const mechanismRow = z.object({
  id: z.string().min(1),
  family: z.string().min(1),
  provenance: z.string().min(1),
}).passthrough();

const archetypeRow = z.object({
  id: z.string().min(1),
  family: z.string().min(1),
  emits: z.array(z.string().min(1)).min(1),
  provenance: z.string().min(1),
}).passthrough();

const tier = z.enum(TIERS);
assertType<Equal<z.infer<typeof tier>, Tier>>();
const profileRow = z.object({
  id: z.string().min(1),
  provenance: z.object({ tier }).passthrough(),
}).passthrough();
const profileFile = z.object({
  constants: z.array(profileRow),
  fits: z.array(z.object({ class: z.string().min(1) }).passthrough()),
  machines: z.array(profileRow),
  materials: z.array(profileRow),
  note: z.string(),
}).strict();

/** First word of the legal kind column of a CHECKS.md section, by check id. */
function legalKindTable(section: "6" | "9" = "6"): Map<string, string> {
  const md = read("docs/plan/CHECKS.md");
  const next = String(Number(section) + 1);
  const body = md.split(new RegExp(`^## ${section}\\. `, "m"))[1]?.split(new RegExp(`^## ${next}\\. `, "m"))[0] ?? "";
  // Section 6 rows: id, version, title, level, needs, severity, legal. Section 9 rows: id, title, target, legal.
  const col = section === "6" ? 7 : 4;
  const out = new Map<string, string>();
  for (const line of body.split("\n")) {
    if (!/^\| CHK-/.test(line)) continue;
    const cells = line.split("|").map((c) => c.trim());
    const id = cells[1] ?? "";
    const kind = (cells[col] ?? "").split(/[\s,]/)[0] ?? "";
    out.set(id, kind);
  }
  return out;
}

describe("checks seed", () => {
  const raw: unknown = JSON.parse(read("packages/checks/seed/checks.seed.json"));
  const file = checksFile.parse(raw);
  const rows = file.checks;

  test("top-level keys are note, checks and candidates, no hand-typed count", () => {
    expect(Object.keys(raw as object).sort()).toEqual(["candidates", "checks", "note"]);
  });

  // 85 seeded rows of CHECKS.md section 6 plus the draft CHK-NET-29 row of
  // M-S-T06 (CHECKS.md 9.4); every other row was entered at M04-T12 from
  // section 9, and its count is generated (counts.json checks.total).
  const seededIds = new Set([...legalKindTable("6").keys(), "CHK-NET-29"]);
  const seeded = rows.filter((r) => seededIds.has(r.id));
  test("86 seeded rows, 77 block and 9 warn; every other row is entered", () => {
    expect(seeded.length).toBe(86);
    expect(seeded.filter((r) => r.severity === "block").length).toBe(77);
    expect(seeded.filter((r) => r.severity === "warn").length).toBe(9);
    for (const r of rows.filter((x) => !seededIds.has(x.id))) expect(r.status, r.id).toBe("entered");
  });

  test("ids unique and well formed", () => {
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    for (const r of rows) expect(r.id).toMatch(ID_RE);
  });

  test("every origin has a date and a non-empty what", () => {
    expect(rows.filter((r) => DATE_RE.test(r.origin.date)).length).toBe(rows.length);
    expect(rows.filter((r) => r.origin.what.trim() === "").length).toBe(0);
    for (const r of rows) expect(r.origin.project).toContain(r.origin.date);
  });

  test("legalKind on every row equals CHECKS.md section 6, or section 9 for an entered row", () => {
    const table = new Map([...legalKindTable("9")].filter(([id]) => rows.some((r) => r.id === id && r.status === "entered")));
    for (const [id, kind] of legalKindTable("6")) table.set(id, kind);
    expect(rows.filter((r) => LEGAL_KINDS.includes(r.legalKind)).length).toBe(rows.length);
    for (const r of rows) {
      expect(table.has(r.id), `${r.id} missing from CHECKS.md section 6`).toBe(true);
      expect(r.legalKind, r.id).toBe(table.get(r.id));
    }
  });

  test("needs in KernelId and appliesTo.level a CheckTarget variant", () => {
    for (const r of rows) {
      for (const n of r.needs) expect(KERNEL_IDS).toContain(n);
      expect(CHECK_LEVELS).toContain(r.appliesTo.level);
    }
  });

  test("CHK-3MF-04 is seeded at the version its run reports, 2.0.0 (D-070, CHECKS.md 7.1)", () => {
    const four = rows.find((r) => r.id === "CHK-3MF-04");
    const code = read("packages/checks/src/3mf/chk-3mf-04.ts").match(/CHK_3MF_04_VERSION\s*=\s*"([^"]+)"/)?.[1];
    expect(code).toBe("2.0.0");
    expect(four?.version).toBe(code);
  });

  test("CHK-3MF-06 and CHK-3MF-07 carry the D-068 and D-069 titles at 2.0.0", () => {
    const six = rows.find((r) => r.id === "CHK-3MF-06");
    const seven = rows.find((r) => r.id === "CHK-3MF-07");
    expect(six?.version).toBe("2.0.0");
    expect(seven?.version).toBe("2.0.0");
    expect(six?.title).toBe(
      "every component p:path resolves to a model part in the package, other than the root model, and the referenced object id exists in that part",
    );
    expect(seven?.title).toBe(
      "per-filament vectors in project_settings.config have one element per filament and each element has the key's per-slot type; overhang_fan_threshold elements are percent strings matching ^[0-9]+%$, never bare numbers or nil",
    );
  });
});

describe("mechanisms seed", () => {
  const rows = z.array(mechanismRow).parse(parse(read("packages/mechanisms/seed/mechanisms.seed.yaml")));

  test("24 rows with unique ids", () => {
    expect(rows.length).toBe(24);
    expect(new Set(rows.map((r) => r.id)).size).toBe(24);
  });

  test("stubs (no dof, inputs or derived) stay legal and are listed for M06 (D-097)", () => {
    const stubs = rows.filter((r) => !("dof" in r) && !("inputs" in r) && !("derived" in r)).map((r) => r.id);
    expect(stubs).toEqual([
      "wedge-or", "teeter-not", "differential-xor", "tumbler-coded-and", "detent-latch", "snap-flexure",
      "ratchet-pawl", "shift-drum", "spur-pair", "whiffletree-dac", "living-hinge", "finger-joint",
      "tesla-valve", "coanda-gate", "membrane-valve", "pin-free-balance-beam", "slew-ring-joint",
      "aileron-differential",
    ]);
    const bare = rows.filter((r) => Object.keys(r).length === 3).map((r) => r.id);
    expect(bare).toEqual(["wedge-or", "teeter-not", "detent-latch", "ratchet-pawl", "spur-pair"]);
  });
});

describe("archetypes seed", () => {
  const rows = z.array(archetypeRow).parse(parse(read("packages/archetypes/seed/archetypes.seed.yaml")));

  test("29 rows with unique ids, each with id, family, emits and provenance", () => {
    expect(rows.length).toBe(29);
    expect(new Set(rows.map((r) => r.id)).size).toBe(29);
  });
});

describe("profile seed", () => {
  const p = profileFile.parse(JSON.parse(read("packages/profile/seed/profile.seed.json")));

  test("11 materials, 5 machines and 12 constants by unique id", () => {
    expect(p.materials.length).toBe(11);
    expect(p.machines.length).toBe(5);
    expect(p.constants.length).toBe(12);
    for (const list of [p.materials, p.machines, p.constants]) {
      expect(new Set(list.map((r) => r.id)).size).toBe(list.length);
    }
  });

  test("the 28 rows carry a D-083 tier: 12 inferred, 9 vendor, 6 measured, 1 verified", () => {
    const tally: Partial<Record<Tier, number>> = {};
    for (const r of [...p.materials, ...p.machines, ...p.constants]) {
      tally[r.provenance.tier] = (tally[r.provenance.tier] ?? 0) + 1;
    }
    expect(tally).toEqual({ inferred: 12, vendor: 9, measured: 6, verified: 1 });
  });

  test("fit rows without provenance are reported, not failed, until M00 (D-100)", () => {
    expect(p.fits.length).toBe(9);
    const bare = p.fits.filter((f) => !("provenance" in f)).map((f) => f.class);
    if (bare.length > 0) console.info(`profile seed: ${bare.length} fit rows carry no provenance: ${bare.join(", ")}`);
  });
});
