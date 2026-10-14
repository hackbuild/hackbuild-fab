// spec/capabilities.ts
/**
 * Status: draft until the M13 exit. MILESTONES.md 1.5, D-179.
 * M13 is the first milestone that runs this file.
 */
// The fab capability vocabulary (D-161). Panels declare what they require.
// Observe capabilities need nothing. Consequential capabilities arm per
// device per session with one informational confirm stating what the action
// does; the user is trusted and there are no lockouts.
// Version 4, 2026-10-04. Carries D-093, D-161.

export const OBSERVE_CAPABILITIES = [
  "mesh.3d", "sheet.2d", "circuit.netlist", "print.3mf", "cut.svg", "render", "check",
] as const;

export const CONSEQUENTIAL_CAPABILITIES = ["send.print", "fire.laser", "heat.bed", "cut.vinyl"] as const;

export type ObserveCapability = (typeof OBSERVE_CAPABILITIES)[number];
export type ConsequentialCapability = (typeof CONSEQUENTIAL_CAPABILITIES)[number];
export type Capability = ObserveCapability | ConsequentialCapability;

/** An armed consequential capability, scoped to one device and one session. */
export interface CapabilityArm {
  readonly capability: ConsequentialCapability;
  /** Device id the arm applies to. */
  readonly device: string;
  /** Session id; the arm ends when the page unloads. */
  readonly session: string;
  /** Epoch milliseconds when armed, ms. */
  readonly armedAt: number;
  /** True once device telemetry confirmed the arm (D-093). */
  readonly confirmedByTelemetry: boolean;
}
