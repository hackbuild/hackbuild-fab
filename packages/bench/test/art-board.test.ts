// @vitest-environment happy-dom
/// <reference path="../src/vue-shim.d.ts" />
// The art row of the param rail (plan v11.1 section 4.3): an `art` field that
// accepts layers mounts the art board; a row mounted alone edits through its
// own event with a value whose uri is the hash of the document it carries.
// An art field that does not accept layers says so. No canvas is drawn
// here (happy-dom has none); the pointer paths are in the smoke spec.

import { beforeAll, describe, expect, it } from "vitest";
import { createApp, defineComponent, h, nextTick, ref } from "vue";
import { artDocumentUri, type ParamField } from "@hackbuild/spec";
import TextField from "../src/rail/fields/TextField.vue";

type Edit = [string, unknown, string];

// happy-dom has no 2D context: a recording stand-in takes every call and every assignment.
beforeAll(() => {
  const ctx = new Proxy({} as Record<string, unknown>, { get: (t, k) => (k in t ? t[k as string] : () => undefined), set: (t, k, v) => { t[k as string] = v; return true; } });
  HTMLCanvasElement.prototype.getContext = (() => ctx) as unknown as HTMLCanvasElement["getContext"];
  if (typeof globalThis.ResizeObserver === "undefined") {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class { observe(): void {} disconnect(): void {} unobserve(): void {} };
  }
});

function mountRow(field: ParamField, start: unknown = null) {
  const edits: Edit[] = [];
  const value = ref<unknown>(start);
  const el = document.createElement("div");
  document.body.append(el);
  const app = createApp(defineComponent({
    render: () => h(TextField as never, {
      field, value: value.value, path: field.id, pointer: `/${field.id}`,
      onEdit: (p: string, v: unknown, k: string) => { edits.push([p, v, k]); value.value = v; },
    }),
  }));
  app.mount(el);
  return { el, edits, value, stop: () => { app.unmount(); el.remove(); } };
}

const layers = { id: "art", type: "art", label: "layers", accepts: ["layers", "svg"], frame: [100, 64] } as unknown as ParamField;

describe("the art row", () => {
  it("mounts the board with no layers and says so", () => {
    const r = mountRow(layers);
    expect(r.el.querySelector('[data-hb="art-board"]')).not.toBeNull();
    expect(r.el.querySelector('[data-hb="art-empty"]')?.textContent).toContain("no layers on the front face");
    expect(r.el.querySelectorAll("[data-add]").length).toBe(6);
    r.stop();
  });

  it("an add button emits one edit whose value carries the document and its hash", async () => {
    const r = mountRow(layers);
    r.el.querySelector<HTMLButtonElement>('[data-add="shape"]')!.click();
    await nextTick();
    expect(r.edits.length).toBe(1);
    const [path, v, kind] = r.edits[0]!;
    const val = v as { uri: string; kind: string; doc: Parameters<typeof artDocumentUri>[0] };
    expect([path, kind, val.kind]).toEqual(["art", "commit", "layers"]);
    expect(val.uri).toBe(artDocumentUri(val.doc));
    expect(val.doc.faces.front.map((L) => L.kind)).toEqual(["shape"]);
    expect(r.el.querySelectorAll('[data-hb="art-layers"] li').length).toBe(1);
    r.stop();
  });

  it("a value set from outside, as undo does, redraws the layer list", async () => {
    const r = mountRow(layers);
    r.el.querySelector<HTMLButtonElement>('[data-add="scope"]')!.click();
    await nextTick();
    expect(r.el.querySelectorAll('[data-hb="art-layers"] li').length).toBe(1);
    r.value.value = null;
    await nextTick();
    expect(r.el.querySelector('[data-hb="art-empty"]')).not.toBeNull();
    r.stop();
  });

  it("an art field that takes no layers shows a line and no board", () => {
    const r = mountRow({ id: "art", type: "art", label: "art", accepts: ["svg"] } as unknown as ParamField);
    expect(r.el.querySelector('[data-hb="art-board"]')).toBeNull();
    expect(r.el.querySelector('[data-hb="art-host"]')?.textContent).toContain("needs layers in accepts");
    r.stop();
  });
});
