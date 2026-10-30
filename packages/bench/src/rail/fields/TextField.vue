<script setup lang="ts">
// text, art and part rows (M09-T08 table). text is a field that commits on
// change. art mounts the art board under its label: the bench hands the
// controller of the param (ART_HOST); the stage takes the canvas while a step
// with the row is active (ART_STAGE) and the row keeps the panel. A host that
// mounts a row alone gets the whole board, and a host that mounts a row alone gets
// one made from the row's own value and edit event. part is the catalog
// picker stub until M10 and says so on the row instead of offering a control
// that does nothing.
import { computed, inject } from "vue";
import { HbInput } from "@virgilvox/hackbuild-ui";
import { artSurfaces, createArtDoc, DOC_FRAME, type ArtDocController } from "@hackbuild/bench-core";
import type { ParamField, ParamPointer } from "@hackbuild/spec";
import ArtBoard from "../../art/ArtBoard.vue";
import { ART_HOST, ART_STAGE, describe, settleKind, type CommitKind } from "../context.js";

type TextLike = Extract<ParamField, { readonly type: "text" | "art" | "part" }>;

interface Props {
  field: TextLike;
  value: unknown;
  path: string;
  pointer: ParamPointer;
}

const props = defineProps<Props>();
const emit = defineEmits<{ edit: [path: string, value: unknown, kind: CommitKind] }>();
const tip = computed(() => describe(props.field, null));
const inputId = computed(() => `hbf-in-${props.path.replace(/\W/g, "-")}`);
const max = computed(() => (props.field.type === "text" ? props.field.max : undefined));
const host = inject(ART_HOST, undefined);
const onStage = inject(ART_STAGE, undefined);
// The stage carries the canvas while it shows this row's board; the row keeps the layers and fields.
const part = computed<"all" | "panel">(() => (onStage?.value === props.field.id ? "panel" : "all"));

// Made once per row. Without a bench host the row reads its own value and
// edits through the same event every other row uses.
let own: ArtDocController | null = null;
const controller = computed<ArtDocController | null>(() => {
  if (props.field.type !== "art") return null;
  const shared = host?.(props.field.id) ?? null;
  if (shared !== null) return shared;
  if (own === null) {
    const frame = props.field.frame === undefined ? DOC_FRAME : { w: props.field.frame[0], h: props.field.frame[1] };
    const made: ArtDocController = createArtDoc({
      read: () => props.value,
      write: (v) => emit("edit", props.path, v, "commit"),
      frame,
      surface: artSurfaces(() => made.invalidate()),
    });
    own = made;
  }
  return own;
});

function onChange(e: Event): void {
  emit("edit", props.path, (e.target as HTMLInputElement).value, settleKind(props.field));
}
</script>

<template>
  <div v-if="controller !== null && field.type === 'art' && field.accepts.includes('layers')" class="hbf-row hbf-art-row" data-hb="param" :data-field="field.id" :data-path="path" :title="tip || undefined">
    <span class="hb-prow-label">{{ field.label }}</span>
    <ArtBoard :controller="controller" :value="value" :label="field.label" :part="part" />
  </div>
  <div v-else class="hbf-row hb-prow" data-hb="param" :data-field="field.id" :data-path="path" :title="tip || undefined">
    <label class="hb-prow-label" :for="inputId">{{ field.label }}</label>
    <div class="hb-prow-ctl">
      <HbInput
        v-if="field.type === 'text'"
        :id="inputId"
        :model-value="String(value ?? '')"
        :maxlength="max"
        @change="onChange"
      />
      <span v-else-if="field.type === 'art'" :id="inputId" class="hb-prow-why" data-hb="art-host">this art param takes {{ field.accepts.join(", ") }} files. the layer board needs layers in accepts.</span>
      <span v-else :id="inputId" class="hb-prow-why" data-hb="part-stub">catalog picker not in this bench yet. {{ value ?? "no part" }} stays set.</span>
    </div>
  </div>
</template>
