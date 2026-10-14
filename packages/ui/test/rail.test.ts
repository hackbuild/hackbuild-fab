// @vitest-environment happy-dom
/// <reference path="../src/vue-shim.d.ts" />
// M09-T08 acceptance: the PIP layout step renders from ParamField
// declarations with PIP's labels, units, ranges, steps and show and hide
// rules. The expected rows are parsed from the shipped bench files
// (designs/pip/legacy/bench/part1.html and part3.js, lineage pip.bench-part1
// and pip.bench-part3), never typed here, so the test fails when a fixture
// row drifts from PIP or a renderer drops a row.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, ref } from "vue";
import type { ParamEnvelope, ParamGroup } from "@hackbuild/spec";
import ParamRail from "../src/rail/ParamRail.vue";
import { defaultsOf, legalLine, bandOf, legalOptions, type EnumField } from "../src/rail/model.js";
import { shows } from "../src/rail/showWhen.js";
import { PIP_LAYOUT, PIP_LAYOUT_VALUES } from "./fixtures/pip-layout.js";
import { chase as flexChase } from "../../../reference/keys/flex-pair/chase.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const PIP = path.join(ROOT, "designs/pip/legacy/bench");
const part1 = readFileSync(path.join(PIP, "part1.html"), "utf8");
const part3 = readFileSync(path.join(PIP, "part3.js"), "utf8");

type Values = Record<string, unknown>;
type Edit = [string, unknown, string];

// ---- the shipped rows

interface ShippedRow { label: string; show: string | null; min: string; max: string; step: string; unit: string }

function bodyRows(): { shapes: string[]; rows: ShippedRow[] } {
  const start = part1.indexOf("<h3>BODY</h3>");
  const end = part1.indexOf('<div class="note">', start);
  expect(start).toBeGreaterThan(0);
  const body = part1.slice(start, end);
  const shapes = [...body.matchAll(/data-shape="(\w+)"/g)].map((m) => m[1] as string);
  const rows = [...body.matchAll(/<div class="row"(?: data-show="([^"]+)")?><label>([^<]+)<\/label><input type="range" data-p="[^"]+" min="([^"]+)" max="([^"]+)" step="([^"]+)">.*?<span class="u">([^<]+)<\/span>/g)]
    .map((m) => ({ show: m[1] ?? null, label: m[2] as string, min: m[3] as string, max: m[4] as string, step: m[5] as string, unit: m[6] as string }));
  return { shapes, rows };
}

function groupRows(): { names: Record<string, string>; rows: Record<string, { min: string; max: string; step: string }>; kinds: string[]; types: string[] } {
  const names = JSON.parse(`{${/const GROUP_NAMES = \{([^}]+)\}/.exec(part3)?.[1]?.replace(/(\w+):/g, '"$1":').replace(/'/g, '"') ?? ""}}`) as Record<string, string>;
  const rows: Record<string, { min: string; max: string; step: string }> = {};
  for (const m of part3.matchAll(/<label>(\w+)<\/label><input type="range" data-p="groups\.' \+ k \+ '\.\w+" min="([^"]+)" max="([^"]+)" step="([^"]+)"/g)) {
    rows[m[1] as string] = { min: m[2] as string, max: m[3] as string, step: m[4] as string };
  }
  const kinds = [...part3.matchAll(/data-kind="\w+">([^<]+)<\/button>/g)].map((m) => m[1] as string);
  const typeList = /\[([^\]]+)\]\.map\(t => '<button class="chip pk/.exec(part3)?.[1] ?? "";
  const types = [...typeList.matchAll(/'(\w+)'/g)].map((m) => m[1] as string);
  return { names, rows, kinds, types };
}

// ---- mounting

function mountRail(group: ParamGroup, start: Values, extra: { envelope?: ParamEnvelope | null } = {}) {
  const edits: Edit[] = [];
  const values = ref<Values>(structuredClone(start));
  const Host = defineComponent({
    setup() {
      return () => h(ParamRail, {
        group, values: values.value, envelope: extra.envelope ?? null,
        onEdit: (p: string, v: unknown, k: string) => {
          edits.push([p, v, k]);
          if (k === "touch") return;
          const next = JSON.parse(JSON.stringify(values.value)) as Values;
          const keys = p.split(".");
          const last = keys.pop() as string;
          const o = keys.reduce<Record<string, unknown>>((a, key) => a[key] as Record<string, unknown>, next);
          o[last] = v;
          values.value = next;
        },
      });
    },
  });
  const el = document.createElement("div");
  document.body.append(el);
  const app = createApp(Host);
  app.mount(el);
  return { el, edits, values, unmount: () => { app.unmount(); el.remove(); } };
}

const label = (row: Element): string => (row.querySelector(".hb-prow-label")?.childNodes[0]?.textContent ?? "").trim();
const topRows = (el: Element): Element[] => [...el.querySelectorAll('[data-hb="param-group"] > [data-hb="param"]')];

function rangeOf(row: Element): ShippedRow {
  const r = row.querySelector('input[type="range"]');
  return {
    label: label(row), show: null,
    min: r?.getAttribute("min") ?? "", max: r?.getAttribute("max") ?? "", step: r?.getAttribute("step") ?? "",
    unit: row.querySelector(".hb-prow-unit")?.textContent?.trim() ?? "",
  };
}

describe("rail: PIP BODY from declarations", () => {
  const shipped = bodyRows();

  it("parses the shipped rows it compares against", () => {
    expect(shipped.shapes).toEqual(["stadium", "slab", "grips"]);
    expect(shipped.rows.map((r) => r.label)).toEqual(["width", "depth", "corner", "grip drop", "bezel", "bezel edge"]);
  });

  for (const shape of ["stadium", "slab", "grips"]) {
    it(`shape ${shape}: rows, order, labels, units, min, max and step equal part1.html`, async () => {
      const m = mountRail(PIP_LAYOUT[0] as ParamGroup, { ...PIP_LAYOUT_VALUES, shape });
      await nextTick();
      const rows = topRows(m.el);
      const chips = [...rows[0]?.querySelectorAll(".hb-chip") ?? []].map((c) => c.textContent?.trim());
      expect(label(rows[0] as Element)).toBe("shape");
      expect(chips).toEqual(shipped.shapes);
      const want = shipped.rows.filter((r) => r.show === null || r.show === `shape.style=${shape}`).map((r) => ({ ...r, show: null }));
      const got = rows.slice(1).filter((r) => r.querySelector('input[type="range"]') !== null).map(rangeOf);
      expect(got).toEqual(want);
      m.unmount();
    });
  }

  it("visibility re-evaluates after a commit: picking slab shows corner, grips shows grip drop", async () => {
    const m = mountRail(PIP_LAYOUT[0] as ParamGroup, PIP_LAYOUT_VALUES);
    await nextTick();
    const has = (l: string): boolean => topRows(m.el).some((r) => label(r) === l);
    expect([has("corner"), has("grip drop")]).toEqual([false, false]);
    (m.el.querySelector('[data-value="slab"]') as HTMLElement).click();
    await nextTick();
    expect([has("corner"), has("grip drop")]).toEqual([true, false]);
    (m.el.querySelector('[data-value="grips"]') as HTMLElement).click();
    await nextTick();
    expect([has("corner"), has("grip drop")]).toEqual([false, true]);
    expect(m.edits.map((e) => e[2])).toEqual(["commit", "commit"]);
    expect(m.values.value["corner"]).toBe(10);
    m.unmount();
  });

  it("thickness is derived: read-only, its help is the tooltip", async () => {
    const m = mountRail(PIP_LAYOUT[0] as ParamGroup, PIP_LAYOUT_VALUES);
    await nextTick();
    const d = m.el.querySelector('[data-hb="derived"][data-field="T"]');
    expect(d?.querySelector("input")).toBeNull();
    expect(d?.getAttribute("title")).toContain("snapped to layers");
    m.unmount();
  });
});

describe("rail: PIP BUTTON GROUPS from declarations", () => {
  const shipped = groupRows();

  async function render(values: Values) {
    const m = mountRail(PIP_LAYOUT[1] as ParamGroup, values);
    await nextTick();
    const inst = [...m.el.querySelectorAll('[data-hb="instance"]')];
    const of = (i: number) => {
      const el = inst[i] as Element;
      const rows = [...el.querySelectorAll(':scope > [data-hb="param"]')];
      return {
        head: el.querySelector('[data-hb="instance-head"]')?.textContent?.trim() ?? "",
        labels: rows.map(label),
        chips: (f: string) => [...el.querySelectorAll(`[data-field="${f}"] .hb-chip`)].map((c) => c.textContent?.trim()),
        ranges: Object.fromEntries(rows.filter((r) => r.querySelector('input[type="range"]')).map((r) => {
          const x = rangeOf(r);
          return [x.label, { min: x.min, max: x.max, step: x.step }];
        })),
      };
    };
    return { m, of, count: inst.length };
  }

  it("four groups with PIP's heads, chips and x, y, pitch ranges", async () => {
    const { m, of, count } = await render(PIP_LAYOUT_VALUES);
    expect(count).toBe(4);
    const keys = ["left", "face", "menu", "shoulder"];
    expect(keys.map((_, i) => of(i).head.toUpperCase())).toEqual(keys.map((k) => shipped.names[k]));
    expect(of(0).chips("kind")).toEqual(shipped.kinds);
    expect(of(0).chips("type")).toEqual(shipped.types);
    expect(of(1).chips("kind")).toEqual([]);
    expect(of(1).chips("type")).toEqual(shipped.types);
    for (const i of [0, 1, 2]) expect(of(i).ranges).toEqual({ x: shipped.rows["x"], y: shipped.rows["y"], pitch: shipped.rows["pitch"] });
    m.unmount();
  });

  it("the shoulder group has no pitch row", async () => {
    const { m, of } = await render(PIP_LAYOUT_VALUES);
    expect(of(3).labels).not.toContain("pitch");
    expect(of(3).ranges).toEqual({ x: shipped.rows["x"], y: shipped.rows["y"] });
    m.unmount();
  });

  it("LEFT CLUSTER with kind stick hides its type chips and pitch row; the values stay", async () => {
    const groups = PIP_LAYOUT_VALUES.groups.map((g, i) => (i === 0 ? { ...g, kind: "stick" } : g));
    const { m, of } = await render({ ...PIP_LAYOUT_VALUES, groups });
    expect(of(0).chips("type")).toEqual([]);
    expect(of(0).labels).not.toContain("pitch");
    expect(of(0).labels).not.toContain("type");
    expect(of(1).labels).toContain("pitch");
    expect((m.values.value["groups"] as Values[])[0]?.["pitch"]).toBe(14);
    m.unmount();
  });

  it("picking stick on the left cluster is one commit and hides type and pitch", async () => {
    const { m, of } = await render(PIP_LAYOUT_VALUES);
    (m.el.querySelector('[data-hb="instance"][data-index="0"] [data-value="stick"]') as HTMLElement).click();
    await nextTick();
    expect(m.edits).toEqual([["groups.0.kind", "stick", "commit"]]);
    expect(of(0).labels).not.toContain("pitch");
    m.unmount();
  });
});

describe("rail: controls, reset, list, legal values", () => {
  it("a range drag fires touch on input and one commit on change", async () => {
    const m = mountRail(PIP_LAYOUT[0] as ParamGroup, PIP_LAYOUT_VALUES);
    await nextTick();
    const r = m.el.querySelector('[data-field="W"] input[type="range"]') as HTMLInputElement;
    for (const v of ["160", "170"]) {
      r.value = v;
      r.dispatchEvent(new Event("input", { bubbles: true }));
    }
    r.dispatchEvent(new Event("change", { bubbles: true }));
    await nextTick();
    expect(m.edits.map((e) => e[2])).toEqual(["touch", "touch", "commit"]);
    expect(m.edits.at(-1)?.[1]).toBe(170);
    m.unmount();
  });

  it("the reset mark shows on a changed row and restores the default in one commit", async () => {
    const m = mountRail(PIP_LAYOUT[0] as ParamGroup, { ...PIP_LAYOUT_VALUES, W: 180 });
    await nextTick();
    const reset = m.el.querySelector('[data-field="W"] .hb-prow-reset') as HTMLButtonElement;
    const depth = m.el.querySelector('[data-field="H"] .hb-prow-reset') as HTMLButtonElement;
    expect(reset.hidden).toBe(false);
    expect(depth.hidden).toBe(true);
    reset.click();
    await nextTick();
    expect(m.edits).toEqual([["W", 150, "commit"]]);
    expect((m.el.querySelector('[data-field="W"] .hb-prow-reset') as HTMLButtonElement).hidden).toBe(true);
    m.unmount();
  });

  it("flex-pair keys: add makes a second key in one commit, the most is two", async () => {
    const keys = flexChase.params[1] as ParamGroup;
    const start = defaultsOf(flexChase.params);
    const m = mountRail(keys, start);
    await nextTick();
    expect(m.el.querySelectorAll('[data-hb="instance-remove"]').length).toBe(0);
    (m.el.querySelector('[data-hb="instance-add"]') as HTMLElement).click();
    await nextTick();
    expect(m.edits.length).toBe(1);
    expect(m.edits[0]?.[2]).toBe("commit");
    expect((m.values.value["keys"] as unknown[]).length).toBe(2);
    expect(m.el.querySelectorAll('[data-hb="instance"]').length).toBe(2);
    expect(m.el.querySelector('[data-hb="instance-add"]')).toBeNull();
    expect(m.el.querySelectorAll('[data-hb="instance-remove"]').length).toBe(2);
    m.unmount();
  });

  it("a constraintDim row carries the binding bound from the envelope as its tooltip and band", async () => {
    const envelope = {
      buildHash: "x", unbound: [],
      params: { "/keys/0/gap": { dim: "contact.gap", unit: "mm", legal: [1.28, 1.6], binding: { lo: [1], hi: [0] },
        lo: [{ value: 1.2, side: "lo", kernel: "mechanisms", reason: "floor", qualifier: "computed", basis: null },
          { value: 1.28, side: "lo", kernel: "mechanisms", reason: "35 percent", source: "CHK-KEY-01", qualifier: "computed", basis: null }],
        hi: [{ value: 1.6, side: "hi", kernel: "mechanisms", reason: "50 percent", source: "CHK-KEY-01", qualifier: "computed", basis: null }] } },
    } as unknown as ParamEnvelope;
    const m = mountRail(flexChase.params[1] as ParamGroup, defaultsOf(flexChase.params), { envelope });
    await nextTick();
    const row = m.el.querySelector('[data-path="keys.0.gap"]');
    expect(row?.getAttribute("title")).toBe("how far the cap moves before it reads. legal 1.28 to 1.6, set by CHK-KEY-01");
    expect(row?.getAttribute("aria-describedby")).toBeTruthy();
    expect(row?.querySelector('[data-hb="legal-band"]')).not.toBeNull();
    expect(m.el.querySelector('[data-path="keys.0.d"] [data-hb="legal-band"]')).toBeNull();
    m.unmount();
  });

  it("an enum whose legal set excludes an option never offers it (stub query)", async () => {
    const nozzle: EnumField = { id: "nozzle", type: "enum", label: "nozzle", default: "0.4", constraintDim: "nozzle.d",
      options: [{ value: "0.2", label: "0.2" }, { value: "0.4", label: "0.4" }, { value: "0.6", label: "0.6" }, { value: "0.8", label: "0.8" }] };
    const group: ParamGroup = { id: "n", label: "N", fields: [nozzle] };
    const query = vi.fn((): ParamEnvelope => ({
      buildHash: "x", unbound: [],
      params: { "/nozzle": { dim: "nozzle.d", unit: "mm", legal: [0.3, 0.7], binding: { lo: [0], hi: [0] },
        lo: [{ value: 0.3, side: "lo", kernel: "profile", reason: "line width", qualifier: "computed", basis: null }],
        hi: [{ value: 0.7, side: "hi", kernel: "profile", reason: "line width", qualifier: "computed", basis: null }] } },
    } as unknown as ParamEnvelope));
    const m = mountRail(group, { nozzle: "0.4" }, { envelope: query() });
    await nextTick();
    expect([...m.el.querySelectorAll(".hb-chip")].map((c) => c.textContent?.trim())).toEqual(["0.4", "0.6"]);
    expect(query).toHaveBeenCalledTimes(1);
    const unconstrained = mountRail(group, { nozzle: "0.4" });
    await nextTick();
    expect(unconstrained.el.querySelectorAll(".hb-chip").length).toBe(4);
    m.unmount();
    unconstrained.unmount();
    expect(legalOptions(nozzle, bandOf(null, "/nozzle"))).toHaveLength(4);
  });

  it("an option exactly on a legal bound stays offered (bounds are inclusive)", () => {
    const nozzle: EnumField = { id: "nozzle", type: "enum", label: "nozzle", default: "0.4", constraintDim: "nozzle.d",
      options: [{ value: "0.2", label: "0.2" }, { value: "0.4", label: "0.4" }, { value: "0.6", label: "0.6" }] };
    const band = (lo: number, hi: number) => ({ lo, hi, loBy: null, hiBy: null, unsat: false });
    expect(legalOptions(nozzle, band(0.3, 0.4)).map((o) => o.value)).toEqual(["0.4"]);
    expect(legalOptions(nozzle, band(0.4, 0.5)).map((o) => o.value)).toEqual(["0.4"]);
  });
});

describe("rail: derived rows read the build", () => {
  it("flex-pair thickness shows the part's derived.T metric with its unit and qualifier", async () => {
    const part = JSON.parse(readFileSync(path.join(ROOT, "packages/ui-core/test/bench/flex-pair.part.json"), "utf8")) as { metrics: { id: string; value: number; qualifier: string }[] };
    const t = part.metrics.find((m) => m.id === "derived.T");
    expect(t).toBeDefined();
    const el = document.createElement("div");
    document.body.append(el);
    const app = createApp(() => h(ParamRail, { group: flexChase.params[0], values: defaultsOf(flexChase.params), metrics: new Map(part.metrics.map((m) => [m.id, m])) }));
    app.mount(el);
    await nextTick();
    const out = el.querySelector('[data-hb="derived"][data-field="T"] output');
    expect(out?.textContent?.replace(/\s+/g, " ").trim()).toBe(`${Number(t?.value.toFixed(3))} mm ${t?.qualifier}`);
    app.unmount();
    el.remove();
  });
});

describe("rail model", () => {
  it("defaultsOf equals core's defaultsOf on the flex-pair chase", async () => {
    const core = (await import(pathToFileURL(path.join(ROOT, "core/dist/commands/build.js")).href)) as { defaultsOf: (c: unknown) => unknown };
    expect(defaultsOf(flexChase.params)).toEqual(core.defaultsOf(flexChase));
  });

  it("showWhen reads the instance first, then the design", () => {
    const inst = { kind: "stick" };
    const design = { kind: "dpad", shape: "slab" };
    expect(shows({ field: "kind", equals: "stick" }, [inst, design])).toBe(true);
    expect(shows({ field: "shape", in: ["slab", "grips"] }, [inst, design])).toBe(true);
    expect(shows({ all: [{ field: "kind", notEquals: "stick" }, { field: "shape", equals: "slab" }] }, [inst, design])).toBe(false);
    expect(shows({ any: [{ field: "kind", notEquals: "stick" }, { field: "shape", equals: "slab" }] }, [inst, design])).toBe(true);
  });

  it("legalLine names both binding sources once and an unsat band says so", () => {
    const b = { lo: 1, hi: 2, unsat: false,
      loBy: { value: 1, side: "lo", kernel: "mechanisms", reason: "r", source: "CHK-KEY-01", qualifier: "computed", basis: null },
      hiBy: { value: 2, side: "hi", kernel: "mechanisms", reason: "r", source: "CHK-KEY-01", qualifier: "computed", basis: null } } as const;
    expect(legalLine(b as never, "contact.gap")).toBe("legal 1 to 2, set by CHK-KEY-01");
    expect(legalLine({ ...b, unsat: true } as never, "contact.gap")).toBe("no legal value, contact.gap floors exceed its ceilings");
  });
});
