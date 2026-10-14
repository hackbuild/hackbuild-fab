// Package feature kinds and their checks, by the kernel that owns them
// (M03-T08). A design gets a kernel's kinds and checks when its chase lists
// that kernel in meta.kernels, so the registry a build hashes into
// registryHash (D-051) is the one the chase declares, and a design that
// names no such kernel builds and hashes as before. M04 is built and the
// spec Registry interface (spec/registry.ts featureKind, checksFor, hash)
// still has no implementation, so this table is the kind registry and
// registryHashOf (checks.ts) hashes what it resolves. Implementing it is
// open under M04-T01, and the spec hash form under M04-T10.

import type { AnyCheckDef, AnyFeatureKindDef, FeatureKind, FeatureOf, KernelCtx, KernelId } from "@hackbuild/spec";
import type { RasterMask } from "@hackbuild/mesh";
import { inlayKind, inlayMasks } from "@hackbuild/inlay";
import { conductorKind, contactKind, padKind, portKind } from "@hackbuild/circuit";
import { pocketKind, springKind } from "@hackbuild/mesh";
import { conductorPackageChecks, inlayChecks } from "@hackbuild/checks";
import { SHEET_KINDS } from "@hackbuild/mechanisms";

/** One kernel's kinds, the raster masks their shapes name, and its checks built from the seed. */
export interface KernelKinds {
  readonly kinds: readonly AnyFeatureKindDef[];
  /** Masks a generated raster shape names, by uri, for the stage runner. */
  readonly masks?: (f: FeatureOf<FeatureKind>, ctx: KernelCtx) => ReadonlyMap<string, RasterMask>;
  readonly checks: (seed: unknown) => readonly AnyCheckDef[];
  /**
   * Kinds that join a design's registry, and so its registryHash, only when
   * its draft declares them (M06-T08). Admitting one never moves the
   * buildHash of a design that does not use it, so the references built
   * before it keep their goldens.
   */
  readonly onUse?: readonly AnyFeatureKindDef[];
}

export const PACKAGE_KINDS: Partial<Readonly<Record<KernelId, KernelKinds>>> = {
  // The conductor kind (M05-T10). Its net checks run over extracted nets in
  // circuit.solve, where the circuit kernel is registered, so the build
  // registry gains none of them here. The package a conductor is exported
  // in carries CHK-3MF-08 (M05-T20): no interlocking beams against it.
  circuit: {
    kinds: [conductorKind],
    // contact, port and pad (M05 admission) as the archetypes emit them, M06-T08.
    onUse: [contactKind, portKind, padKind],
    checks: (seed) => conductorPackageChecks({ seed }),
  },
  // The two sheet kinds M06-T02 admits, finger and flexCut, declared on cut
  // parts (packages/mechanisms/src/kinds.ts). KernelId has no mechanisms
  // entry, so they register under nest, the sheet kernel; their checks
  // (CHK-SHT-06, CHK-SHT-11) are feature-level registry checks, so the
  // kernel set adds none here.
  nest: {
    kinds: [...SHEET_KINDS],
    checks: () => [],
  },
  // pocket and spring (mesh owns them, PACKAGES.md), registered at M06-T08
  // for the PIP button archetypes; checks run from the registry by level.
  mesh: {
    kinds: [],
    onUse: [pocketKind, springKind],
    checks: () => [],
  },
  inlay: {
    kinds: [inlayKind],
    masks: (f, ctx) => inlayMasks(f as FeatureOf<"inlay">, ctx),
    checks: (seed) => inlayChecks({ seed }),
  },
};

/** The kernels of a chase that register package kinds, in the chase's order. */
export function kernelKindsOf(kernels: readonly string[]): readonly KernelKinds[] {
  return kernels.flatMap((k) => {
    const e = Object.prototype.hasOwnProperty.call(PACKAGE_KINDS, k) ? PACKAGE_KINDS[k as KernelId] : undefined;
    return e === undefined ? [] : [e];
  });
}
