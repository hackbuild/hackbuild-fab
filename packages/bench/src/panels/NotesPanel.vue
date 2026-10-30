<script setup lang="ts">
// One note (M09-T09, D-124, plan-deltas R33): at most one per panel, text
// from data, lowercase, one to three sentences. With a heading it is a
// declared `notes.<id>` panel of its own (PIP HOOKUP, FITS, EXPORT); without
// one it is the note line at the foot of a param group (PIP FLEX CONE). The
// rail has no other way to show a paragraph: per-row text is ParamField.help.
import { HbPanel } from "@virgilvox/hackbuild-ui";

interface Props {
  /** The note text; nothing renders while it is empty (HOOKUP before its first build). */
  note?: string | null;
  /** Panel heading, CAPS; empty renders the bare note line inside the caller's panel. */
  heading?: string;
  /** The notes panel id, for the data-panel hook. */
  id?: string;
}

withDefaults(defineProps<Props>(), { note: null, heading: "", id: "" });
</script>

<template>
  <HbPanel v-if="heading !== '' && note" :heading="heading" head="instrument" data-hb="notes" :data-panel="id">
    <p class="hbf-note" data-hb="note">{{ note }}</p>
  </HbPanel>
  <p v-else-if="note" class="hbf-note" data-hb="note">{{ note }}</p>
</template>
