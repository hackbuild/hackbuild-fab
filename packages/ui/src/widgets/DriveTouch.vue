<script setup lang="ts">
// The drive.touch widget (plan v9 section 3.2): one pad per touch port the
// charge-release check read on this build; a pad is touched while the
// pointer or the keyboard holds it, as the drive pad holds a key
// (DrivePad.vue, PIP part3.js renderPad). It emits the touch and draws the
// model the host rebuilds (ui-core widgets/touch.ts): one readout line per
// pad, pin, level, path and timing, each number with its qualifier. It
// computes no number.
import { computed } from "vue";
import { touchLine, type TouchModel } from "@hackbuild/ui-core";

interface Props {
  model: TouchModel;
}

const props = defineProps<Props>();
const emit = defineEmits<{ touch: [port: string, value: boolean] }>();

const lines = computed(() => (props.model.pads.length === 0 ? [props.model.problem ?? ""] : props.model.pads.map(touchLine)));
const label = (port: string): string => (port.startsWith("port.") ? port.slice("port.".length) : port);

function down(e: PointerEvent, port: string): void {
  e.preventDefault();
  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  emit("touch", port, true);
}

function up(port: string, closed: boolean): void {
  if (closed) emit("touch", port, false);
}

function key(e: KeyboardEvent, port: string, value: boolean, closed: boolean): void {
  if (e.key !== "Enter" && e.key !== " ") return;
  e.preventDefault();
  if (e.repeat) return;
  if (value || closed) emit("touch", port, value);
}
</script>

<template>
  <div class="hbf-pad" data-hb="drive-touch" :data-widget="model.id">
    <div class="hbf-pad-t"><span>TOUCH</span><span data-hb="drive-mode">hold a pad to touch it</span></div>
    <div v-if="model.pads.length > 0" class="hbf-pad-keys" role="group" aria-label="touch pads">
      <button
        v-for="p in model.pads"
        :key="p.port"
        type="button"
        class="hbf-pad-key"
        :class="{ 'is-on': p.closed }"
        :aria-pressed="p.closed"
        data-hb="touch-pad"
        :data-port="p.port"
        @pointerdown="(e: PointerEvent) => down(e, p.port)"
        @pointerup="up(p.port, p.closed)"
        @pointercancel="up(p.port, p.closed)"
        @keydown="(e: KeyboardEvent) => key(e, p.port, true, p.closed)"
        @keyup="(e: KeyboardEvent) => key(e, p.port, false, p.closed)"
        @blur="up(p.port, p.closed)"
      >{{ label(p.port) }}</button>
    </div>
    <div class="hbf-pad-read" data-hb="touch-read" role="status" aria-live="polite">
      <span v-for="(l, i) in lines" :key="i" class="hbf-pad-line">{{ l }}</span>
    </div>
  </div>
</template>
