/// <reference lib="dom" />
// Legacy adapters (M09-T12, D-128, D-142): each maps one byte-identical
// legacy bench onto the frozen BenchHook of spec/hook.ts. An adapter names
// the sha256 of the HTML it was written against; benches.ts refuses any
// other file. This module runs inside the page: conformance.spec.ts bundles
// it into one script and calls adapt(globalThis) once BENCH.ready is true.
//
// Hook shapes per bench, read from the legacy sources (plan-deltas R79):
//   PIP     getters ready, state, model, rev, built, busy; members      bench/part2.js lines 405 to 428
//   TOGGLE  functions model(), state(), setTilt, set; globals           toggle/src/src/part4.js lines 88 to 109
//   KNUCKLE functions build(), state(), model(); ST.rev; globals        knuckle/src/part4.js lines 570 to 601, part5.js lines 39 to 170
//   TENON   functions getState, state(), model(), rebuild; globals      tenon/src/src/part2.js lines 6 to 73, part3.js lines 43 to 175
//   COTTER  ready, state(), idle, waitIdle; members                     cotter-src/src/app1.js line 68, app3.js lines 13 to 14 and 165 to 190
//   SASH    functions build(), state(), model(), check(); ST.rev        sash.html part2.js and part3.js (KNUCKLE shape)

import type { BenchHook, DriveReadoutRecord } from "@hackbuild/spec";
import { EXPORT_ALIASES, UNKNOWN_EXPORT_KIND } from "@hackbuild/spec";

export type LegacyGlobal = Record<string, unknown> & { BENCH?: Record<string, unknown> };

export type LegacyId = "pip" | "toggle" | "knuckle" | "tenon" | "cotter" | "sash";

/** What a legacy drive resolves when the bench has no drive pad. */
export const NO_DRIVE = "not provided by legacy bench";

export interface LegacyAdapter {
  id: LegacyId;
  /** The legacy HTML this adapter was written against. */
  sha256: string;
  /** Kinds the page answers, after EXPORT_ALIASES. */
  exports: readonly string[];
  /**
   * Loads the design the page's own smoke test drives, where boot shows an
   * empty design with nothing to drive (PIP smoke.py clicks the worked example).
   */
  example?(g: LegacyGlobal): void;
  /** Drive pad targets the page shows now; empty when the bench has no pad. */
  driveTargets(g: LegacyGlobal): readonly string[];
  adapt(g: LegacyGlobal): BenchHook;
  /** Per printed object, the meshes the stage draws, in 3MF build item order; absent where the page keeps none. */
  stageObjects?(g: LegacyGlobal): readonly StageObject[];
  /** The warnings the page's own status chip counts; absent where the page keeps no list. */
  warnings?(g: LegacyGlobal): number;
}

export interface StageObject {
  name: string;
  parts: readonly { name: string; tris: number; lo: readonly number[]; hi: readonly number[] }[];
}

type Fn = (...a: readonly unknown[]) => unknown;
type Verbs = Readonly<Record<string, Fn>>;

const alias: Readonly<Record<string, string>> = EXPORT_ALIASES;

const fn = (o: Record<string, unknown> | undefined, k: string): Fn => {
  const f = o?.[k];
  if (typeof f !== "function") throw new Error(`legacy hook has no ${k}`);
  return f as Fn;
};

const bench = (g: LegacyGlobal): Record<string, unknown> => {
  const B = g.BENCH;
  if (!B) throw new Error("legacy page has no BENCH global");
  return B;
};

/** A verb that looks the page function up at call time, so a reassigned global is still the one called. */
const verb = (o: Record<string, unknown>, k: string): Fn => (...a) => fn(o, k)(...a);

/** Model flags the TOGGLE, KNUCKLE, TENON and SASH harnesses polled: `!model().dirty && !model().building`. */
interface Flags {
  dirty?: unknown;
  building?: unknown;
  error?: unknown;
  warnings?: unknown;
}

/** The last thrown build: TOGGLE keeps MODEL.error, KNUCKLE and SASH push `build failed: <msg>` onto warnings. */
const errorOf = (m: Flags | null | undefined): string | null => {
  if (!m) return null;
  if (typeof m.error === "string" && m.error) return m.error;
  if (Array.isArray(m.warnings)) {
    const w = m.warnings.find((x): x is string => typeof x === "string" && x.startsWith("build failed: "));
    if (w) return w.slice("build failed: ".length);
  }
  return null;
};

/** Resolve the kind through EXPORT_ALIASES; a kind the page does not answer rejects as G-51 says. */
const exporter = (kinds: readonly string[], call: (kind: string) => unknown) =>
  async (kind: string): Promise<string> => {
    const k = alias[kind] ?? kind;
    if (!kinds.includes(k)) throw new Error(UNKNOWN_EXPORT_KIND + kind);
    const out = await call(k);
    if (typeof out !== "string") throw new Error(`legacy exportBytes(${k}) returned ${typeof out}, not base64`);
    return out;
  };

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Poll until done() or the ceiling, as PIP smoke.py polls SETTLED. timeoutMs in ms. */
async function until(id: string, done: () => boolean, timeoutMs: number): Promise<void> {
  const t0 = Date.now();
  while (!done()) {
    if (Date.now() - t0 > timeoutMs) throw new Error(`${id}: not settled after ${timeoutMs} ms`);
    await sleep(50);
  }
}

const noDrive = async (target: string): Promise<DriveReadoutRecord> => ({ target, readout: NO_DRIVE });

/**
 * The shape TOGGLE, KNUCKLE, TENON and SASH share: function-style BENCH,
 * busy from model flags, design JSON through page globals. rev is the
 * page's ST.rev where it keeps one (KNUCKLE, SASH), otherwise synthesised
 * from adapter commits and loads; built follows rev once the page is idle.
 */
function flagged(
  id: LegacyId,
  g: LegacyGlobal,
  kinds: readonly string[],
  opts: { pageRev: boolean; verbs: (B: Record<string, unknown>, bump: () => void) => Verbs },
): BenchHook {
  const B = bench(g);
  let ownRev = 0;
  let built = 0;
  const model = () => fn(B, "model")() as Flags;
  const state = () => fn(B, "state")() as Record<string, unknown>;
  const idle = () => {
    const m = model();
    return !m.dirty && !m.building;
  };
  const rev = (): number => {
    if (!opts.pageRev) return ownRev;
    const r = state()["rev"];
    if (typeof r !== "number") throw new Error(`${id}: state().rev is ${typeof r}, not a count`);
    return r;
  };
  const bump = () => {
    if (!opts.pageRev) ownRev++;
  };
  const hook: BenchHook = {
    get ready() { return B["ready"] === true; },
    get state() { return state(); },
    set state(_v: unknown) { throw new Error(`${id}: state is read only; use loadDesign`); },
    get model() { return model(); },
    get rev() { return rev(); },
    get built() { if (idle()) built = rev(); return built; },
    get busy() { return !idle(); },
    buildHash: null,
    get error() { return errorOf(model()); },
    log: [],
    async settled(timeoutMs = 120000) {
      await until(id, () => hook.ready && idle(), timeoutMs);
      built = rev();
    },
    loadDesign(json) { bump(); fn(g, "loadDesign")(json); },
    designJson() { return String(fn(g, "designJson")()); },
    async ensureMesh() { await hook.settled(); fn(g, "ensureMesh")(); },
    commit() { bump(); fn(g, "commit")(); },
    drive: noDrive,
    async release() {},
    exportBytes: exporter(kinds, (k) => fn(B, "exportBytes")(k)),
    verbs: opts.verbs(B, bump),
  };
  return hook;
}

export const pip: LegacyAdapter = {
  id: "pip",
  sha256: "a1fa88bd6ffa603c76059567c8b27c804536e39e7c07ec56c58daad55b001263",
  exports: ["3mf", "stl", "card", "json", "ino", "svg", "coupon"],
  example() {
    const b = document.querySelector<HTMLButtonElement>("#wExample");
    if (!b) throw new Error("pip: no #wExample button");
    b.click();
  },
  driveTargets() {
    return [...document.querySelectorAll<HTMLButtonElement>("#padKeys button[data-k]")].map((b) => b.dataset["k"] ?? "");
  },
  // MODEL.M.objects[].print[].mesh is what VIEW.update draws and what
  // pkgConfig hands Orca3MF (bench/part2.js doBuild, part3.js lines 205 to 216).
  stageObjects(g) {
    const m = bench(g)["model"] as { M?: { objects?: { name: string; print: { name: string; mesh: { positions: ArrayLike<number>; indices: ArrayLike<number> } }[] }[] } } | null;
    if (!m?.M?.objects) throw new Error("pip: BENCH.model.M.objects missing; no model built");
    return m.M.objects.map((o) => ({
      name: o.name,
      parts: o.print.map((p) => {
        const lo = [Infinity, Infinity, Infinity];
        const hi = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < p.mesh.positions.length; i += 1) {
          const v = p.mesh.positions[i] as number;
          lo[i % 3] = Math.min(lo[i % 3] as number, v);
          hi[i % 3] = Math.max(hi[i % 3] as number, v);
        }
        return { name: p.name, tris: p.mesh.indices.length / 3, lo, hi };
      }),
    }));
  },
  // The #stChips warnings chip reads MODEL.M.warn.length (bench/part3.js chips()).
  warnings(g) {
    const m = bench(g)["model"] as { M?: { warn?: unknown } } | null;
    if (!Array.isArray(m?.M?.warn)) throw new Error("pip: BENCH.model.M.warn missing; no model built");
    return m.M.warn.length;
  },
  adapt(g) {
    const B = bench(g);
    const held = new Set<string>();
    const key = (target: string): HTMLButtonElement => {
      const b = document.querySelector<HTMLButtonElement>(`#padKeys button[data-k="${CSS.escape(target)}"]`);
      if (!b) throw new Error(`pip: no drive pad key ${target}`);
      return b;
    };
    // The pad listens for pointerdown and pointerup (bench/part3.js renderPad); a person's press sends both.
    const press = (b: HTMLButtonElement, type: "pointerdown" | "pointerup") =>
      b.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, pointerType: "mouse", isPrimary: true, button: 0, buttons: type === "pointerdown" ? 1 : 0 }));
    const readout = (): string => document.querySelector("#padRead")?.textContent ?? "";
    const num = (k: string): number => {
      const v = B[k];
      if (typeof v !== "number") throw new Error(`pip: BENCH.${k} is ${typeof v}, not a count`);
      return v;
    };
    const hook: BenchHook = {
      get ready() { return B["ready"] === true; },
      get state() { return B["state"]; },
      set state(v: unknown) { B["state"] = v; },
      get model() { return B["model"]; },
      get rev() { return num("rev"); },
      get built() { return num("built"); },
      get busy() { return B["busy"] === true; },
      buildHash: null,
      error: null,
      get log() { return B["log"] as string[]; },
      async settled(timeoutMs = 120000) {
        await until("pip", () => hook.ready && !hook.busy && hook.built === hook.rev, timeoutMs);
      },
      loadDesign(json) { fn(B, "loadDesign")(json); },
      designJson() { return String(fn(B, "designJson")()); },
      async ensureMesh() { await fn(B, "ensureMesh")(); },
      commit() { fn(B, "commit")(); },
      async drive(target, value) {
        const b = key(target);
        if (value === false) {
          press(b, "pointerup");
          held.delete(target);
        } else if (value === true) {
          press(b, "pointerdown");
          held.add(target);
        } else {
          throw new Error(`pip: drive ${target} takes a hold, true or false`);
        }
        return { target, readout: readout() };
      },
      async release(target) {
        for (const t of target === undefined ? [...held] : [target]) {
          press(key(t), "pointerup");
          held.delete(t);
        }
      },
      exportBytes: exporter(pip.exports, (k) => fn(B, "exportBytes")(k)),
      verbs: {
        firmware: verb(B, "firmware"),
        wiringSvg: verb(B, "wiringSvg"),
        printCard: verb(B, "printCard"),
        exportCoupon: verb(B, "exportCoupon"),
      },
    };
    return hook;
  },
};

export const toggle: LegacyAdapter = {
  id: "toggle",
  sha256: "865fabfd703dad5c7fefdd1adcb21be715356e3fa1e5d202f986ca4ab9a1977b",
  exports: ["3mf", "stl", "json", "card", "pinout"],
  driveTargets: () => [],
  adapt: (g) =>
    flagged("toggle", g, toggle.exports, {
      pageRev: false,
      // set commits inside the page (part4.js line 94), so it counts as a commit.
      verbs: (B, bump) => ({ setTilt: verb(B, "setTilt"), set: (...a) => { bump(); return fn(B, "set")(...a); } }),
    }),
};

export const knuckle: LegacyAdapter = {
  id: "knuckle",
  sha256: "c1cd25122127954b162df7925e0b85e0f044b120e01cc0f582776161d2c63c74",
  exports: ["3mf", "stl", "laser", "card", "json", "png"],
  driveTargets: () => [],
  adapt: (g) => flagged("knuckle", g, knuckle.exports, { pageRev: true, verbs: (B) => ({ audit: verb(B, "audit"), derive: verb(B, "derive") }) }),
};

export const tenon: LegacyAdapter = {
  id: "tenon",
  sha256: "37fee2f32d1adda1e1cd999d3d75086bd83bfe4a41c1eaea75add359a4dd4713",
  exports: ["3mf", "stl", "card", "json"],
  driveTargets: () => [],
  adapt: (g) =>
    flagged("tenon", g, tenon.exports, {
      pageRev: false,
      verbs: (B) => ({ rebuild: verb(B, "rebuild"), blankState: verb(B, "blankState"), presetState: verb(B, "presetState"), massReport: verb(B, "massReport") }),
    }),
};

export const sash: LegacyAdapter = {
  id: "sash",
  sha256: "1af452be6cccc94aced78f7d7cb292ba34742740410bd7560b2edf07b5d33cf5",
  exports: ["3mf", "stl", "card", "json"],
  driveTargets: () => [],
  adapt: (g) => flagged("sash", g, sash.exports, { pageRev: true, verbs: (B) => ({ check: verb(B, "check"), geom: verb(B, "geom") }) }),
};

export const cotter: LegacyAdapter = {
  id: "cotter",
  sha256: "9067ce3e7b0862579168b8f2e1ffdb89e44d4ddacb94b40c38c2af7614b38ffc",
  exports: ["json", "kit"],
  driveTargets: () => [],
  adapt(g) {
    const B = bench(g);
    let rev = 0;
    let built = 0;
    const idle = () => fn(B, "idle")() === true;
    const hook: BenchHook = {
      get ready() { return B["ready"] === true; },
      get state() { return fn(B, "state")(); },
      set state(_v: unknown) { throw new Error("cotter: state is read only; use loadDesign"); },
      // COTTER keeps no model object on its hook; the bill of materials is what a build yields.
      get model() { return fn(B, "bom")(); },
      get rev() { return rev; },
      get built() { if (idle()) built = rev; return built; },
      get busy() { return !idle(); },
      buildHash: null,
      error: null,
      log: [],
      async settled(timeoutMs = 120000) {
        await until("cotter", () => hook.ready && idle(), timeoutMs);
        built = rev;
      },
      loadDesign(json) { rev++; fn(B, "loadDesign")(json); },
      designJson() { return String(fn(B, "designJson")()); },
      async ensureMesh() { await hook.settled(); },
      commit() { rev++; fn(g, "commit")(); },
      drive: noDrive,
      async release() {},
      exportBytes: exporter(cotter.exports, (k) => fn(B, "exportBytes")(k)),
      verbs: { bom: verb(B, "bom"), plates: verb(B, "plates"), loadTemplate: verb(B, "loadTemplate"), waitIdle: verb(B, "waitIdle") },
    };
    return hook;
  },
};

/** Every adapter, keyed by the design folder its legacy HTML lives in. */
export const ADAPTERS: Readonly<Record<LegacyId, LegacyAdapter>> = { pip, toggle, knuckle, tenon, cotter, sash };
