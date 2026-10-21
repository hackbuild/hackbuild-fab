// designs/pip: the layout, the route, the drive contact and the metrics of
// build.ts. Expected values come from sources this design does not write:
// the original's own layout at haft (9) defaults and with the stick, as
// packages/archetypes/scripts/pip-legacy.mjs recorded it from
// originals/pip (test/legacy/pip-fits.json, variants haft.bleed0 and
// haft.stickBleed0), the copper route of PIP's own route input dumped from
// pip-controller b137deb (packages/copper test/golden/pip-b137deb-default.json,
// the b137deb fixture of the same default layout), and the committed
// metrics golden test/golden/worked-metrics.json, rewritten only with
// HBF_ACCEPT_METRICS=1. build.ts runs in process through the pipeline's
// Author; the meshed build, its checks and the parity goldens are hbf
// part.build and hbf parity. Every number is computed; nothing was printed.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import type { BuildWarning, Metric, PartDraft } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { makeAuthor, registerSolvers, resolveParams } from "@hackbuild/pipeline";
import { build, contact } from "../build";
import { chase, type PipParams } from "../chase";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const read = <T>(rel: string): T => JSON.parse(readFileSync(path.join(ROOT, rel), "utf8")) as T;
const GOLDEN = path.join(HERE, "golden", "worked-metrics.json");

interface LegacyVariant { z: { top: number; bezelTop: number; floor: number }; btns: { id: string; type: string; ang: number }[]; unrouted: number; conflicts: number }
const legacy = read<{ variants: Record<string, LegacyVariant> }>("packages/archetypes/test/legacy/pip-fits.json").variants;
interface RouteGolden { conflicts: number; unrouted: number; iters: number; nets: { name: string; len: number }[] }
const routeGolden = read<RouteGolden>("packages/copper/test/golden/pip-b137deb-default.json");

const profile = createProfileLookup(loadProfile());
interface Built { draft: PartDraft; warnings: BuildWarning[]; metric: (id: string) => Metric["value"] | undefined }
async function built(params: Record<string, unknown> | undefined, preset?: string): Promise<Built> {
  const warnings: BuildWarning[] = [];
  const draft = (await build(resolveParams(chase, params as never, preset) as unknown as PipParams, makeAuthor(chase, profile, warnings))) as PartDraft;
  return { draft, warnings, metric: (id) => draft.metrics?.find((m) => m.id === id)?.value };
}

let defaults: Built, stick: Built, worked: Built;
beforeAll(async () => {
  registerSolvers();
  defaults = await built(undefined);
  stick = await built({ leftKind: "stick" });
  worked = await built(undefined, "worked");
}, 240_000);

describe("the layout is the original's", () => {
  test.each([["defaults", "haft.bleed0"], ["stick", "haft.stickBleed0"]] as const)("%s: host top, bezel top and the click slot directions equal %s", (which, key) => {
    const b = which === "defaults" ? defaults : stick;
    const rec = legacy[key] as LegacyVariant;
    expect(b.metric("layout.top") as number).toBeCloseTo(rec.z.top, 6);
    expect(b.metric("layout.bezelTop") as number).toBeCloseTo(rec.z.bezelTop, 6);
    expect(b.metric("layout.floor") as number).toBeCloseTo(rec.z.floor, 6);
    expect(b.metric("layout.buttons")).toBe(rec.btns.length);
    for (const btn of rec.btns.filter((x) => x.type === "clicky")) {
      expect(b.metric(`layout.slot.${btn.id}`) as number, btn.id).toBeCloseTo(((btn.ang * 180) / Math.PI + 360) % 360, 4);
    }
    expect(b.metric("route.unrouted")).toBe(rec.unrouted);
    expect(b.metric("route.conflicts")).toBe(rec.conflicts);
  });

  test("the route is copper's route of PIP's own default route input: counts and every net length", () => {
    expect(defaults.metric("route.conflicts")).toBe(routeGolden.conflicts);
    expect(defaults.metric("route.unrouted")).toBe(routeGolden.unrouted);
    expect(defaults.metric("route.iters")).toBe(routeGolden.iters);
    for (const n of routeGolden.nets) expect(defaults.metric(`route.net.${n.name}.length`) as number, n.name).toBeCloseTo(n.len, 3);
    const routed = defaults.draft.metrics?.filter((m) => /^route\.net\..+\.length$/.test(m.id)).map((m) => m.id.split(".")[2]);
    expect(routed).toEqual(routeGolden.nets.map((n) => n.name));
  });

  test("every routed terminal post and layer region is the stack's, and no archetype disc or post is held twice", () => {
    const ids = defaults.draft.features.map((f) => f.id);
    expect(ids.filter((id) => /\.conductor\.(disc[12]|post)[A-Za-z0-9]*$/.test(id))).toEqual([]);
    const posts = defaults.draft.features.filter((f) => f.kind === "conductor" && /^conductor\.[A-Z0-9]+\.post\d+$/.test(f.id));
    // two terminals per key plus a seat bump per used pin, PIP's L.nets terms (fixture of b137deb)
    const terms = read<{ input: { nets: { name: string; terms: unknown[] }[] } }>("packages/copper/test/fixtures/pip-b137deb-route.json").input.nets;
    expect(posts.length).toBe(terms.reduce((a, n) => a + n.terms.length, 0));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("the drive contact", () => {
  test("a hold closes the region the key's actuator bridges and its common, release closes nothing", () => {
    const m = defaults.draft.metrics ?? [];
    const conductor = (id: string): { net: string } | undefined => defaults.draft.features.find((f) => f.kind === "conductor" && f.id === id) as { net: string } | undefined;
    for (const [key, want, common] of [["A", "click-spring-key.3.conductor.pad", "GND"], ["SELECT", "touch-comb-key.0.conductor.comb", "3V3"], ["UP", "flex-cone-key.0.conductor.col", "GND"]] as const) {
      const held = contact(m, key, true);
      expect(held.closed, key).toEqual([want, `${want}Common`]);
      expect(conductor(want)?.net, key).toBe(key);
      expect(conductor(`${want}Common`)?.net, key).toBe(common);
      expect(contact(m, key, false).closed).toEqual([]);
    }
    expect(contact(m, "NOPE", true).closed).toEqual([]);
  });

  test("the stick: a hold closes the wall pad of that direction", () => {
    const m = stick.draft.metrics ?? [];
    ["RIGHT", "UP", "LEFT", "DOWN"].forEach((n, q) => {
      expect(contact(m, n, true)).toEqual({ closed: [`tilt-stick.0.conductor.pad${q}`], dir: n });
      expect(stick.draft.features.find((f) => f.id === `tilt-stick.0.conductor.pad${q}`)).toMatchObject({ net: n });
    });
  });
});

describe("the worked example", () => {
  test("every metric equals the committed worked golden", () => {
    const now = Object.fromEntries((worked.draft.metrics ?? []).map((m) => [m.id, m.value]));
    if (process.env["HBF_ACCEPT_METRICS"] === "1") writeFileSync(GOLDEN, `${JSON.stringify(now, null, 1)}\n`);
    expect(now).toEqual(JSON.parse(readFileSync(GOLDEN, "utf8")));
  });

  test("the layout warns of nothing; the bezel warning names what release 1 leaves out", () => {
    expect(worked.warnings.filter((w) => ["LAYOUT", "NET", "PIN", "MOUNT", "STICK", "CLICKY", "UNROUTED", "ROUTE_CONFLICT"].includes(w.code))).toEqual([]);
    expect(worked.warnings.filter((w) => w.code === "BEZEL").map((w) => w.text)).toEqual([
      "bezel labels, mark, lip and groove, pry notch, pegs not built in release 1; the bezel is the plate, holes, notch and ribs",
    ]);
  });
});
