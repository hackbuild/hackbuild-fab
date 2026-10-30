<script setup lang="ts">
// The drive.fader widget (plan v9 section 3.2: the BLOCKS SLIDER, a finger
// pot): a range from the A end (0) to the B end (1) of the track, the
// finger position BLOCKS's slider control drives (parts.js line 585, step
// 0.01). It emits the position for the pot the widget reads and draws the
// model the host rebuilds (bench-core widgets/fader.ts): the legs, the wiper
// volts and the counts with their qualifier. It computes no number.
import { computed } from "vue";
import { faderLine, type FaderModel } from "@hackbuild/bench-core";

interface Props {
  model: FaderModel;
  /** The finger-pot prefix the widget reads (its WidgetDecl.fn); the position is keyed by it. */
  pot: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{ position: [pot: string, pos: number] }>();

/** The BLOCKS slider control step, a fraction of the travel. */
const STEP = 0.01;

const line = computed(() => faderLine(props.model));

function onInput(e: Event): void {
  const v = Number((e.target as HTMLInputElement).value);
  if (Number.isFinite(v)) emit("position", props.pot, v);
}
</script>

<template>
  <div class="hbf-pad" data-hb="drive-fader" :data-widget="model.id">
    <div class="hbf-pad-t"><span>FADER</span><span data-hb="drive-mode">drag the finger along the track</span></div>
    <div v-if="model.read !== null" class="hb-slider" data-hb="fader-drive">
      <span class="hb-label">finger position, a end to b end</span>
      <input
        type="range"
        min="0"
        max="1"
        :step="STEP"
        :value="model.read.pos"
        :aria-valuetext="line"
        aria-label="finger position, fraction of the track"
        @input="onInput"
      />
    </div>
    <div class="hbf-pad-read" data-hb="fader-read" role="status" aria-live="polite">
      <span class="hbf-pad-line">{{ line }}</span>
    </div>
  </div>
</template>
