<script setup lang="ts">
// The bench skeleton (M09-T07): header, steps, guide, stage, rail, status
// and welcome, every region a hackbuild-ui component, laid out by the kind's
// region map (D-126). The ui-core bench core is the design's truth; this
// component reads the Pinia mirror and writes only through core verbs.
// PIP part1.html is the composer skeleton; COLLAR is the single one.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  HbAppShell, HbGuide, HbHeader, HbPill, HbSelect, HbSpinner, HbStageOverlay, HbStatusBar, HbSteps, HbWelcome,
  type HbStepOption, type HbWelcomeStart,
} from "@virgilvox/hackbuild-ui";
import type { Bench, Chase, CheckResult, ContactFn, ViewMode } from "@hackbuild/spec";
import {
  applyFix, CAM_NAMES, chaseStarts, mountBakeStage, targetOfBody,
  type BakeStage, type BenchCore, type CamChangeDetail, type CamName, type Located, type Pad, type PickDetail, type ViewPart, type Welcome,
} from "@hackbuild/ui-core";
import Rail from "./Rail.vue";
import Legend from "./Legend.vue";
import DrivePad from "../stage/DrivePad.vue";
import { padOf } from "../stage/pad.js";
import { KINDS, kindError } from "./kinds.js";
import { tagPink } from "./pink-marks.js";
import { railEndError, type PanelCtx } from "./panels.js";
import LogPanel from "../panels/LogPanel.vue";
import { bedFits, stepMarks } from "./steps.js";
import { useShell, type BenchReport, type Values } from "../stores/shell.js";
import type { CommitKind } from "../rail/context.js";

interface Props {
  chase: Chase;
  bench: Bench;
  core: BenchCore<Values, ViewPart, BenchReport>;
  welcome: Welcome;
  /** Export kinds this page can write. */
  writable?: readonly string[];
  /** Export kinds gated as fabrication. */
  fabrication?: readonly string[];
  /** Mount the WebGL stage; false for a DOM without WebGL (unit tests). */
  stage?: boolean;
  /** The design's drive pad contact function (DriveDecl.contact), exported by its build.ts. */
  contact?: ContactFn | null;
  /** The drive pad's held set; BENCH.drive writes the same one. */
  pad?: Pad | null;
}

const props = withDefaults(defineProps<Props>(), { writable: () => ["json"], fabrication: () => [], stage: true, contact: null, pad: null });
const emit = defineEmits<{ export: [kind: string]; open: [json: string]; start: [id: string] }>();
const shell = useShell();

const refused = kindError(props.chase.meta.kind);
if (refused !== null) console.error(refused);
const region = KINDS[props.chase.meta.kind];

// The single kind is 330 / 1fr / 300 over 1180 px, two columns (design rail
// with the readout panels, stage) down to 900, and the composer stack below
// that, so no panel is ever dropped at a width.
const SINGLE_THREE = 1180;
const SINGLE_TWO = 900;
const width = ref(typeof window === "undefined" ? SINGLE_THREE + 1 : window.innerWidth);
const onResize = (): void => {
  width.value = window.innerWidth;
};
const layout = computed<"composer" | "single3" | "single2">(() => {
  if (region?.design !== "left") return "composer";
  if (width.value > SINGLE_THREE) return "single3";
  return width.value > SINGLE_TWO ? "single2" : "composer";
});
// Under 640 px the cams fold into one select so the strip holds one row and
// leaves the stage clear (PIP bench/part1.html line 125 breakpoint; t08 shot
// at 390 wrapped the strip to three rows).
const NARROW = 640;
const narrow = computed(() => width.value <= NARROW);
const camOptions = computed(() => [
  ...(shell.cam === "" ? [{ label: "orbit", value: "" }] : []),
  ...cams.value.map((c) => ({ label: c, value: c })),
]);
const steps = computed(() => props.bench.rail ?? []);
const endError = railEndError(steps.value);
if (endError !== null) console.error(endError);

// Done is the step's checks on the build on screen (G-40); visited is a separate mark, tagged on the tab.
const marks = computed(() => stepMarks(steps.value, props.chase.params, shell.result === null ? null : shell.report.results ?? [], shell.visited));
const stepOptions = computed<HbStepOption[]>(() =>
  steps.value.map((s, i) => ({ label: s.step, value: i, done: marks.value[i]?.done === true })),
);
const stepNow = computed(() => steps.value[shell.step] ?? null);
// A step with no params or materials panel gives the stage the left column.
const stepHasDesign = computed(() =>
  shell.step === 0 || (stepNow.value?.panels ?? []).some((p) => p.startsWith("params.") || p === "materials"));
const exportStep = computed(() => steps.value.length - 1);
// The single kind's readout rail shows only when the step declares a readout
// panel; otherwise the stage takes its width (gold benches give the stage
// about 940 px at 1280 with one dense rail).
const readoutPanels = computed(() => (stepNow.value?.panels ?? []).filter((p) => !p.startsWith("params.") && p !== "materials"));
const rightRail = computed(() => layout.value === "composer" || (layout.value === "single3" && readoutPanels.value.length > 0));
const logOpen = ref(false);

const starts = computed<HbWelcomeStart[]>(() =>
  chaseStarts(props.chase, props.bench).map((s) => ({ id: s.id, name: s.label, primary: s.primary })));

// ---- stage
const host = ref<HTMLElement | null>(null);
let stage: BakeStage | null = null;
const cams = computed(() => (props.bench.views.cams ?? []).filter((c): c is CamName => (CAM_NAMES as string[]).includes(c)));
const modes = computed(() => props.bench.views.modes.filter((m) => m !== props.bench.views.default));
// Render toggles the bench declares beside the solid default (G-17): each a button bound to viewer state.
const renders = computed(() => (props.bench.views.render ?? []).filter((r) => r === "xray"));
const overlays = computed(() => new Set(props.bench.views.overlays));

function paintStage(): void {
  if (stage === null) return;
  const v = stage.viewer;
  v.slots = Object.fromEntries(props.chase.materials.flatMap((m) => (m.preview === undefined ? [] : [[m.slot, m.preview]])));
  v.model = (shell.result?.part as ViewPart | undefined) ?? null;
}

function setCam(c: CamName): void {
  shell.cam = c;
  if (stage !== null) stage.viewer.cam = c;
}

function toggleMode(m: string): void {
  const on = !shell.modes.includes(m);
  shell.modes = on ? [...shell.modes, m] : shell.modes.filter((x) => x !== m);
  if (stage === null) return;
  const v = stage.viewer;
  if (m === "plate") v.plate = on;
  else if (m === "exploded") v.explode = on;
  else if (m === "section") v.section = on ? 0 : null;
  else if (m === "xray") v.xray = on;
  else if (m === "layers") v.layers = on;
}

// An orbit, pan, zoom or frame leaves the preset; the strip then outlines no cam (G-17).
function onCamChange(e: Event): void {
  shell.cam = (e as CustomEvent<CamChangeDetail>).detail.cam ?? "";
}

const modeNotes = computed(() => shell.modes.filter((m) => m === "section").map(() => "section at z 0 mm, drag to move"));

// ---- drive pad
const padModel = computed(() =>
  padOf(props.chase, props.bench, props.contact, { part: (shell.result?.part as ViewPart | undefined) ?? null, report: shell.report }));
const pickInView = computed(() => props.bench.views.drive?.pickInView === true);

function drive(target: string, value: boolean): void {
  props.pad?.drive(target, value);
}

// PIP VIEW.pressed: the held keys' contact bodies stand out in the view.
function paintHeld(): void {
  if (stage === null || padModel.value === null) return;
  const held = new Set(shell.held);
  stage.viewer.focusIds = padModel.value.targets.filter((t) => held.has(t.target)).flatMap((t) => t.bodies);
}

function onPick(e: Event): void {
  const m = padModel.value;
  if (!pickInView.value || m === null) return;
  const t = targetOfBody(m, (e as CustomEvent<PickDetail>).detail.body);
  if (t !== null) drive(t, !shell.held.includes(t));
}

// ---- edits, verbs, files
function edit(path: string, value: unknown, kind: CommitKind): void {
  props.core.set(path, value);
  props.core.commitAs(kind);
}

function locate(_r: CheckResult, at: Located): void {
  if (stage === null) return;
  stage.viewer.focusIds = at.focus;
  if (at.bbox !== null) stage.viewer.frame(at.bbox, at.sectionZ);
}

function fix(r: CheckResult): void {
  if (r.fix !== undefined) applyFix(props.core, r.fix);
}

const picker = ref<HTMLInputElement | null>(null);

async function openFile(f: File | undefined): Promise<void> {
  if (f === undefined) return;
  emit("open", await f.text());
}

function verb(id: string): void {
  if (id === "undo") props.core.undo();
  else if (id === "redo") props.core.redo();
  else if (id === "open") picker.value?.click();
  else if (id === "save") emit("export", "json");
  else if (id === "guide") props.welcome.reopen();
}

function onKey(e: KeyboardEvent): void {
  const t = e.target as HTMLElement | null;
  if (t !== null && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) return;
  if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
  e.preventDefault();
  if (e.shiftKey) props.core.redo();
  else props.core.undo();
}

function onDrop(e: DragEvent): void {
  const f = e.dataTransfer?.files?.[0];
  if (f === undefined) return;
  e.preventDefault();
  void openFile(f);
}
const onDragOver = (e: DragEvent): void => e.preventDefault();

// hackbuild-ui renders the guide verbs and the welcome close and starts
// without data-hb hooks; the smoke and hook specs locate them by data-hb.
const root = ref<{ $el: HTMLElement } | null>(null);
function tagHooks(): void {
  const el = root.value?.$el;
  if (el === undefined || !(el instanceof HTMLElement)) return;
  el.querySelectorAll<HTMLButtonElement>(".hb-guide-verbs button").forEach((b) => {
    b.dataset["hb"] = b.getAttribute("aria-label") ?? "";
  });
  el.querySelectorAll<HTMLElement>(".hb-steps .hb-tab").forEach((b, i) => {
    b.classList.toggle("is-visited", marks.value[i]?.visited === true);
    b.dataset["visited"] = String(marks.value[i]?.visited === true);
  });
  el.querySelectorAll<HTMLElement>(".hb-welcome-close").forEach((b) => (b.dataset["hb"] = "welcome-dismiss"));
  el.querySelectorAll<HTMLElement>(".hb-welcome .hb-tile").forEach((b, i) => {
    b.dataset["hb"] = "welcome-start";
    b.dataset["start"] = starts.value[i]?.id ?? "";
  });
  tagPink(el);
}

let tagger: MutationObserver | null = null;

onMounted(() => {
  if (host.value !== null && props.stage) {
    try {
      stage = mountBakeStage(host.value);
    } catch (e) {
      props.core.appendLog(`3d view failed: ${e instanceof Error ? e.message : String(e)}. the rail still works.`);
    }
  }
  document.documentElement.dataset["three"] = stage?.revision ?? "";
  if (stage !== null && cams.value[0] !== undefined) stage.viewer.cam = cams.value[0];
  paintStage();
  enterStep(shell.step);
  host.value?.addEventListener("pick", onPick);
  host.value?.addEventListener("camchange", onCamChange);
  window.addEventListener("keydown", onKey);
  window.addEventListener("resize", onResize);
  window.addEventListener("dragover", onDragOver);
  window.addEventListener("drop", onDrop);
  tagHooks();
  const el = root.value?.$el;
  if (el instanceof HTMLElement) {
    tagger = new MutationObserver(tagHooks);
    tagger.observe(el, { childList: true, subtree: true });
  }
});

onBeforeUnmount(() => {
  host.value?.removeEventListener("pick", onPick);
  host.value?.removeEventListener("camchange", onCamChange);
  window.removeEventListener("keydown", onKey);
  window.removeEventListener("resize", onResize);
  window.removeEventListener("dragover", onDragOver);
  window.removeEventListener("drop", onDrop);
  tagger?.disconnect();
  stage?.dispose();
  stage = null;
});

watch(() => shell.result, paintStage);
watch(() => shell.held, paintHeld);
watch(marks, () => nextTick(tagHooks));
// Entering the export step runs the build and every check (step 9).
watch(() => shell.step, (i) => {
  if (i === exportStep.value) props.core.ensureMesh().catch(() => undefined);
  enterStep(i);
});

// Step entry applies the step's declared view and camera (P-08, G-44), as
// TANG R6's goStep opens under on the underside step and plate on the print
// step (tang-r6 src/06_app.js line 219). A view a step turned on goes off on
// a step that declares none, as TANG returns plate to iso on the early steps.
let stepMode: string | null = null;
function enterStep(i: number): void {
  const s = steps.value[i];
  if (s === undefined) return;
  const def = props.bench.views.default;
  const want = s.view !== undefined && s.view !== def && props.bench.views.modes.includes(s.view) ? s.view : null;
  if (s.view === def) for (const m of shell.modes.filter((x) => props.bench.views.modes.includes(x as ViewMode))) toggleMode(m);
  else if (stepMode !== null && stepMode !== want && shell.modes.includes(stepMode)) toggleMode(stepMode);
  stepMode = want;
  if (want !== null && !shell.modes.includes(want)) toggleMode(want);
  const cam = cams.value.find((c) => c === s.cam);
  if (cam !== undefined) setCam(cam);
}

// ---- rail and status
const ctx = computed<PanelCtx>(() => ({
  values: shell.values,
  results: shell.report.results ?? [],
  metrics: shell.report.metrics ?? [],
  envelope: shell.report.envelope ?? null,
  part: (shell.result?.part as ViewPart | undefined)?.part as PanelCtx["part"] ?? null,
  exports: props.chase.exports,
  writable: props.writable,
  fabrication: props.fabrication,
  current: shell.current,
  valueAt: (p: string) => props.core.get(p.slice(1).split("/").join(".")),
  log: shell.log,
  notes: shell.report.notes ?? {},
  plots: props.bench.plots ?? {},
  drive: props.bench.views.drive ?? null,
  contact: props.contact,
  held: shell.held,
}));

const pill = computed<{ status: "ok" | "warn" | "err"; text: string }>(() => {
  // The header pill is never is-live: its pink would spend the view's one focal pink (UI.md section 10).
  if (shell.building || shell.busy) return { status: "warn", text: "building" };
  if (shell.error !== null) return { status: "err", text: "build failed" };
  if (shell.current) return { status: "ok", text: "mesh current" };
  return { status: "warn", text: "mesh stale" };
});
// The status strip names the view it describes (G-45, CHECKS.md 2.7): the
// plate in plate view, else the part of a single kind or the scene of a composer.
const scope = computed<"plate" | "scene" | "part">(() =>
  shell.modes.includes("plate") ? "plate" : props.chase.meta.kind === "composer" ? "scene" : "part");
// fits bed or over bed: CHK-PRT-16 over every plate object, else what the build reported (G-18).
const bed = computed<boolean | null>(() => bedFits(shell.report.results ?? []) ?? shell.report.fitsBed ?? null);
const dims = computed(() => {
  const d = shell.report.dims;
  return d == null ? null : d.map((x) => Number(x.toFixed(2))).join(" x ");
});
</script>

<template>
  <HbAppShell v-if="region !== undefined" ref="root" class="hbf-bench" :class="[region.layout, `hbf-layout-${layout}`, { 'is-no-readouts': !rightRail }]" data-hb="bench" :data-kind="chase.meta.kind">
    <template #header>
      <HbHeader :title="chase.meta.name" accent="." suffix="bench" :tagline="bench.welcome?.tagline ?? ''" tagline-kind="tool">
        <HbPill :status="pill.status" data-hb="status-pill">{{ pill.text }}</HbPill>
      </HbHeader>
    </template>
    <template #tabs>
      <HbSteps :steps="stepOptions" :model-value="shell.step" label="steps" data-hb="steps" @update:model-value="(v) => shell.goto(Number(v))" />
    </template>
    <template #toolbar>
      <HbGuide :step="shell.step + 1" :name="stepNow?.step ?? ''" :goal="stepNow?.goal ?? ''" data-hb="guide-strip" @verb="verb" />
      <input ref="picker" class="hb-sr" type="file" accept=".json,application/json" tabindex="-1" aria-hidden="true" @change="(e) => openFile((e.target as HTMLInputElement).files?.[0])" />
    </template>

    <div :class="layout === 'composer' ? 'hbf-composer' : ['hbf-single', { 'is-stage-only': layout === 'single3' && !stepHasDesign }]">
      <aside v-if="layout === 'single2' || (layout === 'single3' && stepHasDesign)" class="hbf-rail-left" data-hb="rail-left" aria-label="design">
        <Rail
          :steps="steps"
          :step="shell.step"
          :groups="chase.params"
          :materials="chase.materials"
          :ctx="ctx"
          :side="layout === 'single3' ? 'design' : 'all'"
          @edit="edit"
          @locate="locate"
          @fix="fix"
          @export="(k: string) => emit('export', k)"
        />
      </aside>
      <HbStageOverlay :graph="bench.views.stage === 'graph'" :quiet="shell.welcomeOpen" class="hbf-stage" data-hb="stage">
        <div ref="host" class="hbf-viewer-host" />
        <template v-if="overlays.has('cams')" #tl>
          <div class="hbf-camstrip" role="group" aria-label="view">
            <HbSelect
              v-if="narrow && cams.length > 0"
              class="hbf-cam-select"
              :options="camOptions"
              :model-value="shell.cam"
              aria-label="camera"
              data-hb="cam-select"
              @update:model-value="(c) => c !== '' && setCam(c as CamName)"
            />
            <button
              v-for="c in narrow ? [] : cams"
              :key="c"
              type="button"
              class="hbf-cam"
              :aria-pressed="shell.cam === c"
              data-hb="cam"
              :data-cam="c"
              @click="setCam(c)"
            >{{ c }}</button>
            <button
              v-for="m in modes"
              :key="m"
              type="button"
              class="hbf-cam"
              :aria-pressed="shell.modes.includes(m)"
              data-hb="mode"
              :data-mode="m"
              @click="toggleMode(m)"
            >{{ m }}</button>
            <button
              v-for="r in renders"
              :key="r"
              type="button"
              class="hbf-cam"
              :aria-pressed="shell.modes.includes(r)"
              data-hb="render"
              :data-render="r"
              @click="toggleMode(r)"
            >{{ r }}</button>
          </div>
        </template>
        <template v-if="overlays.has('legend')" #tr>
          <Legend :materials="chase.materials" :notes="modeNotes" />
        </template>
        <template v-if="overlays.has('drive') && padModel !== null" #bl>
          <DrivePad :model="padModel" :held="shell.held" :pick-in-view="pickInView" @drive="drive" />
        </template>
        <template v-if="overlays.has('busy') && shell.busy" #br>
          <span class="hbf-busy" data-hb="busy" role="status"><HbSpinner /> building</span>
        </template>
        <template v-if="overlays.has('welcome') && shell.welcomeOpen" #center>
          <HbWelcome
            :open="shell.welcomeOpen"
            :title="chase.meta.name"
            accent="."
            suffix="bench"
            :note="bench.welcome?.tagline ?? ''"
            :steps="steps.map((s) => ({ name: s.step, text: s.goal }))"
            :starts="starts"
            data-hb="welcome"
            @close="welcome.dismiss()"
            @start="(id: string) => { emit('start', id); welcome.dismiss(); }"
          />
        </template>
      </HbStageOverlay>
    </div>

    <template v-if="rightRail" #rail>
      <Rail
        :steps="steps"
        :step="shell.step"
        :groups="chase.params"
        :materials="chase.materials"
        :ctx="ctx"
        :side="layout === 'single3' ? 'readouts' : 'all'"
        data-hb="rail"
        @edit="edit"
        @locate="locate"
        @fix="fix"
        @export="(k: string) => emit('export', k)"
      />
    </template>

    <template #statusbar>
      <HbStatusBar data-hb="status">
        <span class="hbf-scope" :data-scope="scope" title="what this strip describes">{{ scope }}</span>
        <span v-if="dims !== null" title="computed" data-hb="dims">{{ dims }} mm</span>
        <span v-if="shell.report.tris !== undefined" title="computed" data-hb="tris">{{ shell.report.tris }} tris</span>
        <span v-if="shell.result !== null" title="measured in this browser" data-hb="build-ms">build {{ Math.round(shell.result.ms) }} ms</span>
        <span v-if="shell.error !== null" class="hbf-status-err" data-hb="status-error">{{ shell.error }}</span>
        <button type="button" class="hbf-chip hbf-log-toggle" :aria-expanded="logOpen" aria-controls="hbf-log" data-hb="log-toggle" @click="logOpen = !logOpen">log {{ shell.log.length }}</button>
        <span class="hbf-status-chips">
          <span v-if="bed !== null" class="hbf-chip" :class="bed ? 'is-good' : 'is-bad'" data-hb="chip-bed">{{ bed ? "fits bed" : "over bed" }}</span>
          <span class="hbf-chip" :class="shell.current ? 'is-good' : 'is-bad'" data-hb="chip-mesh">{{ shell.current ? "mesh current" : "mesh stale" }}</span>
          <span class="hbf-chip" :class="shell.findings === 0 ? 'is-good' : 'is-bad'" data-hb="chip-warn">{{ shell.findings === 0 ? "no warnings" : `${shell.findings} warnings` }}</span>
          <Legend :materials="chase.materials" where="status" />
        </span>
      </HbStatusBar>
      <div v-if="logOpen" id="hbf-log" class="hbf-log-drawer" data-hb="log-drawer">
        <LogPanel :log="shell.log" />
      </div>
    </template>
  </HbAppShell>
</template>
