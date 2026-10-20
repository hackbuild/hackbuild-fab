<script setup lang="ts">
// The plot.curve panel (plan v9 section 3.2, PIP drawCurve): force against
// travel from the build's sampled curve, the claim band shaded behind it,
// the contact line where the design's ContactFn closes, the peak dot, the
// travel cursor and a slot for coupon points. Dragging the travel slider
// calls the same ContactFn the drive pad calls (G-20); holding the pad
// moves the cursor to the hold travel. Every number comes from curve.ts
// curveView, which the unit test holds.
import { computed, ref, watch, type PropType } from "vue";
import type { ContactFn, DriveReadout } from "@hackbuild/spec";
import { HbPanel } from "@virgilvox/hackbuild-ui";
import { fmt } from "@hackbuild/ui-core";
import { curveSvg, curveView, FRAME, type CurveEntry, type CurveInputs } from "./curve.js";

// Runtime props typed with PropType: the SFC compiler cannot resolve a
// relative imported type in defineProps<T> inside the bake. The keys are
// the registry entry shape, curve.ts CurveEntry.
const props = defineProps({
  kind: { type: String as PropType<CurveEntry["kind"]>, required: true },
  fn: { type: Function as PropType<ContactFn | null>, default: null },
  inputs: { type: Object as PropType<CurveInputs>, required: true },
  outputs: { type: Array as PropType<readonly DriveReadout[]>, required: true },
  tolerance: { type: Number, required: true },
});

const dragged = ref<number | null>(null);
// A pad hold or release takes the cursor back from the slider.
watch(() => props.inputs.held, () => {
  dragged.value = null;
});

const entry = computed<CurveEntry>(() => ({ kind: props.kind, fn: props.fn, inputs: props.inputs, outputs: props.outputs, tolerance: props.tolerance }));
const view = computed(() => curveView(entry.value, dragged.value));
const svg = computed(() => curveSvg(view.value));
const plot = computed(() => props.inputs.plot);
const heading = computed(() => (plot.value === null ? props.inputs.plotId : `${plot.value.y.label} against ${plot.value.x.label}`));
const marks = computed(() => new Set(plot.value?.marks ?? []));
const step = computed(() => Math.max(view.value.stopMm / 200, 0.001));

const readout = computed(() => {
  const c = view.value.cursor;
  if (c === null) return "no drive on this bench. the cursor needs the contact function.";
  const parts: string[] = [];
  if (props.outputs.includes("travel")) parts.push(`travel ${fmt(c.travelMm)} mm`);
  if (props.outputs.includes("force")) parts.push(c.forceN === null ? "force unknown" : `force ${fmt(c.forceN)} N computed`);
  if (props.outputs.includes("logic")) parts.push(c.closed ? "closed" : "open");
  return parts.join(", ");
});

const bandLine = computed(() => {
  const b = view.value.band;
  return b === null ? null : `claim band ${fmt(b.lo)} to ${fmt(b.hi)} N, inferred, unproven until coupon`;
});

function onInput(e: Event): void {
  dragged.value = Number((e.target as HTMLInputElement).value);
}
</script>

<template>
  <HbPanel :heading="heading" head="instrument" data-hb="plot-curve" :data-plot="inputs.plotId">
    <p v-if="view.problem !== null" class="hbf-note">{{ view.problem }}</p>
    <template v-else>
      <svg
        :viewBox="`0 0 ${FRAME.w} ${FRAME.h}`"
        role="img"
        :aria-label="`${heading}, ${view.points.length} computed samples`"
        data-hb="plot-svg"
        style="display: block; width: 100%; height: auto; background: var(--hb-void); border: var(--hb-border) solid var(--hb-ink)"
      >
        <rect
          v-if="view.band !== null"
          data-hb="plot-band"
          :x="svg.x(0)"
          :y="svg.y(view.band.hi)"
          :width="svg.x(view.stopMm) - svg.x(0)"
          :height="svg.y(view.band.lo) - svg.y(view.band.hi)"
          style="fill: var(--hb-slime); fill-opacity: 0.14"
        />
        <g font-size="13" style="font-family: var(--hb-readout); fill: var(--hb-lit-label)">
          <template v-for="f in svg.yTicks" :key="`y${f}`">
            <line :x1="34" :x2="FRAME.w - 10" :y1="svg.y(f)" :y2="svg.y(f)" style="stroke: var(--hb-ink-border); stroke-width: 1" />
            <text :x="4" :y="svg.y(f) + 4">{{ f.toFixed(1) }}</text>
          </template>
          <text v-for="d in svg.xTicks" :key="`x${d}`" :x="svg.x(d) - 8" :y="FRAME.h - 5">{{ d.toFixed(1) }}</text>
          <text :x="FRAME.w - 30" :y="FRAME.h - 5">{{ plot?.x.unit }}</text>
          <text :x="4" :y="12">{{ plot?.y.unit }}</text>
        </g>
        <template v-if="marks.has('contact') && view.contactMm !== null">
          <line
            data-hb="plot-contact"
            :x1="svg.x(view.contactMm)"
            :x2="svg.x(view.contactMm)"
            :y1="14"
            :y2="FRAME.h - 20"
            style="stroke: var(--hb-lit-warn); stroke-dasharray: 4 4"
          />
          <text :x="svg.x(view.contactMm) + 3" :y="24" font-size="13" style="font-family: var(--hb-readout); fill: var(--hb-lit-warn)">contact</text>
        </template>
        <path data-hb="plot-line" :d="svg.path" style="fill: none; stroke: var(--hb-pink); stroke-width: 2" />
        <circle
          v-if="marks.has('peak') && view.peak !== null"
          data-hb="plot-peak"
          :cx="svg.x(view.peak.d)"
          :cy="svg.y(view.peak.F)"
          r="3.5"
          style="fill: var(--hb-slime)"
        />
        <circle
          v-for="(p, i) in view.measured"
          :key="`m${i}`"
          data-hb="plot-measured"
          :cx="svg.x(p.d)"
          :cy="svg.y(p.F)"
          r="3"
          style="fill: none; stroke: var(--hb-lit-info); stroke-width: 1.5"
        />
        <line
          v-if="view.cursor !== null"
          data-hb="plot-cursor"
          :x1="svg.x(view.cursor.travelMm)"
          :x2="svg.x(view.cursor.travelMm)"
          :y1="14"
          :y2="FRAME.h - 20"
          style="stroke: var(--hb-paper); stroke-width: 1"
        />
      </svg>
      <div v-if="view.cursor !== null" class="hb-slider" data-hb="plot-drive">
        <span class="hb-label">drag travel</span>
        <span class="hb-readout hbf-fit-value" data-hb="plot-readout" role="status" aria-live="polite">{{ readout }}</span>
        <input
          type="range"
          min="0"
          :max="view.stopMm"
          :step="step"
          :value="view.cursor.travelMm"
          aria-label="travel, mm"
          @input="onInput"
        />
      </div>
      <p v-else class="hbf-note">{{ readout }}</p>
      <p v-if="bandLine !== null" class="hbf-note" data-hb="plot-band-line">{{ bandLine }}</p>
      <p class="hbf-note" data-hb="plot-measured-line">
        {{ view.measured.length === 0 ? "no measured points. print the coupon and enter its readings." : `${view.measured.length} measured points` }}
      </p>
    </template>
  </HbPanel>
</template>
