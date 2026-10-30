<script setup lang="ts">
// The LOG panel of the single kind's readout rail (COLLAR collar.html LOG):
// the bench core's log lines, newest first, in the console face.
import { computed } from "vue";
import { HbConsole, HbPanel, type HbConsoleLine } from "@virgilvox/hackbuild-ui";

interface Props {
  log: readonly string[];
}

const props = defineProps<Props>();
const lines = computed<HbConsoleLine[]>(() =>
  props.log.map((text) => ({ text, level: /failed|refused|not opened|could not/.test(text) ? "err" : "info" })),
);
</script>

<template>
  <HbPanel heading="log" head="instrument" data-hb="log">
    <HbConsole :lines="lines.length > 0 ? lines : [{ text: 'no log lines yet', level: 'info' }]" height="calc(5 * var(--hb-s6))" />
  </HbPanel>
</template>
