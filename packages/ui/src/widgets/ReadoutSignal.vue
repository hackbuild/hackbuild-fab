<script setup lang="ts">
// The readout.signal widget (plan v9 section 3.2): what the MCU reads on
// one hookup pin now, the pin, the level, and the line ui-core writes with
// each number's qualifier (widgets/signal.ts). It draws only; the drive
// widgets change what it reads.
import { computed } from "vue";
import type { PinState } from "@hackbuild/spec";
import { signalLevel, signalLine, type SignalModel } from "@hackbuild/ui-core";

interface Props {
  model: SignalModel;
}

const props = defineProps<Props>();

const pin = computed(() => (typeof props.model.outputs["pin"] === "string" ? (props.model.outputs["pin"] as string) : null));
const level = computed(() => signalLevel((props.model.outputs["level"] ?? null) as PinState | number | null));
const line = computed(() => signalLine(props.model));
</script>

<template>
  <div class="hbf-pad" data-hb="readout-signal" :data-widget="model.id">
    <div class="hbf-pad-t"><span>SIGNAL</span><span v-if="pin !== null" data-hb="signal-pin">{{ pin }} {{ level }}</span></div>
    <div class="hbf-pad-read" data-hb="signal-read" role="status" aria-live="polite">
      <span class="hbf-pad-line">{{ line }}</span>
    </div>
  </div>
</template>
