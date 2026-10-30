<script setup lang="ts">
// One row for one ParamField: the renderer table of M09-T08 step 1 as a
// map, so adding a type is one entry. A type with no renderer yet (slot,
// instances) shows a row that names it instead of a dead control.
import type { Component } from "vue";
import type { ParamField, ParamPointer } from "@hackbuild/spec";
import NumberField from "./NumberField.vue";
import IntField from "./IntField.vue";
import BoolField from "./BoolField.vue";
import EnumField from "./EnumField.vue";
import TextField from "./TextField.vue";
import ListField from "./ListField.vue";
import DerivedField from "./DerivedField.vue";
import type { Scope } from "../showWhen.js";
import type { CommitKind } from "../context.js";

interface Props {
  field: ParamField;
  value: unknown;
  path: string;
  pointer: ParamPointer;
  /** Outer scopes for showWhen inside list instances, innermost first. */
  scopes?: readonly Scope[];
}

withDefaults(defineProps<Props>(), { scopes: () => [] });
const emit = defineEmits<{ edit: [path: string, value: unknown, kind: CommitKind] }>();

const RENDERERS: Readonly<Partial<Record<ParamField["type"], Component>>> = {
  mm: NumberField, deg: NumberField, ratio: NumberField, number: NumberField,
  int: IntField, bool: BoolField, enum: EnumField,
  text: TextField, art: TextField, part: TextField,
  list: ListField, derived: DerivedField,
};
</script>

<template>
  <component
    :is="RENDERERS[field.type]"
    v-if="RENDERERS[field.type] !== undefined"
    :field="field"
    :value="value"
    :path="path"
    :pointer="pointer"
    v-bind="field.type === 'list' ? { scopes } : {}"
    @edit="(p: string, v: unknown, k: CommitKind) => emit('edit', p, v, k)"
  />
  <div v-else class="hbf-row hb-prow" data-hb="param" :data-field="field.id">
    <span class="hb-prow-label">{{ field.label }}</span>
    <span class="hb-prow-why">{{ field.type }} rows are not in this bench yet; the value stays as loaded.</span>
  </div>
</template>
