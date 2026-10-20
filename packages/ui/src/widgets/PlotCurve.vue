<script setup lang="ts">
// The plot.curve drawing (plan v9 section 3.2, PIP drawCurve, lineage
// pip.bench-part3): a CurveView as SVG, the claim band shaded behind the
// curve, the contact line, the peak dot, coupon points, the travel cursor
// and a travel slider that emits the dragged travel. It computes no
// number: the `plot.<id>` rail panel (CurvePanel.vue, panels/curve.ts
// curveView) and the plot.curve widget (ui-core widgets/curve.ts) build
// the view and the lines, so both draw through this one component. The
// SVG scales to its box from a viewBox, so it fits 390 px and 1280 px.
import { computed, type PropType } from "vue";
import { HbPanel } from "@virgilvox/hackbuild-ui";
import type { CurveView } from "@hackbuild/ui-core";
import { curveSvg, FRAME } from "../panels/curve.js";

// Runtime props typed with PropType: the SFC compiler cannot resolve a
// relative imported type in defineProps<T> inside the bake.
const props = defineProps({
  view: { type: Object as PropType<CurveView>, required: true },
  heading: { type: String, required: true },
  plotId: { type: String, required: true },
  xUnit: { type: String, default: "mm" },
  yUnit: { type: String, default: "N" },
  marks: { type: Array as PropType<readonly string[]>, default: () => ["contact", "peak"] },
  /** The cursor readout line, each number with its qualifier. */
  readout: { type: String, required: true },
  /** The band line, or null with no band. */
  bandLine: { type: String as PropType<string | null>, default: null },
});

const emit = defineEmits<{ travel: [mm: number] }>();

const svg = computed(() => curveSvg(props.view));
const marked = computed(() => new Set(props.marks));
const step = computed(() => Math.max(props.view.stopMm / 200, 0.001));

function onInput(e: Event): void {
  emit("travel", Number((e.target as HTMLInputElement).value));
}
</script>

<template>
  <HbPanel :heading="heading" head="instrument" data-hb="plot-curve" :data-plot="plotId">
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
          <text :x="FRAME.w - 30" :y="FRAME.h - 5">{{ xUnit }}</text>
          <text :x="4" :y="12">{{ yUnit }}</text>
        </g>
        <template v-if="marked.has('contact') && view.contactMm !== null">
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
          v-if="marked.has('peak') && view.peak !== null"
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
          :aria-label="`travel, ${xUnit}`"
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
