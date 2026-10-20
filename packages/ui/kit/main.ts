/// <reference lib="dom" />
// The /kit page (M09-T07 step 12, D-130): every shell part and panel in
// every state with fixture data, served by vite for review and baked by
// M09-T13 as dist/kit/kit.html. It moves under apps/fab as the /kit route
// at M12. Fixtures are committed sources only: PIP's layout groups
// (test/fixtures/pip-layout.ts) and notes (test/fixtures/pip-notes.ts), the
// flex-pair chase, bench and contact function, the flex-pair report golden,
// the ui-core part fixture and the toy press (test/fixtures/press-toy.ts)
// for the drive.press and plot.curve widgets.

import { createApp, defineComponent, h, type Component } from "vue";
import {
  HbGuide, HbHeader, HbPanel, HbPill, HbSpinner, HbStageOverlay, HbStatusBar, HbSteps, HbWelcome,
} from "@virgilvox/hackbuild-ui";
import { defineBench, type Bench, type Chase, type CheckResult, type Metric, type ParamEnvelope } from "@hackbuild/spec";
import ParamRail from "../src/rail/ParamRail.vue";
import ChecksPanel from "../src/panels/ChecksPanel.vue";
import FitsPanel from "../src/panels/FitsPanel.vue";
import ExportsPanel from "../src/panels/ExportsPanel.vue";
import Legend from "../src/bench/Legend.vue";
import Rail from "../src/bench/Rail.vue";
import DrivePad from "../src/stage/DrivePad.vue";
import DrivePress from "../src/widgets/DrivePress.vue";
import PlotCurve from "../src/widgets/PlotCurve.vue";
import { plotLines, widgetModel, type PlotModel } from "@hackbuild/ui-core";
import { TOY_CONTACT_MM, TOY_PLOT, TOY_PRESS, toyBuild } from "../test/fixtures/press-toy";
import { padOf } from "../src/stage/pad";
import type { PanelCtx } from "../src/bench/panels";
import { mountBench } from "../src/bench/entry";
import { tagPink } from "../src/bench/pink-marks";
import { PIP_LAYOUT, PIP_LAYOUT_VALUES } from "../test/fixtures/pip-layout";
import { PIP_MATERIALS, PIP_NOTE_GROUPS, PIP_NOTE_RAIL } from "../test/fixtures/pip-notes";
import { contact as flexContact } from "../../../reference/keys/flex-pair/build";
import { chase as flexChase } from "../../../reference/keys/flex-pair/chase";
import { bench as flexBench } from "../../../reference/keys/flex-pair/bench";
import report from "../../../reference/keys/flex-pair/expected/report.json";
import part from "../../ui-core/test/bench/flex-pair.part.json";

const findings = report.findings as unknown as CheckResult[];
const metrics = part.metrics as unknown as Metric[];

/** A composer chase over PIP's layout groups, so the kit shows the composer region map. */
const pipChase = {
  meta: { id: "kit-composer", kind: "composer", name: "PIP", version: 1, chase: 2, kernels: ["geom"], machines: ["ffc5p"], license: "CC-BY-SA-4.0" },
  materials: [
    { slot: 1, material: "petg", role: "body", label: "body, bezel", preview: "#F4F1EA" },
    { slot: 2, material: "cpla", role: "conductor", label: "traces", preview: "#1A1A1A" },
    { slot: 3, material: "tpu95", role: "flex", label: "keys", preview: "#FE0386" },
    { slot: 4, material: "ctpu", role: "flex-conductor", label: "contacts", preview: "#6E6E6E" },
  ],
  params: PIP_LAYOUT,
  presets: [{ id: "worked", label: "worked example", params: {} }],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf" }, { kind: "json" }],
  assertions: [],
} as unknown as Chase;

const pipBench: Bench = defineBench(pipChase, {
  shell: "paper",
  views: { default: "assembled", modes: ["assembled", "exploded", "section", "plate"], render: ["solid", "xray"], overlays: ["cams", "legend", "busy", "welcome"], cams: ["iso", "top", "front", "under"], stage: "graph" },
  rail: [
    { step: "layout", goal: "shape the body and place the button groups", panels: ["params.body", "params.groups"] },
    { step: "buttons", goal: "set the cone, the snap spring and the touch comb", panels: ["fits"] },
    { step: "board", goal: "pick contacts and the pin map", panels: ["hookup"] },
    { step: "print", goal: "check, then export", panels: ["checks", "exports"] },
  ],
  welcome: { tagline: "a game controller printed in one go on a four head machine", presets: ["worked"] },
});

/** The keys gap band as a param envelope: 1.428 to 2.04 mm, the CHK-KEY-01 interval the flex-pair chase header computes. */
const envelope: ParamEnvelope = {
  buildHash: part.buildHash as ParamEnvelope["buildHash"],
  params: {
    "/keys/0/gap": {
      dim: "contact.gap", unit: "mm",
      lo: [{ value: 1.428, side: "lo", kernel: "mechanisms", reason: "35 percent of the built cone", source: "CHK-KEY-01", qualifier: "computed", basis: null }],
      hi: [{ value: 2.04, side: "hi", kernel: "mechanisms", reason: "50 percent of the built cone", source: "CHK-KEY-01", qualifier: "computed", basis: null }],
      legal: [1.428, 2.04], binding: { lo: [0], hi: [0] },
    },
  },
  unbound: [],
} as unknown as ParamEnvelope;

const section = (title: string, ...children: unknown[]): unknown =>
  h("section", { class: "hbf-kit-section", "data-kit": title }, [h("h2", { class: "hb-label" }, title), ...(children as never[])]);

/** The flex-pair pad on the golden build: the part fixture and the report findings. */
const flexPad = padOf(flexChase, flexBench, flexContact, { part: { part: part as never, meshes: {} }, report: { results: findings, metrics } });
const firstKey = flexPad?.targets[0]?.target ?? "";

const notesCtx: PanelCtx = {
  values: { shape: "stadium", top: "inplace", mode: "press", rhoC: 500, pattern: "", printer: "", process: "" },
  results: [], metrics: [], envelope: null, part: null, exports: [], writable: ["json"], fabrication: [], current: false,
  valueAt: () => undefined, log: [], notes: {},
};
const notesRail = (step: number): unknown =>
  h(Rail, { steps: PIP_NOTE_RAIL, step, groups: PIP_NOTE_GROUPS, materials: PIP_MATERIALS, ctx: notesCtx, onEdit: noop });
const padStage = (held: readonly string[]): unknown =>
  h("div", { class: "hbf-kit-stage" }, [
    h(HbStageOverlay, { graph: true }, {
      bl: () => (flexPad === null ? null : h(DrivePad, { model: flexPad, held, pickInView: true, onDrive: noop })),
    }),
  ]);

/** drive.press over the stage, and plot.curve with its cursor, on the toy press at a travel. */
const pressStage = (travelMm: number): unknown =>
  h("div", { class: "hbf-kit-stage" }, [
    h(HbStageOverlay, { graph: true }, { bl: () => h(DrivePress, { model: widgetModel(TOY_PRESS, toyBuild(travelMm)), onTravel: noop }) }),
  ]);
const curveAt = (travelMm: number): unknown => {
  const m = widgetModel(TOY_PLOT, toyBuild(travelMm)) as PlotModel;
  return h(PlotCurve, { view: m.view, plotId: m.id, xUnit: m.units.x, yUnit: m.units.y, ...plotLines(m), onTravel: noop });
};

const flexValues = { W: 60, H: 30, r: 4, keys: [{ x: 0, d: 10, cone: 4, gap: 1.84 }], w: 1.4, pads: "clip" };
const noop = (): void => undefined;

const Kit: Component = defineComponent({
  name: "HbfKit",
  setup() {
    return () =>
      h("main", { class: "hbf-kit" }, [
        section("header, status pill states",
          ...([["warn", "building"], ["ok", "mesh current"], ["warn", "mesh stale"], ["err", "build failed"]] as const).map(([s, t]) =>
            h(HbHeader, { title: "PIP", accent: ".", suffix: "bench", tagline: "a game controller printed whole", taglineKind: "tool" }, () => [h(HbPill, { status: s }, () => t)]))),
        section("steps, first and export step current",
          h(HbSteps, { steps: ["layout", "buttons", "board", "print"].map((l, i) => ({ label: l, value: i, done: i < 3 })), modelValue: 0 }),
          h(HbSteps, { steps: ["layout", "buttons", "board", "print"].map((l, i) => ({ label: l, value: i, done: i < 3 })), modelValue: 3 })),
        section("guide strip", h(HbGuide, { step: 1, name: "layout", goal: "shape the body and place the button groups" })),
        section("stage, overlays and welcome",
          h("div", { class: "hbf-kit-stage" }, [
            h(HbStageOverlay, { graph: true, quiet: true }, {
              tl: () => h("div", { class: "hbf-camstrip" }, ["iso", "top", "front", "under", "exploded", "section"].map((c, i) => h("button", { type: "button", class: "hbf-cam", "aria-pressed": i === 0 }, c))),
              tr: () => h(Legend, { materials: pipChase.materials, notes: ["section at z 0 mm, drag to move"] }),
              br: () => h("span", { class: "hbf-busy", role: "status" }, [h(HbSpinner), " building"]),
              center: () => h(HbWelcome, { title: "PIP", accent: ".", suffix: "bench", note: "a game controller printed in one go on a four head machine", steps: pipBench.rail?.map((s) => ({ name: s.step, text: s.goal })), starts: [{ id: "blank", name: "start blank", primary: true }, { id: "worked", name: "worked example" }] }),
            }),
          ])),
        section("rail: PIP body, stadium", h(ParamRail, { group: PIP_LAYOUT[0], values: PIP_LAYOUT_VALUES, onEdit: noop })),
        section("rail: PIP body, slab, width changed", h(ParamRail, { group: PIP_LAYOUT[0], values: { ...PIP_LAYOUT_VALUES, shape: "slab", W: 180 }, onEdit: noop })),
        section("rail: PIP groups, left cluster a stick", h(ParamRail, { group: PIP_LAYOUT[1], values: { ...PIP_LAYOUT_VALUES, groups: PIP_LAYOUT_VALUES.groups.map((g, i) => (i === 0 ? { ...g, kind: "stick" } : g)) }, onEdit: noop })),
        section("rail: flex-pair keys with the legal band, and derived thickness",
          h(ParamRail, { group: flexChase.params[1], values: flexValues, envelope, onEdit: noop }),
          h(ParamRail, { group: flexChase.params[0], values: flexValues, metrics: new Map(metrics.map((m) => [m.id, m])), onEdit: noop })),
        section("notes: PIP buttons pane, one note per panel", notesRail(1)),
        section("notes: PIP print pane, notes panels after fits and exports", notesRail(3)),
        section("drive pad: idle, from the flex-pair golden build", padStage([])),
        section("drive pad: first key held", padStage([firstKey])),
        section("drive.press: toy key released", pressStage(0)),
        section("drive.press: toy key dragged past contact", pressStage(TOY_CONTACT_MM + 0.1)),
        section("plot.curve: toy curve, cursor below contact", curveAt(0.25)),
        section("plot.curve: toy curve, cursor past contact", curveAt(TOY_CONTACT_MM + 0.1)),
        section("checks and fits from the flex-pair report golden",
          h(ChecksPanel, { results: findings, part: part as never }),
          h(FitsPanel, { metrics, results: findings, part: part as never })),
        section("exports, stale and current",
          h(ExportsPanel, { exports: flexChase.exports, current: false, writable: ["json"] }),
          h(ExportsPanel, { exports: flexChase.exports, current: true, writable: ["json"] })),
        section("status strip, current and stale",
          h(HbStatusBar, null, () => [h("span", "60 x 30 x 2.41 mm"), h("span", "5720 tris"), h("span", "build 165 ms"),
            h("span", { class: "hbf-status-chips" }, [h("span", { class: "hbf-chip is-good" }, "fits bed"), h("span", { class: "hbf-chip is-good" }, "mesh current"), h("span", { class: "hbf-chip is-good" }, "no warnings"), h(Legend, { materials: flexChase.materials, where: "status" })])]),
          h(HbStatusBar, null, () => [h("span", { class: "hbf-status-chips" }, [h("span", { class: "hbf-chip is-bad" }, "mesh stale"), h("span", { class: "hbf-chip is-bad" }, "2 warnings")])])),
        section("composer shell", h("div", { id: "kit-composer", class: "hbf-kit-frame" })),
        section("single shell", h("div", { id: "kit-single", class: "hbf-kit-frame" })),
        h(HbPanel, { sunk: true }, () => h("p", { class: "hbf-note" }, "every value on this page is fixture data from committed files; nothing here is measured.")),
      ]);
  },
});

const root = document.getElementById("app");
if (root !== null) {
  createApp(Kit).mount(root);
  tagPink(root);
  new MutationObserver(() => tagPink(root)).observe(root, { childList: true, subtree: true });
  mountBench({ chase: pipChase, bench: pipBench, el: document.getElementById("kit-composer"), kernel: false, hook: false });
  mountBench({ chase: flexChase, bench: flexBench, el: document.getElementById("kit-single"), kernel: false, hook: true });
}
