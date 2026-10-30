<script setup lang="ts">
// The art board: a face canvas with handles over an art document controller
// (bench-core artdoc), a layers panel and the fields of the selected layer.
// Ported from BAIL's face editor and layer panel (bail.html:2786 to 3111,
// lineage bail.bench/ui-art-board). The canvas draws the inlay painters at
// the quick raster; drag moves, a corner scales, the dot rotates, the wheel
// zooms, right drag pans, alt turns the snap off, arrows nudge, delete
// removes. Every edit goes through the controller, which writes the param
// value, so undo and redo are the bench's own.
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { HbButton, HbChip, HbInput, HbSelect } from "@virgilvox/hackbuild-ui";
import { ART_FACES, type ArtLayerKind } from "@hackbuild/spec";
import { attachArtBoard, cssToken, layerFields, px2mm, type ArtBoardTheme, type ArtDocController, type ArtFieldDef, type Attached } from "@hackbuild/bench-core";

interface Props {
  controller: ArtDocController;
  /** The param value the controller reads; a change from outside (undo) redraws. */
  value?: unknown;
  label?: string;
}

const props = withDefaults(defineProps<Props>(), { label: "art" });

/** Kinds the add row offers, in BAIL's order; path layers come from a dropped svg, relief has no painter. */
const ADDABLE: readonly ArtLayerKind[] = ["text", "shape", "logo", "scope", "circuit"];

const canvas = ref<HTMLCanvasElement | null>(null);
const picker = ref<HTMLInputElement | null>(null);
const tick = ref(0);
let attached: Attached | null = null;
let off: (() => void) | null = null;

const c = computed(() => props.controller);
const layers = computed(() => (tick.value, c.value.layers().slice().reverse()));
const face = computed(() => (tick.value, c.value.face()));
const sel = computed(() => (tick.value, c.value.selected()));
const rows = computed<ArtFieldDef[]>(() => (sel.value === null ? [] : layerFields(sel.value.kind, sel.value.cut)));
const notes = computed(() => (tick.value, c.value.notes()));
const counts = computed(() => (tick.value, c.value.state().counts));
const aspect = computed(() => `${c.value.frame().w} / ${c.value.frame().h}`);

function theme(el: HTMLElement): ArtBoardTheme {
  const t = (name: string, fallback: string): string => cssToken(el, name) || fallback;
  const slots = c.value.slots();
  return {
    void: t("--hb-void", "#0a0a0a"), blank: slots[0] ?? t("--hb-ink", "#1a1a1a"), pink: t("--hb-pink", "#FE0386"),
    guide: t("--hb-lit-label", "#b8b2a6"), readout: t("--hb-paper", "#f5f0e6"), numberFont: t("--hb-readout", "monospace"),
    slots: slots.length > 0 ? slots : [t("--hb-ink", "#1a1a1a"), t("--hb-pink", "#FE0386"), t("--hb-paper", "#f5f0e6")],
  };
}

function fileTaken(file: File, x: number, y: number): boolean {
  const [mx, my] = px2mm(c.value.view(), x, y);
  if (/\.svg$/i.test(file.name) || file.type === "image/svg+xml") {
    void file.text().then((t) => c.value.dropSvg(t, [Math.round(mx * 4) / 4, Math.round(my * 4) / 4]));
  } else if (file.type.startsWith("image/")) {
    c.value.dropRaster(file.name);
  } else {
    void file.text().then((t) => c.value.dropSvg(t));
  }
  return true;
}

function onPick(e: Event): void {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file !== undefined) fileTaken(file, c.value.view().ox, c.value.view().oy);
  input.value = "";
}

function bind(): void {
  off?.();
  attached?.detach();
  const el = canvas.value;
  if (el === null) return;
  attached = attachArtBoard(el, c.value, { theme: theme(el), onDrop: fileTaken, keysOn: "canvas" });
  off = c.value.on("change", () => {
    tick.value++;
    attached?.paint();
  });
  tick.value++;
}

onMounted(bind);
onBeforeUnmount(() => {
  off?.();
  attached?.detach();
});
watch(() => props.controller, bind);
watch(() => props.value, () => c.value.refresh());

const add = (kind: ArtLayerKind): void => { c.value.add(kind); };
const setField = (def: ArtFieldDef, v: string | number | boolean): void => {
  if (sel.value === null) return;
  const out = def.type === "number" || def.type === "int" || def.type === "slot" ? Number(v) : v;
  if (typeof out === "number" && !Number.isFinite(out)) return;
  c.value.set(sel.value.id, def.key, out);
};
const valueOf = (def: ArtFieldDef): string => String((sel.value as unknown as Record<string, unknown> | null)?.[def.key] ?? "");
const optionsOf = (def: ArtFieldDef): { label: string; value: string }[] => (def.options ?? []).map((o) => ({ label: o, value: o }));
const kindLine = (id: string): string => {
  const L = c.value.layers().find((x) => x.id === id);
  if (L === undefined) return id;
  return L.kind === "text" ? `text ${JSON.stringify(L.text.slice(0, 14))}` : L.kind === "shape" ? `shape ${L.shape}` : L.kind;
};
</script>

<template>
  <div class="hbf-art" data-hb="art-board" :aria-label="label">
    <div class="hbf-art-bar" role="group" aria-label="face">
      <HbChip
        v-for="f in ART_FACES"
        :key="f"
        toggle
        :model-value="face === f"
        :data-face="f"
        @click="c.setFace(f)"
      >{{ f }} {{ counts[f] }}</HbChip>
    </div>
    <canvas
      ref="canvas"
      class="hbf-art-canvas"
      data-hb="art-canvas"
      tabindex="0"
      role="img"
      :aria-label="`${label} ${face} face. drag moves, corners scale, the dot rotates, wheel zooms, right drag pans, alt snaps, arrows nudge, delete removes`"
      :style="{ aspectRatio: aspect }"
    />
    <p v-for="n in notes" :key="n" class="hbf-art-note" data-hb="art-note">{{ n }}</p>
    <div class="hbf-art-add" role="group" aria-label="add layer">
      <HbButton v-for="k in ADDABLE" :key="k" size="sm" variant="secondary" :data-add="k" @click="add(k)">{{ k }}</HbButton>
      <HbButton size="sm" variant="secondary" data-add="image" @click="picker?.click()">image</HbButton>
      <input ref="picker" type="file" accept=".svg,image/svg+xml,image/png,image/jpeg" class="hb-sr" tabindex="-1" aria-label="drop an svg or image" data-hb="art-file" @change="onPick" />
    </div>
    <p v-if="layers.length === 0" class="hbf-art-empty" data-hb="art-empty">no layers on the {{ face }} face. add one, or drop an svg on the canvas.</p>
    <ul v-else class="hbf-art-layers" data-hb="art-layers">
      <li v-for="L in layers" :key="L.id" :data-layer="L.id" :class="{ 'is-sel': sel?.id === L.id, 'is-mute': L.mute }">
        <HbChip toggle :model-value="sel?.id === L.id" class="hbf-art-pick" @click="c.select(L.id)">{{ kindLine(L.id) }}</HbChip>
        <span class="hbf-art-acts">
          <HbButton size="sm" variant="ghost" aria-label="raise" title="raise" data-act="raise" @click="c.reorder(L.id, 1)">up</HbButton>
          <HbButton size="sm" variant="ghost" aria-label="lower" title="lower" data-act="lower" @click="c.reorder(L.id, -1)">down</HbButton>
          <HbButton size="sm" variant="ghost" :aria-label="L.mute ? 'show' : 'mute'" data-act="mute" @click="c.set(L.id, 'mute', !L.mute)">{{ L.mute ? "show" : "mute" }}</HbButton>
          <HbButton size="sm" variant="ghost" aria-label="duplicate" data-act="dup" @click="c.duplicate(L.id)">copy</HbButton>
          <HbButton size="sm" variant="ghost" aria-label="copy to the other face" data-act="flip" @click="c.copyToOtherFace(L.id)">flip</HbButton>
          <HbButton size="sm" variant="ghost" aria-label="remove" data-act="remove" @click="c.remove(L.id)">drop</HbButton>
        </span>
      </li>
    </ul>
    <div v-if="sel !== null" class="hbf-art-props" data-hb="art-props" :data-layer="sel.id">
      <div v-for="f in rows" :key="`${sel.id}-${f.key}`" class="hbf-art-prop" :data-field="f.key">
        <label class="hbf-art-label" :for="`hbf-art-${sel.id}-${f.key}`">{{ f.label }}</label>
        <HbSelect
          v-if="f.type === 'enum'"
          :id="`hbf-art-${sel.id}-${f.key}`"
          :options="optionsOf(f)"
          :model-value="valueOf(f)"
          @update:model-value="(v: string | number) => setField(f, String(v))"
        />
        <HbChip
          v-else-if="f.type === 'bool'"
          :id="`hbf-art-${sel.id}-${f.key}`"
          toggle
          :model-value="valueOf(f) === 'true'"
          @click="setField(f, valueOf(f) !== 'true')"
        >{{ valueOf(f) === "true" ? "on" : "off" }}</HbChip>
        <HbInput
          v-else
          :id="`hbf-art-${sel.id}-${f.key}`"
          :type="f.type === 'text' ? 'text' : 'number'"
          :step="f.step"
          :min="f.min"
          :model-value="valueOf(f)"
          @change="(e: Event) => setField(f, (e.target as HTMLInputElement).value)"
        />
      </div>
    </div>
  </div>
</template>
