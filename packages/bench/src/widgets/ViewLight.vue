<script setup lang="ts">
// The view.light widget (plan v9 section 3.2: the coin preview): two
// ranges that aim the stage's key light, around and up. It emits the aim;
// the host hands the model's `at` to the viewer's light property (bench-core
// widgets/light.ts lightAt), so the ranges and the stage read one number.
import { computed } from "vue";
import { EL_RANGE, lightLine, type LightAim, type LightModel } from "@hackbuild/bench-core";

interface Props {
  model: LightModel;
}

const props = defineProps<Props>();
const emit = defineEmits<{ aim: [id: string, aim: LightAim] }>();

/** Range step, degrees (inferred). */
const STEP = 1;

const line = computed(() => lightLine(props.model));

function onInput(e: Event, axis: keyof LightAim): void {
  const v = Number((e.target as HTMLInputElement).value);
  const aim = props.model.aim;
  if (aim !== null && Number.isFinite(v)) emit("aim", props.model.id, { ...aim, [axis]: v });
}
</script>

<template>
  <div class="hbf-pad" data-hb="view-light" :data-widget="model.id">
    <div class="hbf-pad-t"><span>LIGHT</span><span data-hb="drive-mode">rake the key light across the part</span></div>
    <template v-if="model.aim !== null">
      <div class="hb-slider" data-hb="light-az">
        <span class="hb-label">around, degrees</span>
        <input type="range" min="-180" max="180" :step="STEP" :value="model.aim.azDeg" aria-label="key light azimuth, degrees" @input="(e: Event) => onInput(e, 'azDeg')" />
      </div>
      <div class="hb-slider" data-hb="light-el">
        <span class="hb-label">up, degrees</span>
        <input type="range" :min="EL_RANGE[0]" :max="EL_RANGE[1]" :step="STEP" :value="model.aim.elDeg" aria-label="key light elevation, degrees" @input="(e: Event) => onInput(e, 'elDeg')" />
      </div>
    </template>
    <div class="hbf-pad-read" data-hb="light-read" role="status" aria-live="polite">
      <span class="hbf-pad-line">{{ line }}</span>
    </div>
  </div>
</template>
