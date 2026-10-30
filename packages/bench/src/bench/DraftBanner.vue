<script setup lang="ts">
// The DRAFT banner (plan v9 3.1, R1-engine-24): the first item of the
// status strip on a page hbf draft baked. It says what a draft is: checks
// warn and never block, and every export carries DRAFT until hbf adopt.
// A draft's one inline widget draws into the element beside it after each
// build, from the bench values and the build's metrics.
import { onMounted, ref, watch } from "vue";
import type { DraftWidget } from "./entry.js";
import { useShell } from "../stores/shell.js";

interface Props {
  widget?: DraftWidget | null;
}

const props = withDefaults(defineProps<Props>(), { widget: null });
const shell = useShell();
const host = ref<HTMLElement | null>(null);
const failed = ref<string | null>(null);

function draw(): void {
  const w = props.widget;
  if (w === null || host.value === null) return;
  try {
    w.render(host.value, w.model(shell.values, shell.report.metrics ?? []));
    failed.value = null;
  } catch (e) {
    failed.value = `widget ${w.id} failed: ${e instanceof Error ? e.message : String(e)}. fix widget.ts and bake again.`;
  }
}

onMounted(draw);
watch(() => [shell.rev, shell.report], draw);
</script>

<template>
  <span class="hbf-draft" data-hb="draft-banner" role="status" title="a draft from hbf draft">draft. checks only warn; exports carry DRAFT. run hbf adopt to export clean.</span>
  <span v-if="props.widget !== null" ref="host" class="hbf-draft-widget" data-hb="draft-widget" :data-widget="props.widget.id" />
  <span v-if="failed !== null" class="hbf-status-err" data-hb="draft-widget-error">{{ failed }}</span>
</template>
