// @vitest-environment happy-dom
/// <reference path="../src/vue-shim.d.ts" />
// M09-T09 acceptance: every `.note` element of PIP part1.html has a declared
// home, the count is parsed from the shipped file (never typed), every pane
// of the PIP fixture renders at most one note per panel and no paragraph
// outside a panel, and note 11 carries the corrected vendor and inferred
// figures (D-081, C-09). The shipped file is designs/pip/legacy/bench/
// part1.html (lineage pip.bench-part1).

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createApp, h, nextTick } from "vue";
import type { ParamField, ParamGroup } from "@hackbuild/spec";
import Rail from "../src/bench/Rail.vue";
import NotesPanel from "../src/panels/NotesPanel.vue";
import { resolvePanel, type PanelCtx } from "../src/bench/panels.js";
import { PIP_EMPTY, PIP_MATERIALS, PIP_NOTE_GROUPS, PIP_NOTE_RAIL, PIP_NOTES, PIP_WELCOME } from "./fixtures/pip-notes.js";
import { lintText } from "../../checks/voice/rules.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const part1 = readFileSync(path.join(ROOT, "designs/pip/legacy/bench/part1.html"), "utf8");
const lines = part1.split("\n");

interface Shipped { line: number; text: string; head: string | null }

/** Every `.note` element: its line, its text, and the nearest `<h3>` above it inside the same pane. */
function shippedNotes(): Shipped[] {
  const out: Shipped[] = [];
  let head: string | null = null;
  lines.forEach((l, i) => {
    if (/<div class="pane/.test(l)) head = null;
    const h3 = /<h3>([^<]+)<\/h3>/.exec(l);
    if (h3) head = h3[1] as string;
    for (const m of l.matchAll(/<div class="note"[^>]*>([^<]*)<\/div>/g)) out.push({ line: i + 1, text: m[1] as string, head });
  });
  return out;
}

const shipped = shippedNotes();
const group = (id: string): ParamGroup | undefined => PIP_NOTE_GROUPS.find((g) => g.id === id);
const fieldOf = (g: ParamGroup, id: string): ParamField | undefined => g.fields.find((f) => f.id === id);
const lint = (s: string): string[] => lintText("<note>", s, "dom").filter((f: { severity: string }) => f.severity === "block").map((f: { rule: string }) => f.rule);

describe("notes: the PIP migration table", () => {
  it("assigns every .note element of part1.html, by line, in order", () => {
    expect(shipped.length).toBeGreaterThan(0);
    expect(PIP_NOTES.length).toBe(shipped.length);
    expect(PIP_NOTES.map((n) => n.line)).toEqual(shipped.map((s) => s.line));
    expect(PIP_NOTES.map((n) => n.n)).toEqual(shipped.map((_, i) => i + 1));
  });

  it("keeps PIP's wording unless a rewrite says why", () => {
    for (const [i, note] of PIP_NOTES.entries()) {
      const src = shipped[i] as Shipped;
      if (note.text === null) {
        expect(note.fill !== undefined || note.home.kind === "role", `note ${note.n} has no text and no data home`).toBe(true);
        continue;
      }
      if (note.rewrite === undefined) expect(note.text, `note ${note.n}`).toBe(src.text);
      else expect(note.text, `note ${note.n} is marked rewritten`).not.toBe(src.text);
    }
  });

  it("note 10 is filled at build time; the shipped element is empty and its text was written by part3.js", () => {
    const n10 = PIP_NOTES.find((n) => n.n === 10);
    expect(shipped[9]?.text).toBe("");
    expect(n10?.fill).toBe("hookupNote");
    const part3 = readFileSync(path.join(ROOT, "designs/pip/legacy/bench/part3.js"), "utf8");
    expect(part3).toContain("$('#hookNote').textContent =");
  });

  it("every home resolves to the declaration that carries the text", () => {
    const panelsOf = (id: string): string[] => PIP_NOTE_RAIL.flatMap((s) => s.panels.filter((p) => p === `params.${id}` || p === `notes.${id}`));
    for (const [i, note] of PIP_NOTES.entries()) {
      const src = shipped[i] as Shipped;
      const home = note.home;
      if (home.kind === "welcome") expect(PIP_WELCOME.description).toBe(note.text);
      else if (home.kind === "help") {
        const g = group(home.group);
        expect(g, `note ${note.n} group ${home.group}`).toBeDefined();
        for (const id of home.fields) expect(fieldOf(g as ParamGroup, id)?.help, `note ${note.n} help on ${id}`).toBe(note.text);
      } else if (home.kind === "notes") {
        const g = group(home.panel) as ParamGroup;
        expect(g, `note ${note.n} panel ${home.panel}`).toBeDefined();
        // The notes panel sits under the head the note sat under in PIP.
        expect(g.label, `note ${note.n} head`).toBe(src.head);
        expect(g.note ?? null).toBe(note.text);
        expect(panelsOf(home.panel), `note ${note.n} is on exactly one pane`).toHaveLength(1);
      } else if (home.kind === "empty") {
        expect(PIP_EMPTY[home.step]).toBe(note.text);
        expect(PIP_NOTE_RAIL.some((s) => s.step === home.step)).toBe(true);
      } else {
        // Role column data (D-221): "<slot> <role>" pairs parsed from the shipped note.
        const roles = [...src.text.matchAll(/(\d) ([^,.]+)/g)].map((m) => [Number(m[1]), m[2]]);
        expect(roles.length).toBeGreaterThan(0);
        expect(PIP_MATERIALS.map((m) => [m.slot, m.label])).toEqual(roles);
        expect(PIP_NOTE_RAIL.some((s) => s.panels.includes("materials"))).toBe(true);
      }
    }
  });

  it("note 11 states the vendor raw filament figure and the inferred printed row", () => {
    const help = PIP_NOTES.find((n) => n.n === 11)?.text ?? "";
    expect(help).toContain("240 to 481");
    expect(help).toContain("(vendor)");
    expect(help).toContain("inferred");
    expect(help).not.toContain("run worse");
    expect(fieldOf(group("phys") as ParamGroup, "rhoC")?.help).toBe(help);
  });

  it("every migrated string is lowercase, one to three sentences, and passes lint-voice as dom text", () => {
    const texts = PIP_NOTES.flatMap((n) => (n.text === null ? [] : [n.text]));
    for (const t of texts) {
      expect(t[0], t).toBe(t[0]?.toLowerCase());
      expect(t.split(/\.\s+(?=[a-z])/).length, t).toBeLessThanOrEqual(3);
      expect(lint(t), t).toEqual([]);
    }
  });
});

// ---- rendering

const ctx = (notes: Record<string, string> = {}): PanelCtx => ({
  values: { shape: "stadium", top: "inplace", mode: "press", rhoC: 500, pattern: "", printer: "", process: "" },
  results: [], metrics: [], envelope: null, part: null, exports: [], writable: ["json"], fabrication: [], current: false,
  valueAt: () => undefined, log: [], notes,
});

async function mountStep(step: number, c: PanelCtx): Promise<{ el: HTMLElement; unmount(): void }> {
  const el = document.createElement("div");
  document.body.append(el);
  const app = createApp({
    render: () => h(Rail, { steps: PIP_NOTE_RAIL, step, groups: PIP_NOTE_GROUPS, materials: PIP_MATERIALS, ctx: c }),
  });
  app.mount(el);
  await nextTick();
  return { el, unmount: () => { app.unmount(); el.remove(); } };
}

describe("notes: the PIP panes render", () => {
  const hookup = "no resistors. wire the cups as drawn.";
  for (const [i, s] of PIP_NOTE_RAIL.entries()) {
    it(`step ${s.step}: at most one note per panel, no paragraph outside a panel`, async () => {
      const m = await mountStep(i, ctx({ hookup }));
      const panels = [...m.el.querySelectorAll(".hb-panel")];
      expect(panels.length).toBeGreaterThan(0);
      for (const p of panels) expect(p.querySelectorAll('[data-hb="note"]').length).toBeLessThanOrEqual(1);
      for (const p of m.el.querySelectorAll("p")) expect(p.closest(".hb-panel"), p.textContent ?? "").not.toBeNull();
      expect(m.el.querySelectorAll('[data-hb="panel-absent"]')).toHaveLength(0);
      // Every note on screen is a declared one or the build-filled hookup note.
      const declared = new Set([...PIP_NOTES.flatMap((n) => (n.text === null ? [] : [n.text])), hookup]);
      for (const n of m.el.querySelectorAll('[data-hb="note"]')) expect(declared.has(n.textContent ?? "")).toBe(true);
      m.unmount();
    });
  }

  it("the notes panels of a pane carry their group's note under the group's head", async () => {
    const m = await mountStep(3, ctx());
    const got = [...m.el.querySelectorAll('[data-hb="notes"]')].map((p) => [p.getAttribute("data-panel"), p.querySelector('[data-hb="note"]')?.textContent]);
    expect(got).toEqual([["fits", group("fits")?.note], ["export", group("export")?.note]]);
    m.unmount();
  });

  it("HOOKUP shows the note the build filled, and nothing before a build fills it", async () => {
    const before = await mountStep(2, ctx());
    expect(before.el.querySelector('[data-hb="notes"][data-panel="hookup"]')).toBeNull();
    before.unmount();
    const after = await mountStep(2, ctx({ hookup }));
    expect(after.el.querySelector('[data-hb="notes"][data-panel="hookup"] [data-hb="note"]')?.textContent).toBe(hookup);
    after.unmount();
  });

  it("resolvePanel reads notes.<id> from the build first, then the group", () => {
    const r = resolvePanel("notes.fits", PIP_NOTE_GROUPS);
    expect(r.kind).toBe("notes");
    if (r.kind !== "notes") return;
    expect(r.heading).toBe("FITS AND CLEARANCES");
    expect(r.note(ctx())).toBe(group("fits")?.note);
    expect(r.note(ctx({ fits: "filled" }))).toBe("filled");
  });

  it("a bare note renders one line; an empty note renders nothing", async () => {
    const el = document.createElement("div");
    document.body.append(el);
    const app = createApp({ render: () => [h(NotesPanel, { note: "one line." }), h(NotesPanel, { note: "", heading: "EMPTY" })] });
    app.mount(el);
    await nextTick();
    expect(el.querySelectorAll('[data-hb="note"]')).toHaveLength(1);
    expect(el.querySelector(".hb-panel")).toBeNull();
    app.unmount();
    el.remove();
  });
});
