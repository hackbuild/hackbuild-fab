// The one manifold-3d instance per process (and per page, across the bench
// bundle, the engine bundle and the page build bundle). geom and mesh both
// load through here, so a host that must supply the wasm (CDN, single file,
// bundler) does it once, before the first load, with configureManifold.
//
// A page can hold several copies of this file, one inside each library that
// bundles geom. The options and the load in flight live in a page-wide state
// object beside the instance slot, so configureManifold, adoptManifold and
// loadManifold act on the same state whichever copy a caller holds.
//
// The circular settings are set here, on every instance this file hands out,
// so a round op in mesh or sim meshes the same whether or not loadGeom ran
// first.

import Module from "manifold-3d";
import type { ManifoldToplevel } from "manifold-3d";
import { MIN_CIRCULAR_ANGLE, MIN_CIRCULAR_EDGE_LENGTH } from "./rrect.js";

export interface ManifoldOptions {
  /** The wasm bytes; skips fetching manifold.wasm by URL. */
  readonly wasmBinary?: ArrayBuffer | Uint8Array;
  /** Emscripten locateFile: where manifold.wasm lives when no wasmBinary is given. */
  readonly locateFile?: (path: string, prefix: string) => string;
}

/** Page-wide slot a bundle publishes its booted module to, so a second bundle reuses it. */
const SLOT = Symbol.for("hbf.manifold");
/** Page-wide state every copy of this file reads: how the wasm loads, and the load in flight. */
const STATE = Symbol.for("hbf.manifold.state");

interface Shared {
  options: ManifoldOptions;
  loading: Promise<ManifoldToplevel> | undefined;
}

function shared(): Shared {
  const g = globalThis as Record<symbol, Shared | undefined>;
  return (g[STATE] ??= { options: {}, loading: undefined });
}

function settle(wasm: ManifoldToplevel): ManifoldToplevel {
  wasm.setMinCircularAngle(MIN_CIRCULAR_ANGLE);
  wasm.setMinCircularEdgeLength(MIN_CIRCULAR_EDGE_LENGTH);
  return wasm;
}

function slot(): ManifoldToplevel | undefined {
  return (globalThis as Record<symbol, ManifoldToplevel | undefined>)[SLOT];
}

/** Set how the wasm loads. Throws once loadManifold has started: the instance is already fixed. */
export function configureManifold(opts: ManifoldOptions): void {
  const state = shared();
  if (state.loading !== undefined) {
    throw new Error("configureManifold must run before the first loadManifold; the manifold instance is already loading");
  }
  state.options = { ...state.options, ...opts };
}

/** Use a module a host already booted (setup() called). Throws if a different instance is already loading. */
export function adoptManifold(wasm: ManifoldToplevel): void {
  const state = shared();
  if (state.loading !== undefined && slot() !== wasm) {
    throw new Error("adoptManifold must run before the first loadManifold; the manifold instance is already loading");
  }
  (globalThis as Record<symbol, ManifoldToplevel>)[SLOT] = settle(wasm);
  state.loading ??= Promise.resolve(wasm);
}

/** The shared manifold module, set up once. Every caller gets the same instance. */
export function loadManifold(): Promise<ManifoldToplevel> {
  const state = shared();
  state.loading ??= (async () => {
    const booted = slot();
    if (booted !== undefined) return settle(booted);
    // manifold-3d types the factory argument as locateFile only; emscripten also reads wasmBinary.
    const wasm = await (Module as unknown as (o: ManifoldOptions) => Promise<ManifoldToplevel>)({ ...state.options });
    wasm.setup();
    (globalThis as Record<symbol, ManifoldToplevel>)[SLOT] = settle(wasm);
    return wasm;
  })();
  return state.loading;
}
