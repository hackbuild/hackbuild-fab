// The skip rule (M04-T01 step 5, CHECKS.md section 4). The registry decides
// before calling run: a needed kernel that is not registered, a target
// level no registered producer emits yet, or a pending run body each give
// one skip result with the reason and the milestone that lands it. A check
// that did not run is reported as not run, never as pass (D-153).

import type { CheckLevel, KernelId, MilestoneId } from "@hackbuild/spec";

/**
 * Milestone that registers each kernel (MILESTONES.md Part 1 and the
 * milestone cards). copper lands with circuit (M05) and nest with motion
 * (M07), the milestones whose cards own those packages.
 */
export const KERNEL_LANDS: Readonly<Record<KernelId, MilestoneId>> = {
  geom: "M00", mesh: "M00", profile: "M00", "3mf": "M00", sim: "M02",
  inlay: "M03", circuit: "M05", copper: "M05", motion: "M07", nest: "M07", board: "M08",
};

/** Milestone whose producer first emits a target level that M00 to M04 do not (CHECKS.md section 4). */
export const TARGET_LANDS: Partial<Readonly<Record<CheckLevel, MilestoneId>>> = { net: "M05", sheet: "M07", page: "M09" };

/** What the skip rule reads from a CheckDef. */
export interface SkipInputs {
  readonly needs: readonly KernelId[];
  readonly target: CheckLevel;
  /** Milestone that lands the run body; null when the body is registered. */
  readonly pending: MilestoneId | null;
}

/** Returns the skip reason, or null when the check runs. */
export function skipReason(c: SkipInputs, kernels: ReadonlySet<KernelId>, targets: ReadonlySet<CheckLevel>): string | null {
  const missing = c.needs.filter((k) => !kernels.has(k));
  if (missing.length > 0) {
    return `kernel ${missing.join(", ")} not registered (lands ${missing.map((k) => KERNEL_LANDS[k]).join(", ")})`;
  }
  if (!targets.has(c.target)) return `no ${c.target} targets yet (lands ${TARGET_LANDS[c.target] ?? "unknown"})`;
  if (c.pending !== null) return `run lands ${c.pending}`;
  return null;
}

/** The milestone a skip reason names, for tests and the check page; null when the check runs. */
export function skipMilestone(c: SkipInputs, kernels: ReadonlySet<KernelId>, targets: ReadonlySet<CheckLevel>): MilestoneId | null {
  const missing = c.needs.filter((k) => !kernels.has(k));
  if (missing.length > 0) return missing.map((k) => KERNEL_LANDS[k]).sort().at(-1) ?? null;
  if (!targets.has(c.target)) return TARGET_LANDS[c.target] ?? null;
  return c.pending;
}
