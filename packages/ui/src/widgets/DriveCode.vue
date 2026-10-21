<script setup lang="ts">
// The drive.code widget (plan v9 section 3.2: tumbler and lockbox wheels):
// one button per wheel, a click steps the digit as TUMBLER's code buttons
// do (ui-core nextDigit, tumbler.html line 1906), and a key insertion
// range. It emits the dialed code and the insertion and draws the verdict
// ui-core reads from the gate (widgets/code.ts). It computes no verdict.
import { computed } from "vue";
import { codeLine, nextDigit, type CodeModel } from "@hackbuild/ui-core";

interface Props {
  model: CodeModel;
}

const props = defineProps<Props>();
const emit = defineEmits<{ code: [id: string, code: number[]]; insert: [id: string, insertion: number] }>();

/** Insertion range step, a fraction of the key length (inferred). */
const STEP = 0.01;

const code = computed(() => (Array.isArray(props.model.outputs["code"]) ? (props.model.outputs["code"] as number[]) : []));
const insertion = computed(() => (typeof props.model.outputs["insertion"] === "number" ? (props.model.outputs["insertion"] as number) : 1));
const line = computed(() => codeLine(props.model));

function step(i: number): void {
  const w = props.model.wheels;
  if (w === null) return;
  emit("code", props.model.id, code.value.map((d, j) => (j === i ? nextDigit(d, w.max) : d)));
}

function onInsert(e: Event): void {
  const v = Number((e.target as HTMLInputElement).value);
  if (Number.isFinite(v)) emit("insert", props.model.id, v);
}
</script>

<template>
  <div class="hbf-pad" data-hb="drive-code" :data-widget="model.id">
    <div class="hbf-pad-t"><span>CODE</span><span data-hb="drive-mode">click a wheel to step its digit</span></div>
    <div v-if="model.wheels !== null" class="hbf-pad-keys" role="group" aria-label="code wheels">
      <button
        v-for="(d, i) in code"
        :key="i"
        type="button"
        class="hbf-pad-key"
        :class="{ 'is-on': d > 0 }"
        data-hb="code-wheel"
        :aria-label="`wheel ${i + 1}, digit ${d} of 0 to ${model.wheels.max}`"
        @click="step(i)"
      >{{ d }}</button>
    </div>
    <div v-if="model.wheels !== null" class="hb-slider" data-hb="code-insert">
      <span class="hb-label">key insertion, out to fully in</span>
      <input
        type="range"
        min="0"
        max="1"
        :step="STEP"
        :value="insertion"
        :aria-valuetext="line"
        aria-label="key insertion, fraction of the key"
        @input="onInsert"
      />
    </div>
    <div class="hbf-pad-read" data-hb="code-read" role="status" aria-live="polite">
      <span class="hbf-pad-line">{{ line }}</span>
    </div>
  </div>
</template>
