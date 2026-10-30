<script setup lang="ts">
// A chase mounted as a bench (M10-T06 step 1): the bench-core chase binding
// drawn through BenchShell. The binding holds the core, the rail, the
// welcome starts, the exports and BENCH; this component adds the welcome
// memory, the file and preset verbs and the download of an export. The
// bench's views.widgets resolve through the widget registry here, so a
// declared kind without a component logs its refusal at mount.
import { onMounted, provide, reactive } from "vue";
import { assertExportable, createWelcome, offlineAvailability, saveOffline, type ChaseBinding, type OfflineOptions } from "@hackbuild/bench-core";
import BenchShell from "./BenchShell.vue";
import { useShell, type BenchReport } from "../stores/shell.js";
import { widgetComponent } from "../widgets/registry.js";
import type { DraftWidget } from "./entry.js";
import { ART_HOST, OFFLINE, type OfflineHost } from "../rail/context.js";

interface Props {
  binding: ChaseBinding<BenchReport>;
  /** Mount the WebGL stage; false for a DOM without WebGL (unit tests). */
  stage?: boolean;
  /** An hbf draft page (mountBench draft): BenchShell shows the draft banner. */
  draft?: boolean;
  /** A draft's inline widget. */
  widget?: DraftWidget | null;
  /** The design folder a CDN page loaded from; with it the export panel can save the page offline. */
  offline?: OfflineOptions | null;
}

const props = withDefaults(defineProps<Props>(), { stage: true, draft: false, widget: null, offline: null });
const shell = useShell();
const b = props.binding;
// Rail rows of type art take their controller from the binding, so BENCH.verbs.art and the board edit one state.
provide(ART_HOST, (id: string) => b.art(id));

// Save offline: the page's classic library builds and its design in one file that opens from file://.
const avail = offlineAvailability({ doc: document, protocol: location.protocol }, props.offline);
const offline = reactive<OfflineHost & { busy: boolean; note: string }>({
  ok: avail.ok, why: avail.why, busy: false, note: "",
  run(): void {
    if (!offline.ok || offline.busy || props.offline === null) return;
    offline.busy = true;
    offline.note = "";
    saveOffline(props.offline).then(
      (page) => {
        const url = URL.createObjectURL(new Blob([page.html], { type: "text/html" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = page.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        offline.note = `saved ${page.name}, ${page.sources.length} files inlined. open it from disk, no network needed.`;
      },
      (e: unknown) => {
        offline.note = `save offline failed: ${e instanceof Error ? e.message : String(e)}`;
        b.core.appendLog(offline.note);
      },
    ).finally(() => { offline.busy = false; });
  },
});
provide(OFFLINE, offline);

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
  // A 3mf passes the library self-check (unique ids, UUIDs and names, closed manifold parts) before it reaches a download.
  b.hook.exportBytes(kind).then(
    async (b64) => {
      await assertExportable(kind, Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
      download(w?.file ?? `${b.chase.meta.id}.${kind}`, b64, w?.media ?? "application/octet-stream");
    },
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
