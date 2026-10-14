// Legacy BOSS scenes in circuit.solve (M05-T07, D-076, D-077, D-087): the
// BLOCKS reproduction solves the element lists the BOSS sim built, as
// tools/legacy/boss/dump-elements.cjs wrote them, with the analytic nodal
// solver (dc/nodal.ts, M05-T03). No geometry is extracted; the pin stud,
// wire, switch and rail elements carry BOSS's own values (BOSS v1, the
// default while D-087 is open).
//
// Two reads per scene. Legacy mode: the PULLUP element at the boss-legacy
// row's 50 kohm, read the way BOSS read it. The two reads are ported from
// designs/blocks/legacy/boss-src: one threshold at 0.5 VIO (sim.js line
// 135, `p.v > vio * 0.5`, lineage blocks.sim/boss-legacy) and the UI hint
// band 0.3 to 0.7 VIO (app2.js line 236, `p.v > 0.3 vio && p.v < 0.7 vio`,
// lineage blocks.verdict/boss-src-app2). Per-MCU mode:
// the same element list with the PULLUP element replaced by each end of a
// catalog row's pullup, classified by that row's VIL and VIH through
// read/pullup.ts, the one classifier (D-076).

import type { LegacyThreshold, McuPinSpec, Ohm, OperatingPoint, PinState, Tier, Volt } from "@hackbuild/spec";
import { circuitError } from "../path1d.js";
import { solveDc, type DcElement, type DcNetwork } from "../dc/nodal.js";
import { pullupEnds, pullupRead } from "../read/pullup.js";
import { pickEnds, type PressedPathOhm, type PullupEnds, type PullupPort } from "./ports.js";

/** One scene as the dump writes it. The `boss` block holds BOSS's own results; the solve never reads it. */
export interface BossScene {
  readonly name: string;
  readonly source: string;
  /** The PULLUP value the dump ran, ohm. */
  readonly pullupOhm: Ohm;
  readonly ok: boolean;
  readonly network: {
    readonly nodeCount: number;
    readonly ground: number;
    readonly nodes: readonly string[];
    readonly resistors: readonly { readonly a: number; readonly b: number; readonly ohm: Ohm; readonly tag: string }[];
    readonly leds: readonly { readonly anode: number; readonly cathode: number; readonly vfV: Volt; readonly seriesOhm: Ohm }[];
    readonly sources: readonly { readonly pos: number; readonly neg: number; readonly volts: Volt; readonly tag: string }[];
  };
  /** The BUTTON scene of M05-T07 step 1: wire shape, length and core, and whether the button is pressed. */
  readonly button?: { readonly shape: string; readonly lenMm: number; readonly core: string; readonly pressed: boolean };
}

/**
 * The tier of a pressed path priced from BOSS's element values: pin stud
 * paths at 30 ohm cm plus a 400 ohm socket estimate, the switch at 3 kohm
 * Ron plus leads (parts.js lines 175, 456, 421 and BOSS record 5.11), so
 * inferred. A passing CHK-NET-05 on one reports warn (D-081).
 */
export const LEGACY_PATH_TIER: Tier = "inferred";

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** A dumped scene checked for the fields the solve reads; E_SCHEMA naming the file and field otherwise. */
export function bossScene(raw: unknown, file: string): BossScene {
  const bad = (field: string): never => {
    throw circuitError({ code: "E_SCHEMA", path: `/scene/${field}`, got: file, hint: `${file} is not a scene tools/legacy/boss/dump-elements.cjs wrote; rerun the dump` });
  };
  const s = raw as Partial<BossScene> | null;
  if (typeof s !== "object" || s === null) return bad("");
  if (typeof s.name !== "string" || typeof s.source !== "string" || !isNum(s.pullupOhm) || typeof s.ok !== "boolean") return bad("name");
  const n = s.network;
  if (s.ok && (typeof n !== "object" || n === null || !isNum(n.nodeCount) || !isNum(n.ground)
    || !Array.isArray(n.resistors) || !Array.isArray(n.leds) || !Array.isArray(n.sources))) return bad("network");
  return s as BossScene;
}

/** The PULLUP element of `pin`, sim.js line 91: `addR(pinNode, 'vio' + uid, 50e3, 'pullup ' + pn)`. */
function pullupIndex(scene: BossScene, pin: string): number {
  const tag = `pullup ${pin}`;
  const at = scene.network.resistors.flatMap((r, i) => (r.tag === tag ? [i] : []));
  if (at.length !== 1) {
    throw circuitError({ code: "E_SCHEMA", path: "/scene/legacy/pin", got: pin, hint: `${scene.name} holds ${at.length} elements tagged "${tag}"; a scene reads one pin in PULLUP mode` });
  }
  return at[0]!;
}

/**
 * The scene's element list as a DcNetwork in BOSS's stamping order
 * (resistors, LEDs, sources; sim.js lines 120 to 128), with the PULLUP
 * element of `pin` at `pullupOhm` when one is given.
 */
export function bossNetwork(scene: BossScene, pin?: string, pullupOhm?: Ohm): DcNetwork {
  const pu = pin === undefined || pullupOhm === undefined ? -1 : pullupIndex(scene, pin);
  const elements: DcElement[] = [
    ...scene.network.resistors.map((r, i): DcElement => ({ kind: "resistor", a: r.a, b: r.b, ohm: i === pu ? pullupOhm! : r.ohm, tag: r.tag })),
    ...scene.network.leds.map((d): DcElement => ({ kind: "ledPwl", anode: d.anode, cathode: d.cathode, vfV: d.vfV, seriesOhm: d.seriesOhm })),
    ...scene.network.sources.map((v): DcElement => ({ kind: "vsource", pos: v.pos, neg: v.neg, volts: v.volts, tag: v.tag })),
  ];
  return { nodeCount: scene.network.nodeCount, ground: scene.network.ground, elements };
}

/**
 * The pin and the VIO rail with the PULLUP element at `pullupOhm`, V: one
 * nodal solve over the scene's element list. The pullup runs from the pin
 * node to the VIO node (sim.js line 91), so VIO is read from the same
 * solve.
 */
export function solveScene(scene: BossScene, pin: string, pullupOhm: Ohm): { readonly pinV: Volt; readonly vioV: Volt } {
  const r = scene.network.resistors[pullupIndex(scene, pin)]!;
  const v = solveDc(bossNetwork(scene, pin, pullupOhm)).volts;
  return { pinV: v[r.a]!, vioV: v[r.b]! };
}

/** The pin voltage with the PULLUP element at `pullupOhm`, V. */
export function sceneVolts(scene: BossScene, pin: string, pullupOhm: Ohm): Volt {
  return solveScene(scene, pin, pullupOhm).pinV;
}

/** BOSS's digital read, sim.js line 135: HIGH when V is above vio x single, else LOW. */
export function bossDigital(v: Volt, vioV: Volt, legacy: LegacyThreshold): "LOW" | "HIGH" {
  return v > vioV * legacy.single ? "HIGH" : "LOW";
}

/** Where a pressed voltage sits against BOSS's UI hint band. */
export type HintBand = "low" | "undefined" | "released";

/**
 * BOSS's undefined-band hint, app2.js line 236: undefined strictly inside
 * hintBand x vio. At or above the top the pin reads as released, at or
 * below the bottom as a clean low.
 */
export function bossHint(v: Volt, vioV: Volt, legacy: LegacyThreshold): HintBand {
  const [lo, hi] = [legacy.hintBand[0] * vioV, legacy.hintBand[1] * vioV];
  if (v > lo && v < hi) return "undefined";
  return v >= hi ? "released" : "low";
}

/** One scene's pin read at one catalog row: the pressed reading at each pullup end classified. */
export interface LegacyMcuRead {
  readonly mcu: string;
  readonly port: PullupPort;
}

/** One solved scene: the legacy read at BOSS's pullup and the per-MCU reads. */
export interface LegacySceneRow {
  readonly scene: string;
  readonly button?: BossScene["button"];
  /** The boss-legacy row's pullup, ohm. */
  readonly bossPullupOhm: Ohm;
  /** Pressed pin voltage at that pullup, V (computed). */
  readonly volts: Volt;
  readonly digital: "LOW" | "HIGH";
  readonly band: HintBand;
  /**
   * The pressed path the element list presents at the pin, whole ohm
   * (computed): V Rpu / (VIO - V) at BOSS's pullup. The press returns the
   * pin to ground through a series chain, so this is the divider's lower
   * leg. CHK-NET-05 prices the pullup interval on it; every volt here comes
   * from the nodal solve, never from this path.
   */
  readonly pathOhm: Ohm;
  readonly reads: readonly LegacyMcuRead[];
  /** The legacy row's operating point: data for the reproduction, never a verdict (D-076). */
  readonly legacyPoint: OperatingPoint;
}

export interface LegacySolveInput {
  readonly scenes: readonly BossScene[];
  readonly pin: string;
  /** The boss-legacy row (catalog bossLegacyRow). */
  readonly legacy: McuPinSpec & { readonly legacy: LegacyThreshold };
  /** Vendor rows the pin is classified against. */
  readonly mcus: readonly McuPinSpec[];
  readonly ends: PullupEnds;
}

export interface LegacySolve {
  readonly rows: readonly LegacySceneRow[];
  /** Scenes with no pressed read and why: a released button or a scene BOSS could not solve. */
  readonly unsolved: readonly { readonly port: string; readonly reason: string }[];
}

/** The port id a scene's read at one row travels under to CHK-NET-05. */
export const legacyPortId = (scene: string, mcu: string): string => `port.${scene}.${mcu}`;

/** Every pressed scene, read at BOSS's pullup and at each row's pullup ends. */
export function solveLegacyScenes(input: LegacySolveInput): LegacySolve {
  const { pin, legacy } = input;
  const bossPu = pullupEnds(legacy);
  if (bossPu.length !== 1) throw circuitError({ code: "E_SCHEMA", path: "/mcu", got: legacy.id, hint: "the boss-legacy row holds one pullup value" });
  const rpuBoss = bossPu[0]!;
  const rows: LegacySceneRow[] = [];
  const unsolved: { port: string; reason: string }[] = [];
  for (const scene of input.scenes) {
    if (!scene.ok) {
      unsolved.push({ port: scene.name, reason: "BOSS could not solve this scene" });
      continue;
    }
    const button = scene.button;
    if (button?.pressed !== true) {
      unsolved.push({ port: scene.name, reason: "no pressed button in this scene" });
      continue;
    }
    const { pinV: volts, vioV: vio } = solveScene(scene, pin, rpuBoss);
    if (Math.abs(vio - legacy.vddV) > 1e-9) {
      throw circuitError({ code: "E_SCHEMA", path: "/scene/network/sources", got: vio, expected: `${legacy.vddV} V`, hint: `${scene.name} runs VIO ${vio} V and the ${legacy.id} row ${legacy.vddV} V; they describe one board` });
    }
    const pathOhm = Math.round((volts * rpuBoss) / (vio - volts));
    const net = `${scene.name}:${pin}`;
    const solvedV = (rpu: Ohm): Volt => (rpu === rpuBoss ? volts : sceneVolts(scene, pin, rpu));
    const legacyPoint = pullupRead({ net, pathOhm, pathTiers: [LEGACY_PATH_TIER], mcu: legacy, active: "low", solvedV }).op;
    const reads = input.mcus.map((mcu): LegacyMcuRead => {
      const ends = pickEnds(pullupEnds(mcu), input.ends);
      const path: PressedPathOhm = {
        net, returnNet: "GND", contact: "switch", pathOhm, returnType: "gnd", tier: LEGACY_PATH_TIER, unpriced: [], traceMm: button.lenMm,
      };
      const r = pullupRead({
        net, pathOhm, pathTiers: [LEGACY_PATH_TIER], mcu, active: "low", solvedV,
        ...(ends.length === 1 ? { externalOhm: ends[0]! } : {}),
      });
      return { mcu: mcu.id, port: { port: legacyPortId(scene.name, mcu.id), pin, mcu, path, ends, op: r.op } };
    });
    rows.push({
      scene: scene.name, button, bossPullupOhm: rpuBoss, volts,
      digital: bossDigital(volts, vio, legacy.legacy), band: bossHint(volts, vio, legacy.legacy),
      pathOhm, reads, legacyPoint,
    });
  }
  return { rows, unsolved };
}

/** A per-MCU state at one pullup end, for the text mirror and the tests. */
export const stateAt = (read: LegacyMcuRead, pullupOhm: Ohm): PinState | undefined => read.port.op.pressed.find((p) => p.pullupOhm === pullupOhm)?.state;
