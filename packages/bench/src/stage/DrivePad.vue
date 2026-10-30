<script setup lang="ts">
// The drive pad overlay (M09-T10), ported from PIP: the markup of
// bench/part1.html line 190 (DRIVE head, mode line, keys, readout), its
// styles at lines 132 to 140, and renderPad and padRefresh in part3.js
// lines 360 to 392. A key holds while the pointer is down: pointerdown takes
// pointer capture, pointerup and pointercancel release, and the pad sets
// touch-action none so a held finger never scrolls the page. Enter and
// space hold it from the keyboard. The readout is one line per held key
// from bench-core padLines; the pad itself computes nothing.
import { computed } from "vue";
import { padLines, type PadModel } from "@hackbuild/bench-core";

interface Props {
  model: PadModel;
  held: readonly string[];
  /** A click on a key in the 3D view also drives it (DriveDecl.pickInView). */
  pickInView?: boolean;
}

const props = withDefaults(defineProps<Props>(), { pickInView: false });
const emit = defineEmits<{ drive: [target: string, value: boolean] }>();

const hint = computed(() => (props.pickInView ? "hold a key, or click one in the view" : "hold a key"));
const lines = computed(() => (props.model.problem !== null ? [props.model.problem] : padLines(props.model, props.held)));

function down(e: PointerEvent, target: string): void {
  e.preventDefault();
  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  emit("drive", target, true);
}

function up(target: string): void {
  if (props.held.includes(target)) emit("drive", target, false);
}

function key(e: KeyboardEvent, target: string, value: boolean): void {
  if (e.key !== "Enter" && e.key !== " ") return;
  e.preventDefault();
  if (e.repeat) return;
  if (value || props.held.includes(target)) emit("drive", target, value);
}
</script>

<template>
  <div class="hbf-pad" data-hb="drive-pad">
    <div class="hbf-pad-t"><span>DRIVE</span><span data-hb="drive-mode">{{ hint }}</span></div>
    <div v-if="model.targets.length > 0" class="hbf-pad-keys" role="group" aria-label="drive keys">
      <button
        v-for="t in model.targets"
        :key="t.target"
        type="button"
        class="hbf-pad-key"
        :class="{ 'is-on': held.includes(t.target) }"
        :aria-pressed="held.includes(t.target)"
        data-hb="drive-key"
        :data-target="t.target"
        @pointerdown="(e: PointerEvent) => down(e, t.target)"
        @pointerup="up(t.target)"
        @pointercancel="up(t.target)"
        @keydown="(e: KeyboardEvent) => key(e, t.target, true)"
        @keyup="(e: KeyboardEvent) => key(e, t.target, false)"
        @blur="up(t.target)"
      >{{ t.target }}</button>
    </div>
    <div class="hbf-pad-read" data-hb="drive-read" role="status" aria-live="polite">
      <span v-for="(l, i) in lines" :key="i" class="hbf-pad-line">{{ l }}</span>
    </div>
  </div>
</template>
