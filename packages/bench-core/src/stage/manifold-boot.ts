/// <reference lib="dom" />
// Boots manifold-3d from the two classic scripts a bake writes (D-129): the
// module factory on one global and the wasm as base64 on another. A module or
// blob Worker cannot load under file://, so the binary arrives inline.
// Port of pip-controller vendor/manifold-classic.js `ManifoldBoot`.

import { adoptManifold } from "@hackbuild/geom";

export interface ManifoldGlobals {
  /** Global holding the classic module factory; the bake's classic `global`. */
  readonly factory: string;
  /** Global holding the base64 wasm; the bake's wasm `global`. */
  readonly wasm: string;
}

type Factory = (arg: { wasmBinary: Uint8Array }) => Promise<{ setup(): void }>;

function decode(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/** Resolves to the set-up manifold module; rejects naming the missing global. */
export async function bootManifold<M extends { setup(): void }>(names: ManifoldGlobals): Promise<M> {
  const g = globalThis as Record<string, unknown>;
  const factory = g[names.factory];
  const b64 = g[names.wasm];
  if (typeof factory !== "function") throw new Error(`manifold factory ${names.factory} missing from the page`);
  if (typeof b64 !== "string") throw new Error(`manifold wasm ${names.wasm} missing from the page`);
  const m = await (factory as Factory)({ wasmBinary: decode(b64) });
  m.setup();
  // geom and mesh load through the shared slot, so the build bundle reuses this instance.
  adoptManifold(m as unknown as Parameters<typeof adoptManifold>[0]);
  return m as M;
}

/** A manifold module a caller booted itself, setup() already called. */
export type BootedManifold = Parameters<typeof adoptManifold>[0];

/** Hands a caller-booted module to geom and mesh, for a host that supplies the wasm without page globals. */
export function adoptBootedManifold(m: BootedManifold): void {
  adoptManifold(m);
}
