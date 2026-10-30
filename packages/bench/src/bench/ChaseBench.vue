<script setup lang="ts">
// A chase mounted as a bench (M10-T06 step 1): the bench-core chase binding
// drawn through BenchShell. The binding holds the core, the rail, the
// welcome starts, the exports and BENCH; this component adds the welcome
// memory, the file and preset verbs and the download of an export. The
// bench's views.widgets resolve through the widget registry here, so a
// declared kind without a component logs its refusal at mount.
import { onMounted } from "vue";
import { createWelcome, type ChaseBinding } from "@hackbuild/bench-core";
import BenchShell from "./BenchShell.vue";
import { useShell, type BenchReport } from "../stores/shell.js";
import { widgetComponent } from "../widgets/registry.js";
import type { DraftWidget } from "./entry.js";

interface Props {
  binding: ChaseBinding<BenchReport>;
  /** Mount the WebGL stage; false for a DOM without WebGL (unit tests). */
  stage?: boolean;
  /** An hbf draft page (mountBench draft): BenchShell shows the draft banner. */
  draft?: boolean;
  /** A draft's inline widget. */
  widget?: DraftWidget | null;
}

const props = withDefaults(defineProps<Props>(), { stage: true, draft: false, widget: null });
const shell = useShell();
const b = props.binding;

const welcome = createWelcome(b.chase.meta.id, (open) => {
  shell.welcomeOpen = open;
});
shell.welcomeOpen = welcome.open;
shell.mirror(b.core);

onMounted(() => {
  for (const w of b.bench.views.widgets ?? []) {
    try {
      widgetComponent(w.kind);
    } catch (e) {
      b.core.appendLog(`widget ${w.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
});

function download(name: string, b64: string, media: string): void {
  const a = document.createElement("a");
  a.href = `data:${media};base64,${b64}`;
  a.download = name;
  a.click();
}

function exportKind(kind: string): void {
  const w = b.writers[kind];
  b.hook.exportBytes(kind).then(
    (b64) => download(w?.file ?? `${b.chase.meta.id}.${kind}`, b64, w?.media ?? "application/octet-stream"),
    (e: unknown) => b.core.appendLog(e instanceof Error ? e.message : String(e)),
  );
}
</script>

<template>
  <BenchShell
    :chase="b.chase"
    :bench="b.bench"
    :core="b.core"
    :welcome="welcome"
    :contact="b.contact"
    :pad="b.pad"
    :writable="b.writable"
    :fabrication="b.fabrication"
    :stage="props.stage"
    :draft="props.draft"
    :widget="props.widget"
    @open="b.open"
    @start="b.start"
    @export="exportKind"
  />
</template>
