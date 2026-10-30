<script setup lang="ts">
// The EXPORTS panel of the export step (M09-T07 step 9): one button per
// export the chase declares. Every button stays disabled with the reason
// `mesh stale, building` until the status strip reads `mesh current`; an
// export kind this bake cannot write says so on its row instead of failing
// on click. A fabrication export with a blocking failed check stays
// disabled and names the checks (D-109, M09-T11 step 3); the press of an
// enabled button is the person's approval. While the current build is
// refused every button stays disabled and the row says why (D-643). The
// save offline row follows the exports: it writes the page and its design as
// one file for file://, and says why it is disabled on a page that is already
// offline or names no design folder.
import { computed, inject } from "vue";
import { HbButton, HbPanel } from "@virgilvox/hackbuild-ui";
import type { CheckResult, ExportDecl } from "@hackbuild/spec";
import { blockedLine, blockingChecks } from "@hackbuild/bench-core";
import { OFFLINE } from "../rail/context.js";

interface Props {
  exports: readonly ExportDecl[];
  /** mesh current: the last build read the current rev. */
  current: boolean;
  /** Export kinds this page can write; the others say why not. */
  writable?: readonly string[];
  /** Export kinds gated as fabrication. */
  fabrication?: readonly string[];
  /** Check results of the last build. */
  results?: readonly CheckResult[];
  /** Why the gate is closed while the last build refused; null when it built. */
  closed?: string | null;
}

const props = withDefaults(defineProps<Props>(), { writable: () => [], fabrication: () => [], results: () => [], closed: null });
const emit = defineEmits<{ export: [kind: string] }>();

const offline = inject(OFFLINE, undefined);
const STALE = "mesh stale, building";
const blocked = computed(() => blockingChecks(props.results));
const refusal = (kind: string): string | null =>
  props.fabrication.includes(kind) && blocked.value.length > 0 ? blockedLine(kind, blocked.value) : null;
</script>

<template>
  <HbPanel heading="exports" head="instrument" data-hb="exports">
    <div v-for="x in exports" :key="x.kind" class="hb-prow" data-hb="export-row" :data-kind="x.kind">
      <HbButton
        size="sm"
        variant="secondary"
        data-hb="export"
        :data-kind="x.kind"
        :disabled="closed !== null || !current || !writable.includes(x.kind) || refusal(x.kind) !== null"
        @click="emit('export', x.kind)"
      >{{ x.kind }}</HbButton>
      <span v-if="closed !== null" class="hb-prow-why" data-hb="export-why">{{ closed }}</span>
      <span v-else-if="!current" class="hb-prow-why" data-hb="export-why">{{ STALE }}</span>
      <span v-else-if="!writable.includes(x.kind)" class="hb-prow-why" data-hb="export-why">{{ x.kind }} export is not in this bake yet.</span>
      <span v-else-if="refusal(x.kind) !== null" class="hb-prow-why" data-hb="export-why">{{ refusal(x.kind) }}</span>
    </div>
    <div v-if="offline !== undefined" class="hb-prow" data-hb="offline-row">
      <HbButton size="sm" variant="secondary" data-hb="save-offline" :disabled="!offline.ok || offline.busy" @click="offline.run()">save offline</HbButton>
      <span v-if="!offline.ok" class="hb-prow-why" data-hb="offline-why">{{ offline.why }}</span>
      <span v-else-if="offline.note !== ''" class="hb-prow-why" data-hb="offline-why">{{ offline.note }}</span>
    </div>
  </HbPanel>
</template>
