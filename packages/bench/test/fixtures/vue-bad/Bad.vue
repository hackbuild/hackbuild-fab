<script setup lang="ts">
// Fixture for tools/test/vue-check.test.mjs: one script error, one template error.
defineProps<{ label: string }>();
const n: number = "x";
</script>

<template>
  <p>{{ label }} {{ n }} {{ missing }}</p>
</template>
