<script setup lang="ts">
// The drive.press widget (plan v9 section 3.2): one key of the build the
// pointer drags down by travel; on release it springs back to zero. The
// drag maps the key's own height to the full stop the design's ContactFn
// gives at a hold, so no pixel scale is typed here. It emits the travel
// and draws the model the host rebuilds at that travel (bench-core
// widgets/press.ts): force from the claim function CHK-CLAIM-01 calls,
// contact from the ContactFn the drive pad calls. It computes no number.
// From the keyboard, arrow down and up step the travel and leaving the key
// releases it. The chrome is the drive pad's (DrivePad.vue, PIP part1.html
// line 190); the key row keeps one touch height below the key, the depth
// a full press moves it.
import { computed, ref } from "vue";
import { pressLine, type PressModel } from "@hackbuild/bench-core";

interface Props {
  model: PressModel;
}

const props = defineProps<Props>();
const emit = defineEmits<{ travel: [mm: number] }>();

/** Arrow key steps across the stop. */
const KEY_STEPS = 20;

const travel = computed(() => (typeof props.model.outputs["travel"] === "number" ? (props.model.outputs["travel"] as number) : 0));
const depth = computed(() => (props.model.stopMm > 0 ? Math.min(Math.max(travel.value / props.model.stopMm, 0), 1) : 0));
const closed = computed(() => props.model.outputs["contact"] === true);
const line = computed(() => pressLine(props.model));
const drag = ref<{ y: number; h: number } | null>(null);

function set(mm: number): void {
  emit("travel", Math.min(Math.max(mm, 0), props.model.stopMm));
}

function down(e: PointerEvent): void {
  e.preventDefault();
  const el = e.currentTarget as HTMLElement;
  el.setPointerCapture?.(e.pointerId);
  drag.value = { y: e.clientY, h: el.getBoundingClientRect().height || 1 };
}

function move(e: PointerEvent): void {
  if (drag.value === null) return;
  set(((e.clientY - drag.value.y) / drag.value.h) * props.model.stopMm);
}

function up(): void {
  drag.value = null;
  if (travel.value !== 0) emit("travel", 0);
}

function key(e: KeyboardEvent): void {
  const step = props.model.stopMm / KEY_STEPS;
  if (e.key === "ArrowDown") set(travel.value + step);
  else if (e.key === "ArrowUp") set(travel.value - step);
  else return;
  e.preventDefault();
}
</script>

<template>
  <div class="hbf-pad" data-hb="drive-press" :data-widget="model.id">
    <div class="hbf-pad-t"><span>PRESS</span><span data-hb="drive-mode">drag the key down, let go to release</span></div>
    <div v-if="model.target !== null" class="hbf-pad-keys" role="group" aria-label="press key" style="padding-bottom: var(--hbf-touch)">
      <button
        type="button"
        class="hbf-pad-key"
        :class="{ 'is-on': closed }"
        role="slider"
        :aria-valuemin="0"
        :aria-valuemax="model.stopMm"
        :aria-valuenow="travel"
        :aria-valuetext="line"
        aria-label="key travel, mm"
        data-hb="press-key"
        :data-target="model.target"
        :style="{ transform: `translateY(calc(var(--hbf-touch) * ${depth}))` }"
        @pointerdown="down"
        @pointermove="move"
        @pointerup="up"
        @pointercancel="up"
        @keydown="key"
        @blur="up"
      >{{ model.target }}</button>
    </div>
    <div class="hbf-pad-read" data-hb="press-read" role="status" aria-live="polite">
      <span class="hbf-pad-line">{{ line }}</span>
    </div>
  </div>
</template>
