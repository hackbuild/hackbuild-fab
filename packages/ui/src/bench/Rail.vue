<script setup lang="ts">
// The rail (M09-T07 step 7): one pane per rail step, the current one shown.
// Materials (swatch, extruder, material, parts, role) are a step pane when a
// step declares "materials", else a fold at the top of the first step
// (D-221 gold default). Then the step's declared panels in order, each from
// the panel registry. `side` splits a step for the single kind: the design
// rail on the left takes the params panels, the readout rail on the right
// takes the rest.
import { computed } from "vue";
import { HbFold, HbMaterials, HbPanel, type HbMaterialSlot } from "@virgilvox/hackbuild-ui";
import type { CheckResult, MaterialSlot, ParamGroup, RailStep } from "@hackbuild/spec";
import type { Located } from "@hackbuild/ui-core";
import ParamRail from "../rail/ParamRail.vue";
import NotesPanel from "../panels/NotesPanel.vue";
import { resolvePanel, type PanelCtx } from "./panels.js";
import type { CommitKind } from "../rail/context.js";

interface Props {
  steps: readonly RailStep[];
  step: number;
  groups: readonly ParamGroup[];
  materials: readonly MaterialSlot[];
  ctx: PanelCtx;
  side?: "all" | "design" | "readouts";
}

const props = withDefaults(defineProps<Props>(), { side: "all" });
const emit = defineEmits<{
  edit: [path: string, value: unknown, kind: CommitKind];
  locate: [result: CheckResult, at: Located, index: number];
  fix: [result: CheckResult, index: number];
  export: [kind: string];
}>();

const current = computed(() => props.steps[props.step] ?? null);
const isParams = (id: string): boolean => id.startsWith("params.");
// The log lives in the status drawer (BenchShell), so a step with no readout panel leaves no rail to show.
const panels = computed(() =>
  (current.value?.panels ?? [])
    .filter((id) => props.side === "all" || (props.side === "design") === (isParams(id) || id === "materials"))
    .map((id) => ({ id, r: resolvePanel(id, props.groups) })),
);
const materialsFold = computed(
  () => props.step === 0 && props.side !== "readouts" && !props.steps.some((s) => s.panels.includes("materials")),
);
const slots = computed<HbMaterialSlot[]>(() =>
  props.materials.map((m) => ({ slot: m.slot, color: m.preview ?? "var(--hb-part-e)", material: m.material, ...(m.label === undefined ? {} : { parts: m.label }), role: m.role })),
);
</script>

<template>
  <div class="hbf-pane" data-hb="pane" :data-step="current?.step" :data-side="side">
    <HbFold v-if="materialsFold" summary="materials" data-hb="materials-fold">
      <HbMaterials variant="rail" :slots="slots" />
    </HbFold>
    <template v-for="p in panels" :key="p.id">
      <ParamRail
        v-if="p.r.kind === 'params'"
        :group="p.r.group"
        :values="ctx.values"
        :envelope="ctx.envelope"
        :metrics="new Map(ctx.metrics.map((m) => [m.id, m]))"
        @edit="(path: string, v: unknown, k: CommitKind) => emit('edit', path, v, k)"
      />
      <NotesPanel v-else-if="p.r.kind === 'notes'" :id="p.r.id" :heading="p.r.heading" :note="p.r.note(ctx)" />
      <HbPanel v-else-if="p.r.kind === 'materials'" heading="materials" head="instrument" data-hb="materials">
        <HbMaterials variant="rail" :slots="slots" />
      </HbPanel>
      <component
        :is="p.r.entry.component"
        v-else-if="p.r.kind === 'panel'"
        v-bind="p.r.entry.props(ctx)"
        @locate="(r: CheckResult, at: Located, i: number) => emit('locate', r, at, i)"
        @fix="(r: CheckResult, i: number) => emit('fix', r, i)"
        @export="(k: string) => emit('export', k)"
      />
      <HbPanel v-else :heading="p.r.id" head="instrument" data-hb="panel-absent" :data-panel="p.r.id">
        <p class="hbf-note">the {{ p.r.id }} panel is not in this bench yet.</p>
      </HbPanel>
    </template>
  </div>
</template>
