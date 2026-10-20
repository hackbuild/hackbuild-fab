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
// M10-T01 adds the benches M09 did not cover:
//   BOSS, BLOCKS  window.BENCH: state, setPart, goStep, run, example,   boss.html line 2855, blocks.html line 3948
//                 exportBytes (Uint8Array), ready() a function
//   OGEE    globalThis.__ogeep: apply, pull, drive, setDrive, latched   ogee16p.html line 603
//   KNURL   window.KNURL namespace, status pill #pill                   knurl.html lines 169 and 1518
//   STYLUS  no global; picker thumbnails, #legend, #hud, #busy          thinpot/feeler.html renderPicker, v1/feeler.html rebuild
//   KEYWAY  no global; the tab bar #nav                                 keyway_sim.html line 348
//   HAFT    the PIP hook (haft (9).html, PIP's original of record)       haft-src/bench/part2.js lines 394 to 417

import type { BenchHook, DriveReadoutRecord } from "@hackbuild/spec";
import { EXPORT_ALIASES, UNKNOWN_EXPORT_KIND } from "@hackbuild/spec";

export type LegacyGlobal = Record<string, unknown> & { BENCH?: Record<string, unknown> };

export type LegacyId =
  | "pip" | "pip-haft" | "toggle" | "knuckle" | "tenon" | "cotter" | "sash"
  | "boss" | "blocks" | "ogee16" | "knurl" | "stylus" | "stylus-v1" | "keyway";

/** What a member a legacy bench lacks resolves to (D-153); the suite reports its row as not run with this text. */
export const NOT_PROVIDED = "not provided by legacy bench";

/** What a legacy drive resolves when the bench has no drive pad. */
export const NO_DRIVE = NOT_PROVIDED;

/**
 * Rows of the conformance suite a legacy page cannot answer: `roundtrip`
 * (no designJson or loadDesign), `exports` (no exportBytes), `readout`
 * (a drive moves the page but no readout reports it), `state` and `model`
 * (no design object or built model on any global).
 */
export type Lack = "roundtrip" | "exports" | "readout" | "state" | "model";

/**
 * Requests off file a legacy page makes as shipped. The suite runs offline,
 * so it answers each declared prefix locally and reports the network row
 * as not run, naming the dependency; an undeclared request still fails.
 * The port drops the dependency (RULES.md, a bench that needs a network).
 */
export interface OfflineDecl {
  /** URL prefix to a repo-relative directory of byte-identical copies, or `<stored zip>!<member prefix>` (tools/legacy/stored-zip.mjs). */
  serve?: Readonly<Record<string, string>>;
  /** URL prefixes answered with an empty body: web font sheets the page falls back from. */
  empty?: readonly string[];
  /** Record and line that state the dependency. */
  record: string;
}

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
  /** Ready before adapt, run in the page; absent means `BENCH.ready === true`. */
  isReady?(g: LegacyGlobal): boolean;
  /** Rows the page cannot answer; each is reported not run with NOT_PROVIDED. */
  lacks?: readonly Lack[];
  /** Requests off file the page makes as shipped. */
  offline?: OfflineDecl;
  /**
   * The page is kept as a member of a stored zip because its bytes carry a
   * character the voice law bans (tools/legacy/stored-zip.mjs); the suite
   * extracts the member, checks it against sha256 and opens that copy.
   */
  archive?: { zip: string; member: string };
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

/** haft (9).html, PIP's bench of record (knowledge/designs/pip.md 1.1); its hook is the PIP hook, part2.js lines 394 to 417. */
export const pipHaft: LegacyAdapter = { ...pip, id: "pip-haft", sha256: "6c9717338b2e09a2364a464876da47116727f5c3fd8911beb6e87af0bd0b82ea" };

const lacking = (id: LegacyId, member: string) => (): never => {
  throw new Error(`${id}: ${member} ${NOT_PROVIDED}`);
};

const toBase64 = (b: Uint8Array): string => {
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
};

/**
 * A hook for a page that keeps no BENCH: rev counts the adapter's own
 * commits and drives plus each change it reads in `stamp`, a page text the
 * page rewrites on every build; built follows rev once idle() holds, and
 * every member the page lacks throws NOT_PROVIDED.
 */
function synthesised(
  id: LegacyId,
  o: { ready: () => boolean; idle: () => boolean; stamp?: () => string; state?: () => unknown; drive?: BenchHook["drive"]; commit?: () => void; verbs?: Verbs },
): BenchHook {
  let rev = 0;
  let built = 0;
  let seen = o.stamp?.() ?? "";
  const observe = (): number => {
    const now = o.stamp?.() ?? "";
    if (now !== seen) { seen = now; rev++; }
    return rev;
  };
  const hook: BenchHook = {
    get ready() { return o.ready(); },
    get state() { return o.state ? o.state() : null; },
    set state(_v: unknown) { throw new Error(`${id}: state ${NOT_PROVIDED}`); },
    model: null,
    get rev() { return observe(); },
    get built() { if (o.ready() && o.idle()) built = observe(); return built; },
    get busy() { return !o.idle(); },
    buildHash: null,
    error: null,
    log: [],
    async settled(timeoutMs = 120000) {
      await until(id, () => o.ready() && o.idle(), timeoutMs);
      built = observe();
    },
    loadDesign: lacking(id, "loadDesign"),
    designJson: lacking(id, "designJson"),
    async ensureMesh() { await hook.settled(); },
    commit() { rev++; o.commit?.(); },
    async drive(target, value) {
      if (!o.drive) return noDrive(target);
      rev++;
      return o.drive(target, value);
    },
    async release() {},
    exportBytes: exporter([], () => undefined),
    ...(o.verbs ? { verbs: o.verbs } : {}),
  };
  return hook;
}

/** BOSS and BLOCKS share one hook (boss.html line 2855, blocks.html line 3948): ready() is a function, exportBytes gives a Uint8Array. */
function bossShape(id: "boss" | "blocks", g: LegacyGlobal, kinds: readonly string[]): BenchHook {
  const B = bench(g);
  const ready = () => fn(B, "ready")() === true;
  const st = () => B["state"] as { part: { id: string; params: Record<string, unknown> }; built?: unknown };
  // window.BENCH_SCENE is the scene the BUILD step composes (toJson, fromJson); the save button writes part and scene.
  const scene = () => {
    const s = g["BENCH_SCENE"] as Record<string, unknown> | undefined;
    if (!s) throw new Error(`${id}: no BENCH_SCENE global`);
    return s;
  };
  let rev = 0;
  let built = 0;
  const hook: BenchHook = {
    get ready() { return ready(); },
    get state() { return st(); },
    set state(_v: unknown) { throw new Error(`${id}: state is read only; use loadDesign`); },
    get model() { return st().built ?? null; },
    get rev() { return rev; },
    get built() { if (ready()) built = rev; return built; },
    get busy() { return !ready(); },
    buildHash: null,
    error: null,
    log: [],
    async settled(timeoutMs = 120000) {
      await until(id, ready, timeoutMs);
      built = rev;
    },
    // The bSave shape (boss.html line 2846) less the slot table, with part and scene under state for the roundtrip row.
    designJson() { return JSON.stringify({ tool: "BOSS.bench", version: 1, state: { part: st().part, scene: fn(scene(), "toJson")() } }); },
    loadDesign(json) {
      const d = JSON.parse(json) as { state?: { part?: { id: string; params?: unknown }; scene?: unknown } };
      if (!d.state?.part) throw new Error(`${id}: design has no state.part`);
      rev++;
      fn(B, "setPart")(d.state.part.id, d.state.part.params);
      fn(scene(), "fromJson")(d.state.scene ?? null);
    },
    async ensureMesh() { await hook.settled(); },
    commit() { rev++; fn(B, "setPart")(st().part.id, st().part.params); },
    drive: noDrive,
    async release() {},
    exportBytes: exporter(kinds, async (k) => toBase64((await fn(B, "exportBytes")(k)) as Uint8Array)),
    verbs: { goStep: verb(B, "goStep"), run: verb(B, "run"), example: verb(B, "example"), setPart: (...a) => { rev++; return fn(B, "setPart")(...a); } },
  };
  return hook;
}

const bossReady = (g: LegacyGlobal): boolean => {
  const r = g.BENCH?.["ready"];
  return typeof r === "function" && (r as () => unknown)() === true;
};

export const boss: LegacyAdapter = {
  id: "boss",
  sha256: "00badce59c6638dbfd6c920bed481d93a683c605330780fb197686cda4e413f5",
  exports: ["3mf", "stl", "card", "json"],
  driveTargets: () => [],
  isReady: bossReady,
  adapt: (g) => bossShape("boss", g, boss.exports),
};

export const blocks: LegacyAdapter = {
  id: "blocks",
  sha256: "96bf187a3c56fcc04cca7491c4a2ff22c1d4ed1e87954c7694d953c04faf8b6c",
  exports: ["3mf", "stl", "card", "json"],
  driveTargets: () => [],
  isReady: bossReady,
  adapt: (g) => bossShape("blocks", g, blocks.exports),
};

/** Fonts every non-BENCH legacy page links from Google; the page falls back to local faces offline. */
const FONT_SHEETS = ["https://fonts.googleapis.com/", "https://fonts.gstatic.com/"] as const;

type Ogee = Record<string, unknown> & { latched: number[][]; zR: number[]; zC: number[]; lp: number };

const ogeeOf = (g: LegacyGlobal): Ogee => {
  const o = g["__ogeep"] as Ogee | undefined;
  if (!o) throw new Error("ogee16: no __ogeep global");
  return o;
};

export const ogee16: LegacyAdapter = {
  id: "ogee16",
  sha256: "eec1e191cea91a6d04d5b47b68ef334a85b9eedc1446f30b1838fa937f035dc4",
  exports: [],
  lacks: ["roundtrip", "exports", "readout", "model"],
  offline: { empty: FONT_SHEETS, record: "ogee16p.html line 7, the Google fonts link" },
  // The boot line runs apply() and buildCheck() before it assigns __ogeep (line 600 then 603), so presence means the first apply returned.
  isReady: (g) => typeof g["__ogeep"] === "object" && g["__ogeep"] !== null,
  // The WRITE A PIXEL grid, one button per pixel labelled "row,col" (line 364).
  driveTargets: () => [...document.querySelectorAll<HTMLButtonElement>("#pix button")].map((b) => b.textContent ?? ""),
  adapt(g) {
    const o = ogeeOf(g);
    const count = () => o.latched.flat().filter((v) => v === 1).length;
    return synthesised("ogee16", {
      ready: () => ogee16.isReady?.(g) === true,
      // drive_ and pull animate zR, zC and lp back to rest; rest is idle.
      idle: () => o.zR.every((v) => v === 0) && o.zC.every((v) => v === 0) && o.lp === 0,
      state: () => ({ latched: o.latched.map((r) => [...r]), drive: o["driveMode"], expl: o["expl"], asmStep: o["asmStep"] }),
      commit: () => { fn(o, "apply")(); },
      async drive(target) {
        if (target === "pull") fn(o, "pull")();
        else {
          const m = /^(\d),(\d)$/.exec(target);
          if (!m) throw new Error(`ogee16: drive target ${target} is neither a pixel row,col nor pull`);
          fn(o, "drive")(Number(m[1]), Number(m[2]));
        }
        return { target, readout: NOT_PROVIDED, latched: `${count()}/16` };
      },
      verbs: { pull: verb(o, "pull"), setDrive: verb(o, "setDrive"), setMode: verb(o, "setMode"), setAsm: verb(o, "setAsm"), apply: verb(o, "apply") },
    });
  },
};

/** The pill after a build: `${tris.toLocaleString()} tris, ${ms} ms` (knurl.html line 1518). */
const KNURL_BUILT = /^[\d,.\s]+ tris, \d+ ms$/;
const knurlPill = (): string => document.querySelector("#pill")?.textContent ?? "";

export const knurl: LegacyAdapter = {
  id: "knurl",
  sha256: "90a7f98e708e3fa850e11ce3e58f3ab5fa612b8446f15b5f8a7efbde575e9af1",
  exports: [],
  lacks: ["roundtrip", "exports", "state", "model"],
  // three 0.185.1 and OrbitControls load through the import map (knurl.html line 1229); the stage is dead offline (knurl.md section 9).
  offline: {
    // three.core.js carries dashes in its comments, so the npm files are kept in a stored zip.
    serve: { "https://cdn.jsdelivr.net/npm/three@0.185.1/": "designs/knurl/legacy/three-0.185.1.zip!three@0.185.1/" },
    empty: FONT_SHEETS,
    record: "knowledge/designs/knurl.md section 1 runtime row and section 9 line 320",
  },
  isReady: (g) => typeof g["KNURL"] === "object" && KNURL_BUILT.test(knurlPill()),
  driveTargets: () => [],
  adapt: (g) => synthesised("knurl", { ready: () => knurl.isReady?.(g) === true, idle: () => KNURL_BUILT.test(knurlPill()), stamp: knurlPill }),
};

/** A 2D canvas with at least one painted pixel. */
const painted = (c: HTMLCanvasElement | null): boolean => {
  const ctx = c?.getContext("2d");
  if (!c || !ctx || c.width === 0 || c.height === 0) return false;
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) return true;
  return false;
};

// rebuild() renders the legend and the size HUD after upload() hands the build to the stage (v1 feeler.html rebuild, renderHUD).
const stageBuilt = (): boolean => document.querySelectorAll("#legend .lgd").length > 0 && document.querySelector("#hud b") !== null;
// renderHUD writes "<n> parts / <tris> triangles / <ms> ms" under the stage title on every build (v1 line 5208, thinpot line 6955).
const feelerStamp = (): string => document.querySelector("#shSub")?.textContent ?? "";
const feelerIdle = (): boolean => !document.querySelector("#busy")?.classList.contains("on");

export const stylus: LegacyAdapter = {
  id: "stylus",
  sha256: "35467f4b022178334c6aba422985854b6bc298927f5f552bc38e79465219b222",
  exports: [],
  lacks: ["roundtrip", "exports", "state", "model"],
  offline: { empty: FONT_SHEETS, record: "thinpot/feeler.html line 9, the Google fonts link" },
  // The pass and fail marks are emoji entities (U+2713, U+2717, U+26A0), so the page is a stored zip member.
  archive: { zip: "designs/stylus/legacy/feeler-thinpot.zip", member: "feeler.html" },
  // THINPOT boots on the type picker with no type; each card is a real build at defaults drawn to a 2D canvas (renderPicker, drawThumb).
  isReady: () => painted(document.querySelector<HTMLCanvasElement>("#pkGrid .pk canvas")),
  // Picking the first card builds that type onto the stage, as a person's first click does.
  example() {
    const card = document.querySelector<HTMLElement>("#pkGrid .pk");
    if (!card) throw new Error("stylus: no picker card");
    card.click();
  },
  driveTargets: () => [],
  adapt: (g) => synthesised("stylus", { ready: () => stylus.isReady?.(g) === true, idle: feelerIdle, stamp: feelerStamp }),
};

export const stylusV1: LegacyAdapter = {
  id: "stylus-v1",
  sha256: "0671193edade919aea986d5a3af3b8ce76d7a4af180b5568b3bae33887f8f8eb",
  exports: [],
  lacks: ["roundtrip", "exports", "state", "model"],
  offline: { empty: FONT_SHEETS, record: "v1/feeler.html line 9, the Google fonts link" },
  archive: { zip: "designs/stylus/legacy/feeler-v1.zip", member: "feeler.html" },
  // v1 boots with type cappad and builds it at boot (boot() calls rebuild(true)).
  isReady: stageBuilt,
  driveTargets: () => [],
  adapt: (g) => synthesised("stylus-v1", { ready: () => stylusV1.isReady?.(g) === true, idle: feelerIdle, stamp: feelerStamp }),
};

/** The three tabs Layer stack, Sense model, Wiring (keyway_sim.html TABS, line 345). */
const KEYWAY_TABS = 3;

export const keyway: LegacyAdapter = {
  id: "keyway",
  sha256: "7922d05d4e12387156a2103192149c8258ec15cbf9f354f153c4009b078618d9",
  exports: [],
  lacks: ["roundtrip", "exports", "state", "model"],
  offline: { empty: FONT_SHEETS, record: "keyway_sim.html line 4, the Google fonts link" },
  isReady: () => document.querySelectorAll("#nav button").length === KEYWAY_TABS,
  driveTargets: () => [],
  adapt: (g) => synthesised("keyway", { ready: () => keyway.isReady?.(g) === true, idle: () => true }),
};

/** Every adapter, keyed by id; a page is matched to its adapter by sha256. */
export const ADAPTERS: Readonly<Record<LegacyId, LegacyAdapter>> = {
  pip, "pip-haft": pipHaft, toggle, knuckle, tenon, cotter, sash,
  boss, blocks, ogee16, knurl, stylus, "stylus-v1": stylusV1, keyway,
};

/**
 * Legacy pages kept as archive only, by sha256: M10-T01 gives TANG and
 * GUDGEON a SHA256SUMS and a lineage README and ports neither, so they get
 * no adapter. The suite lists them as not benches with this reason.
 */
export const ARCHIVED: Readonly<Record<string, string>> = {
  "6ab837e3e233ffbed8c635ab9230649109c3a05cd525ce6db9d6aa89aded3735": "gudgeon.html: archive only, M10 ports no GUDGEON (M10-T01 step 1)",
  "9a12993fb5ebff4a2f4d577a4bf396698564cfc538cd213113cd4ed0332482eb": "tang_r6 (4).html: archive only, M10 ports no TANG (M10-T01 step 1)",
  "f251530457b2338c7403cae94dd0f43ab9847725062b3ba1c7ae9eddfcad2add": "tang_r5_sim (13).html: archive only, M10 ports no TANG (M10-T01 step 1)",
  "1b4f1347b15b6d5f0d09214d7081a4a1f31310964d5ff2a7e4a31395d5cf3331": "tang_r5_wiring.html: archive only, M10 ports no TANG (M10-T01 step 1)",
};
