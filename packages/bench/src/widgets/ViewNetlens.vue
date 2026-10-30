<script setup lang="ts">
// The view.netlens widget (plan v9 section 3.2: net highlighting): one
// button per net of the Part IR; the pressed net is lit and every other
// body ghosts. It emits the net; the host hands the model's `net` to the
// viewer's lens property, and the bodies come from viewer bodyNets, the
// rule the viewer's xray reads.
import { computed } from "vue";
import { netlensLine, type NetlensModel } from "@hackbuild/bench-core";

interface Props {
  model: NetlensModel;
}

const props = defineProps<Props>();
const emit = defineEmits<{ lens: [id: string, net: string] }>();

const lit = computed(() => (typeof props.model.outputs["net"] === "string" ? (props.model.outputs["net"] as string) : null));
const line = computed(() => netlensLine(props.model));
</script>

<template>
  <div class="hbf-pad" data-hb="view-netlens" :data-widget="model.id">
    <div class="hbf-pad-t"><span>NETS</span><span data-hb="drive-mode">pick a net to light it</span></div>
    <div v-if="model.nets.length > 0" class="hbf-pad-keys" role="group" aria-label="nets">
      <button
        v-for="n in model.nets"
        :key="n"
        type="button"
        class="hbf-pad-key"
        :class="{ 'is-on': n === lit }"
        :aria-pressed="n === lit"
        data-hb="netlens-net"
        :data-net="n"
        @click="emit('lens', model.id, n)"
      >{{ n }}</button>
    </div>
    <div class="hbf-pad-read" data-hb="netlens-read" role="status" aria-live="polite">
      <span class="hbf-pad-line">{{ line }}</span>
    </div>
  </div>
</template>
