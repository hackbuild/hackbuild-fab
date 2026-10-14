<script setup lang="ts">
// The stage legend (M09-T07 steps 5 and 6, D-125): slot number, material,
// role, in VT323 on the void at the stage's top right, and the same slots as
// chips in the status strip. hackbuild-ui's own rule swaps the two under
// 640 px, so the legend collapses to chips and is never hidden. It is the
// colour key on every step (D-221). Mode notes ride under it in lit colours.
import { computed } from "vue";
import { HbMaterials, type HbMaterialSlot } from "@virgilvox/hackbuild-ui";
import type { MaterialSlot } from "@hackbuild/spec";

interface Props {
  materials: readonly MaterialSlot[];
  /** stage: the legend on the void. status: the chip strip. */
  where?: "stage" | "status";
  /** One line per active view mode, for example the section cut. */
  notes?: readonly string[];
}

const props = withDefaults(defineProps<Props>(), { where: "stage", notes: () => [] });

/** A slot without a preview colour takes a stage part token, in slot order. */
const PART_TOKENS = ["--hb-part-a", "--hb-part-b", "--hb-part-c", "--hb-part-d", "--hb-part-e", "--hb-part-f"] as const;

const slots = computed<HbMaterialSlot[]>(() =>
  props.materials.map((m, i) => ({
    slot: m.slot,
    color: m.preview ?? `var(${PART_TOKENS[i % PART_TOKENS.length]})`,
    material: m.material,
    parts: m.label,
    role: m.label === undefined ? m.role : `${m.role}, ${m.label}`,
  })),
);
</script>

<template>
  <HbMaterials v-if="where === 'stage'" variant="legend" :slots="slots" label="legend" data-hb="legend">
    <span v-for="n in notes" :key="n" class="hb-legend-role" data-hb="mode-note">{{ n }}</span>
  </HbMaterials>
  <HbMaterials v-else variant="chips" :slots="slots" label="legend" data-hb="legend-chips" />
</template>
