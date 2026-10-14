// Rapier is @dimforge/rapier3d-deterministic-compat 0.21.0 (D-134), loaded
// on first use so a process that never simulates never parses the inlined
// wasm. RAPIER.init() runs once per process; every caller shares the promise.

export type Rapier = typeof import("@dimforge/rapier3d-deterministic-compat").default;

let ready: Promise<Rapier> | undefined;

export function initRapier(): Promise<Rapier> {
  ready ??= import("@dimforge/rapier3d-deterministic-compat").then(async (m) => {
    await m.default.init();
    return m.default;
  });
  return ready;
}
