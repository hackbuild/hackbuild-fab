<script setup lang="ts">
// One ParamGroup as an instrument-head panel with one row per visible field
// (M09-T08 step 1), then the group's readout grid and its one note. Rows
// emit edits; the bench writes them into the bench-core core, so the rail owns
// no design state. Visibility re-reads `values` on every render, and the
// shell copies the core state after every commit (PIP UI.visibility).
import { computed, provide, toRef } from "vue";
import { HbPanel } from "@virgilvox/hackbuild-ui";
import type { Metric, ParamEnvelope, ParamGroup } from "@hackbuild/spec";
import FieldRow from "./fields/FieldRow.vue";
import DerivedField from "./fields/DerivedField.vue";
import NotesPanel from "../panels/NotesPanel.vue";
import { shows, visibleFields } from "./showWhen.js";
import { RAIL, type CommitKind } from "./context.js";
import type { Values } from "./model.js";

interface Props {
  group: ParamGroup;
  values: Values;
  /** The param envelope of the last build, or null before one. */
  envelope?: ParamEnvelope | null;
  /** Metrics of the last build by id, for derived rows. */
  metrics?: ReadonlyMap<string, Metric>;
}

const props = withDefaults(defineProps<Props>(), { envelope: null, metrics: () => new Map() });
const emit = defineEmits<{ edit: [path: string, value: unknown, kind: CommitKind] }>();

provide(RAIL, { envelope: toRef(props, "envelope"), metrics: toRef(props, "metrics") });

const shown = computed(() => shows(props.group.showWhen, [props.values]));
const rows = computed(() => visibleFields(props.group.fields, [props.values]));
</script>

<template>
  <HbPanel v-if="shown" :heading="group.label" head="instrument" data-hb="param-group" :data-group="group.id">
    <FieldRow
      v-for="f in rows"
      :key="f.id"
      :field="f"
      :value="values[f.id]"
      :path="f.id"
      :pointer="`/${f.id}`"
      @edit="(p: string, v: unknown, k: CommitKind) => emit('edit', p, v, k)"
    />
    <div v-if="group.readouts?.length" class="hbf-readouts" data-hb="readouts">
      <DerivedField v-for="r in group.readouts" :key="r.id" :field="r" :path="r.id" :pointer="`/${r.id}`" />
    </div>
    <NotesPanel :note="group.note ?? null" />
  </HbPanel>
</template>
