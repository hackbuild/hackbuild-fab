<script setup lang="ts">
// A bench controller drawn in a host app's own component tree: the
// alternative to controller.mount(el). The host renders
// <BenchView :bench="controller" /> where it wants the bench. The view hands
// the controller's Pinia to its subtree, so the shell store the components
// read is the one the controller mirrors its core into, whatever Pinia the
// host app installed. Two views of two controllers in one app keep separate
// state for that reason. The view does not own the controller: call
// controller.unmount() to dispose the core when the host is done with it.
// The controller is read once at setup; key the view to swap controllers.
import { onBeforeUnmount, onMounted, provide, ref } from "vue";
import { piniaSymbol } from "pinia";
import ChaseBench from "./ChaseBench.vue";
import type { BenchController } from "./entry.js";

interface Props {
  bench: BenchController;
}

const props = defineProps<Props>();
const bench = props.bench;
provide(piniaSymbol, bench.pinia);

const inner = ref<{ $el: unknown } | null>(null);
onMounted(() => {
  const el = inner.value?.$el;
  if (el instanceof HTMLElement) bench.attach(el);
});
onBeforeUnmount(() => bench.attach(null));
</script>

<template>
  <ChaseBench ref="inner" :binding="bench.binding" :stage="bench.view.stage" :draft="bench.view.draft" :widget="bench.view.widget" :offline="bench.view.offline" />
</template>
