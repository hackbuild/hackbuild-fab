// designs/toggle: the host plan, the routed build and the drive contact.
// Expected values come from sources this design does not write: the plan
// views and default routes the copper port recorded from the original
// (packages/copper test/fixtures/toggle-presets, written by
// tools/legacy/toggle/dump-route.cjs from originals/toggle, and
// test/golden/toggle-presets-default.json), the archetype's own solver
// for the contact, and the committed metrics golden test/golden/
// solo4-metrics.json, rewritten only with HBF_ACCEPT_METRICS=1. build.ts
// runs in process through the pipeline's Author (a design test does not
// reach core); the meshed build, its checks and the parity goldens are hbf
// part.build and hbf parity. Every number is computed; nothing was printed.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import type { BuildWarning, Metric, PartDraft } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { makeAuthor, resolveParams } from "@hackbuild/pipeline";
import { TOGGLE_NAMES, toggleContact, toggleHost, toggleLayer, toggleParams, toggleSolve } from "@hackbuild/archetypes";
import { build, contact } from "../build";
import { chase, type ToggleParams } from "../chase";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const read = <T>(rel: string): T => JSON.parse(readFileSync(path.join(ROOT, rel), "utf8")) as T;
const PATCH = { solo4: {}, solo8: { dirs: 8 }, blocks4: { base: "blocks", dirs: 4 }, blocks8: { base: "blocks", dirs: 8 } } as const;
interface PlanFixture { plan: Record<string, unknown> & { terms: { x: number; y: number; r: number; label: string }[] } }
interface DefaultRoute { preset: string; layers: number; phiA: number; map: number[] }
const routes = read<{ presets: DefaultRoute[] }>("packages/copper/test/golden/toggle-presets-default.json").presets;
const profile = createProfileLookup(loadProfile());
const GOLDEN = path.join(HERE, "golden", "solo4-metrics.json");

describe("the host plan is the original's layoutXY", () => {
  test.each(Object.keys(PATCH) as (keyof typeof PATCH)[])("%s: every plan field and terminal label", (key) => {
    const fx = read<PlanFixture>(`packages/copper/test/fixtures/toggle-presets/${key}.json`);
    const host = toggleHost(toggleParams.parse(PATCH[key]), profile);
    const { terms, ...rest } = fx.plan;
    expect(JSON.parse(JSON.stringify(host.plan))).toEqual({ ...rest, terms: terms.map(({ x, y, r }) => ({ x, y, r })) });
    expect(host.terms.map((t) => t.label)).toEqual(terms.map((t) => t.label));
  });
});

const warnings: BuildWarning[] = [];
let draft: PartDraft;
const metric = (id: string): Metric["value"] | undefined => draft.metrics?.find((m) => m.id === id)?.value;
beforeAll(async () => {
  const params = resolveParams(chase, undefined, "solo4") as unknown as ToggleParams;
  draft = (await build(params, makeAuthor(chase, profile, warnings))) as PartDraft;
});

describe("solo4 at the chase defaults", () => {
  const route = routes.find((r) => r.preset === "solo4") as DefaultRoute;
  const names = [...TOGGLE_NAMES[4], "COM"];

  test("the route is the copper default route of solo4: layers, COM gap and the net on each pin", () => {
    expect(metric("route.layers")).toBe(route.layers);
    expect(metric("route.comDeg")).toBeCloseTo(route.phiA * 180 / Math.PI, 6);
    expect(names.map((_, q) => metric(`pinout.P${(route.map[q] as number) + 1}`))).toEqual(names);
  });

  test("one routed lead per net on the top trace layer, one cup per pin with its bore pocket", () => {
    for (const n of names) {
      const leads = draft.features.filter((f) => f.kind === "conductor" && f.id.startsWith(`conductor.${n}.`));
      expect(leads.map((f) => f.kind === "conductor" && f.net), n).toEqual([n]);
    }
    expect(draft.bodies.filter((b) => b.id.startsWith("cup")).map((b) => [b.id, b.material, b.role])).toEqual(
      [1, 2, 3, 4, 5].map((i) => [`cup${i}`, "cpla", "conductor"]));
    expect(draft.features.filter((f) => f.kind === "pocket" && f.id.startsWith("pocket.cup")).length).toBe(5);
    expect(warnings.map((w) => w.code).sort()).toEqual(["FIT", "TEXTURE"]);
  });

  test("the drive contact: a hold closes the pads the solver lists at the stop, below the contact tilt nothing", () => {
    const G = toggleSolve(toggleParams.parse({ layers: route.layers }), toggleLayer(profile, "ffc5p"));
    const metrics = draft.metrics ?? [];
    TOGGLE_NAMES[4].forEach((n, k) => {
      const c = (G.sectors[k] as { c: number }).c * 180 / Math.PI;
      const want = toggleContact(G, G.thStop, c).sectors.map((s) => `tilt-stick.0.conductor.pad${s}`);
      const held = contact(metrics, n, true);
      expect(held.closed, n).toEqual(want);
      expect(held.closed, n).toContain(`tilt-stick.0.conductor.pad${k}`);
      expect(held.dir).toBe(n);
      expect(contact(metrics, n, false)).toEqual({ closed: [], dir: "none", pose: { tiltDeg: 0, phiDeg: c } });
      expect(contact(metrics, n, G.thContact - 0.2).closed).toEqual([]);
      expect(contact(metrics, "E", { tiltDeg: G.thStop, phiDeg: c + 10 }).dir).toBe(n);
    });
  });

  test("the body top and the readouts equal the original's solo4 record (packages/archetypes test/legacy/toggle.json)", () => {
    const rec = read<{ variants: Record<string, { phys: Record<string, number>; raster: Record<string, { bbox: { max: number[] } }> }> }>("packages/archetypes/test/legacy/toggle.json").variants["solo4"]!;
    expect(metric("tilt-stick.0.host.top") as number).toBeCloseTo(rec.raster["1"]!.bbox.max[2]!, 5);
    for (const [id, key] of [["stick.Fc", "Fc"], ["stick.Fs", "Fs"], ["stick.rCollar", "rCollar"], ["stick.ring", "ring"]] as const) {
      expect(metric(`tilt-stick.0.${id}`) as number, id).toBeCloseTo(rec.phys[key]!, 6);
    }
  });

  test("every metric equals the committed solo4 golden", () => {
    const now = Object.fromEntries((draft.metrics ?? []).map((m) => [m.id, m.value]));
    if (process.env["HBF_ACCEPT_METRICS"] === "1") writeFileSync(GOLDEN, `${JSON.stringify(now, null, 1)}\n`);
    expect(now).toEqual(JSON.parse(readFileSync(GOLDEN, "utf8")));
  });
});
