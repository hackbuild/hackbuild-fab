<script setup lang="ts">
// The plot.curve rail panel (plan v9 section 3.2, PIP drawCurve): force
// against travel from the build's sampled curve, the claim band shaded
// behind it, the contact line where the design's ContactFn closes, the
// peak dot, the travel cursor and a slot for coupon points. Dragging the
// travel slider calls the same ContactFn the drive pad calls (G-20);
// holding the pad moves the cursor to the hold travel. Every number comes
// from curve.ts curveView, which the unit test holds; PlotCurve.vue draws
// it, as it draws the plot.curve widget.
import { computed, ref, watch, type PropType } from "vue";
import type { ContactFn, DriveReadout } from "@hackbuild/spec";
import { fmt } from "@hackbuild/bench-core";
import PlotCurve from "../widgets/PlotCurve.vue";
import { curveView, type CurveEntry, type CurveInputs } from "./curve.js";

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
const plot = computed(() => props.inputs.plot);
const heading = computed(() => (plot.value === null ? props.inputs.plotId : `${plot.value.y.label} against ${plot.value.x.label}`));

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

function onTravel(mm: number): void {
  dragged.value = mm;
}
</script>

<template>
  <PlotCurve
    :view="view"
    :heading="heading"
    :plot-id="inputs.plotId"
    :x-unit="plot?.x.unit ?? 'mm'"
    :y-unit="plot?.y.unit ?? 'N'"
    :marks="plot?.marks ?? []"
    :readout="readout"
    :band-line="bandLine"
    @travel="onTravel"
  />
</template>
