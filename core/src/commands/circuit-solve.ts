// circuit.solve (M05-T06, D-064, D-076, D-086, D-106, D-114): one build to
// its nets, operating points and per-pin verdicts. The build is a design or
// reference directory, a chase id or an hbf://build URI. Nets come from the
// built conductive bodies (extractNets, M05-T04); every chase hookup entry
// is solved by its read model (solvePorts, M05-T05 and this card); the
// registry then runs CHK-NET-05 and CHK-NET-06 over the solved ports with
// the circuit kernel registered (and the button path checks of M05-T19 on
// a part that has one), and their results are the findings. The
// output carries nets, points and reads; check results never travel there.
//
// Engines (D-086). analytic is the default and never resolves
// eecircuit-engine. spice loads it on demand only when a port is read by
// pullup, solves each pressed divider with ngspice .op, and records the
// engine version and licence in buildInputs (D-051).
//
// Exit codes: 0 when every finding passes or warns, 1 on a fail, 2 for an
// input error such as an unknown MCU id (E_REF with didYouMean over the
// catalog ids, raised before the build runs). Nothing here exports, so
// exit 4 never occurs.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type {
  BuildInputs, BuildWarning, CheckResult, CommandInput, CommandOutput, DriveSceneDecl, HookupDecl, LegacySceneDecl, McuPinSpec, MeshRef, Net, OperatingPoint, Part,
  PortFeature, SeriesSceneDecl, Spdx, Tier,
} from "@hackbuild/spec";
import { lowestTier } from "@hackbuild/spec";
import { createProfileLookup } from "@hackbuild/profile";
import { bossLegacyRow, mcuPinRow } from "@hackbuild/catalog";
import {
  bossScene, drivePortFeatures, extractNets, loadSpice, nodeCapPf, solveDriveScene, solveLegacyScenes, solvePorts, solveSeriesScene, spiceBuildInputs, spiceDivider,
  traceCapRule, voltsText,
  type AdcPort, type BossScene, type ChargePort, type DividerEngine, type DriveKey, type NetGap, type PortSolve, type PullupPort, type SeriesPort,
} from "@hackbuild/circuit";
import { readRouteMetrics } from "@hackbuild/copper";
import { CHECK_MODULES, kernelsAt, registerChecks, runRegistry } from "@hackbuild/checks";
import { cmdError, didYouMean } from "../errors.js";
import { countsOf, findingsOf, worst, type CommandOut } from "../result.js";
import type { CoreCtx } from "../registry.js";
import type { Built } from "./build.js";
import { buildTarget } from "./part-build.js";
import { fmt } from "../text/fmt.js";
import { fromStore } from "./check-run.js";

/** The checks circuit.solve runs on the solved ports (M05-T06 steps 3 and 4) and nets (CHK-NET-28, M05-T12). */
export const CIRCUIT_SOLVE_CHECKS = ["CHK-NET-05", "CHK-NET-06", "CHK-NET-28"] as const;

/**
 * The checks circuit.solve adds on a routed part, one that carries route
 * metrics (packages/copper routeMetrics, M05-T10): islands, net to net on
 * the built solids, the trace layer rule and the route verdict. A part
 * without a route keeps the three above, so its goldens do not move.
 */
export const ROUTE_CHECKS = ["CHK-NET-01", "CHK-NET-02", "CHK-NET-11", "CHK-NET-12"] as const;

/**
 * The checks circuit.solve adds on a part with a printed button path
 * (M05-T19): a contact, an apartExcept assertion or a charge-release
 * hookup. Conductor slope, apartExcept, the actuated contact, the
 * charge-release settle and the track swing. A part with none of them keeps
 * the checks above, so its goldens do not move.
 */
export const BUTTON_CHECKS = ["CHK-NET-13", "CHK-NET-26", "CHK-NET-27", "CHK-NET-29", "CHK-NET-30"] as const;

/** The check circuit.solve adds on a part with a seat tap (K-04): each seated board pin lands on its contact. */
export const TAP_CHECKS = ["CHK-NET-46"] as const;

/** True when a port of the part is a seat tap (PortFeature.tap). */
export const hasSeatTap = (part: Part): boolean => part.features.some((f) => f.kind === "port" && f.tap !== undefined);

/** The charge-release check a declared drive scene adds (M05-T19 step 6). */
export const DRIVE_CHECKS = ["CHK-NET-29"] as const;

/** True when a part carries a printed button path the BUTTON_CHECKS read. */
export const hasButtonPath = (part: Part, hookup: readonly HookupDecl[]): boolean =>
  part.features.some((f) => f.kind === "contact")
  || part.assertions.some((a) => a.type === "apartExcept")
  || hookup.some((h) => h.read.model === "charge-release");

export type CircuitSolveInput = CommandInput<"circuit.solve">;

/** The spec output plus what the text mirror prints and the trace test reads. */
export type CircuitSolveOutput = CommandOutput<"circuit.solve"> & {
  /** The pin rows the points were classified against, by id. */
  readonly mcus: readonly McuPinSpec[];
  /** Hookup ports with no solve and why. */
  readonly unsolved: PortSolve["unsolved"];
  readonly warnings: readonly BuildWarning[];
  readonly engine: { readonly name: "analytic" | "spice"; readonly ran: boolean; readonly ngspice?: string };
  /** Declared series nets with their resistor, lead and total (scene.series, M05-T12); absent for any other chase. */
  readonly series?: readonly SeriesPort[];
  /** Declared key paths composed as PIP composes them (scene.drive, M05-T11); absent for any other chase. */
  readonly drive?: readonly DriveKey[];
  /** Net to net over every pair of a routed part, mm (M05-T10); absent for a part without a route. */
  readonly gaps?: readonly NetGap[];
  /** The build's BuildInputs, with the engine and its licence when spice ran (D-051). */
  readonly buildInputs: BuildInputs;
  /** Every result of the checks circuit.solve runs, skips included; findings carry the ones that print. */
  readonly results: readonly CheckResult[];
  readonly lines: readonly string[];
};

/** The build a call names: an hbf://build URI from the store, else a directory or chase id built now. */
async function builtOf(input: CircuitSolveInput, ctx: CoreCtx): Promise<Built> {
  return input.build.startsWith("hbf://") ? fromStore(input.build, ctx) : buildTarget(input.build, ctx, undefined, undefined, "/build");
}

export async function runCircuitSolve(input: CircuitSolveInput, ctx: CoreCtx): Promise<CommandOut<CircuitSolveOutput>> {
  // An unknown --mcu is an input error before anything builds.
  if (input.mcu !== undefined) mcuPinRow(input.mcu, "/mcu");
  return solveBuilt(await builtOf(input, ctx), input, ctx);
}

/** The hookup entries a stimulus names, each held (true); every entry when there is no stimulus. */
function stimulated(hookup: readonly HookupDecl[], stimulus: CircuitSolveInput["stimulus"]): readonly HookupDecl[] {
  if (stimulus === undefined) return hookup;
  const ports = hookup.map((h) => h.port);
  for (const [port, v] of Object.entries(stimulus)) {
    if (!ports.includes(port)) {
      throw cmdError({ code: "E_REF", path: `/stimulus/${port}`, got: port, didYouMean: didYouMean(port, ports), hint: "name a port the chase hookup lists" });
    }
    if (v !== true) {
      throw cmdError({
        code: "E_SCHEMA", path: `/stimulus/${port}`, got: v, expected: "true, a held key",
        hint: "a held key is the stimulus circuit.solve reads in M05; a numeric stimulus lands with the touch and adc references (M05-T11)",
      });
    }
  }
  return hookup.filter((h) => Object.prototype.hasOwnProperty.call(stimulus, h.port));
}

const PULLUP_STATE_LINE = (p: PullupPort): string[] => p.op.pressed.map((r) => {
  const tier = `path tier ${p.path.tier}${p.path.unpriced.length > 0 ? `, unpriced ${p.path.unpriced.join(", ")}` : ""}`;
  return `${p.pin} pressed ${r.volts.toFixed(2)} V at pullup ${String(r.pullupOhm)}, ${p.mcu.id} band ${voltsText(p.mcu.vilMaxV)} to ${voltsText(p.mcu.vihMinV)} V: ${r.state} (${p.op.qualifier}, ${tier})`;
});

const ADC_LINE = (a: AdcPort): string =>
  `${a.pin} adc source ${a.read.sourceOhm.toFixed(0)} ohm, line ${a.read.lineOhm.value.toFixed(0)} ohm: ${a.read.band} (${a.read.qualifier})`;

/** Solve one build: extraction, the port pass and the circuit checks. */
export async function solveBuilt(built: Built, input: CircuitSolveInput, ctx: CoreCtx): Promise<CommandOut<CircuitSolveOutput>> {
  const legacy = built.design.chase.scene?.legacy;
  if (legacy !== undefined) return solveLegacy(built, legacy, input, ctx);
  const series = built.design.chase.scene?.series;
  if (series !== undefined) return solveSeries(built, series, input, ctx);
  const drive = built.design.chase.scene?.drive;
  if (drive !== undefined) return solveDrive(built, drive, input, ctx);
  const { design, part } = built;
  const hookup = stimulated((design.chase.hookup ?? []) as readonly HookupDecl[], input.stimulus);
  const effective = input.mcu === undefined ? hookup : hookup.map((h) => ({ ...h, mcu: input.mcu! }));
  const profile = createProfileLookup(design.ws.tables);
  const meshes = new Map(built.meshed.bodies.map((b) => [b.ref.hash, b.mesh] as const));
  const route = readRouteMetrics(part.metrics);
  const extraction = await extractNets({ part, mesh: (r) => meshes.get(r.hash), profile, itemTransform: built.meshed.itemTransform, gaps: route !== null });

  const engineName = input.engine ?? "analytic";
  let engine: DividerEngine | undefined;
  let ngspice: string | undefined;
  if (engineName === "spice" && effective.some((h) => h.read.model === "pullup")) {
    const sp = await loadSpice();
    ngspice = sp.ngspice;
    engine = spiceDivider(sp);
  }
  const mcuOf = (id: string, at: `/${string}`): McuPinSpec => mcuPinRow(id, input.mcu === undefined ? at : "/mcu");
  const solved = await solvePorts({
    part, nets: extraction.nets, hookup: effective, profile, mcu: mcuOf, ends: input.pullup ?? "range",
    ...(engine === undefined ? {} : { engine }),
  });

  const byPort = new Map<string, PullupPort | AdcPort | ChargePort>([
    ...solved.pullups.map((p) => [p.port, p] as const), ...solved.adcs.map((a) => [a.port, a] as const), ...solved.charges.map((c) => [c.port, c] as const),
  ]);
  const button = hasButtonPath(part, effective);
  const ids: readonly string[] = [
    ...CIRCUIT_SOLVE_CHECKS, ...(route === null ? [] : ROUTE_CHECKS), ...(button ? BUTTON_CHECKS : []), ...(hasSeatTap(part) ? TAP_CHECKS : []),
  ];
  const defs = registerChecks({ seed: design.ws.checksSeed, filamentTemplate: design.ws.template }, CHECK_MODULES)
    .filter((d) => ids.includes(d.id));
  const report = await runRegistry(defs, {
    kernels: kernelsAt("M05"),
    targets: {
      parts: [part], nets: extraction.nets.map((net) => ({ net, part })),
      ...(route === null ? {} : { project: { items: [{ id: part.id, kind: "part", hash: part.buildHash }], links: [], stale: [] } }),
    },
    ctx: { profile: createProfileLookup(design.ws.tables), machine: part.machine, whitelist: new Map(), hookup: effective },
    views: {
      circuit: (p, port) => (p === part.id ? byPort.get(port) : undefined),
      ...(route === null ? {} : { extraction: (p: string) => (p === part.id ? extraction : undefined), part: (id: string) => (id === part.id ? part : undefined) }),
      // The actuated contact and apartExcept move and re-extract the built bodies (M05-T19).
      ...(button ? { mesh: (r: MeshRef) => meshes.get(r.hash) } : {}),
    },
  });
  const results = report.results;

  const mcuIds = [...new Set([...solved.pullups.map((p) => p.mcu.id), ...solved.adcs.map((a) => a.mcu.id), ...effective.map((h) => h.mcu)])];
  const mcus = mcuIds.map((id) => mcuPinRow(id, "/mcu"));
  const spice = ngspice === undefined || !solved.engineRan ? undefined : spiceBuildInputs({ ngspice });
  const buildInputs: BuildInputs = spice === undefined ? built.inputs : {
    ...built.inputs,
    engines: { ...built.inputs.engines, ...spice.engines },
    licences: { ...built.inputs.licences, ...(spice.licences as Record<string, Spdx>) },
  };
  const warnings = [...extraction.warnings, ...solved.warnings];
  const readLines = solved.charges.map(CHARGE_LINE);
  // A net with an unpriced contact or no path reads unknown (extract/resistance.ts netRecord); the line says so.
  const unpriced = extraction.nets.flatMap((n) => n.unpricedContacts);
  const netsQ = extraction.nets.every((n) => n.qualifier === "computed") ? "computed"
    : `unknown${unpriced.length > 0 ? `, unpriced ${unpriced.join(", ")}` : ""}`;
  const lines = [
    `nets ${extraction.nets.map((n) => `${n.id} ${n.totalOhm[1].toFixed(0)} ohm`).join(", ")} (${netsQ}, tier ${extraction.nets.map((n) => n.tier).join(", ")})`,
    `engine ${engineName}${ngspice === undefined ? "" : `, ngspice ${ngspice}`}${engineName === "spice" && !solved.engineRan ? " not run: no port is read by pullup" : ""}`,
    ...solved.pullups.flatMap(PULLUP_STATE_LINE),
    ...solved.adcs.map(ADC_LINE),
    ...readLines,
    ...solved.unsolved.map((u) => `${u.port} not solved: ${u.reason}`),
    ...(route === null ? [] : routeLines(route, extraction)),
    ...warnings.map((w) => `warn  ${w.code}  ${w.text}`),
  ];
  const result: CircuitSolveOutput = {
    nets: extraction.nets, points: solved.points, reads: solved.reads,
    mcus, unsolved: solved.unsolved, warnings,
    engine: { name: engineName, ran: solved.engineRan, ...(ngspice === undefined ? {} : { ngspice }) },
    ...(route === null ? {} : { gaps: extraction.gaps }),
    buildInputs, results, lines,
  };
  return {
    verdict: worst(results), stage: "done", buildHash: part.buildHash, inputsHash: ctx.inputsHash,
    findings: findingsOf(results), counts: countsOf(results), errors: [], artifacts: [], next: [], result,
  };
}

/** One charge-release read as circuit.solve prints it. */
const CHARGE_LINE = ({ pin, path, read: r, op }: ChargePort): string => {
  const pressed = op.pressed[0]!;
  return `${pin} ${path.net} charge-release tau ${r.tauUs.toFixed(3)} us, settle ${r.settleUs.toFixed(3)} us, wait ${String(r.wait.emit.value)} us (${r.wait.emit.qualifier}), reject ${r.rejectOhm.toFixed(0)} ohm: ${r.ok ? "settles" : "does not settle"}, pressed ${pressed.volts.toFixed(2)} V ${pressed.state} (${r.qualifier})`;
};

/** The route lines of a routed part: counts, pieces per net and the nearest net pairs (computed). */
function routeLines(route: NonNullable<ReturnType<typeof readRouteMetrics>>, ex: Awaited<ReturnType<typeof extractNets>>): string[] {
  const nearest = [...ex.gaps].sort((a, b) => a.mm - b.mm || (a.a + a.b < b.a + b.b ? -1 : 1)).slice(0, 4);
  const pieces = ex.nets.map((n) => `${n.id} ${ex.pieces.filter((p) => p.nets.includes(n.id)).length}`);
  return [
    `route conflicts ${route.conflicts}, unrouted ${route.unrouted} (computed by packages/copper)`,
    `pieces per net: ${pieces.join(", ")} (computed)`,
    `net to net, nearest: ${nearest.map((g) => `${g.a}/${g.b} ${g.mm.toFixed(3)} mm`).join(", ")} (computed, manifold minGap to ${ex.gapSearch?.mm.toFixed(2) ?? "?"} mm)`,
  ];
}

// ---- legacy scenes (M05-T07, D-077, D-087) ----

/** The dumped scenes a legacy declaration names, sorted by file name; E_REF when the folder is missing or empty. */
function legacyScenes(dir: string, decl: LegacySceneDecl): BossScene[] {
  const at = path.join(dir, decl.elements);
  let files: string[];
  try {
    files = readdirSync(at).filter((f) => f.endsWith(".json")).sort();
  } catch {
    files = [];
  }
  if (files.length === 0) {
    throw cmdError({ code: "E_REF", path: "/scene/legacy/elements", got: decl.elements, hint: "write the scenes with node tools/legacy/boss/dump-elements.cjs <boss-src> <folder> --table" });
  }
  return files.map((f) => bossScene(JSON.parse(readFileSync(path.join(at, f), "utf8")) as unknown, `${decl.elements}/${f}`));
}

const LEGACY_LINE = (pin: string, p: OperatingPoint, scene: string, mcu: McuPinSpec): string[] => p.pressed.map((r) =>
  `${scene} ${pin} pressed ${r.volts.toFixed(3)} V at pullup ${String(r.pullupOhm)}, ${mcu.id} band ${voltsText(mcu.vilMaxV)} to ${voltsText(mcu.vihMinV)} V: ${r.state} (${p.qualifier}, BOSS element list)`);

/**
 * A chase whose scene declares legacy element lists (the BLOCKS
 * reproduction): each pressed scene is solved by the nodal solver at the
 * boss-legacy row's pullup and read the way BOSS read it, then at each end
 * of every vendor row's pullup and classified by that row. CHK-NET-05 runs
 * on each scene and row through the circuit view; the ports it targets are
 * the solve's own, one per scene and row, and never enter the Part IR or
 * its buildHash. The build's bodies are not read.
 */
async function solveLegacy(built: Built, decl: LegacySceneDecl, input: CircuitSolveInput, ctx: CoreCtx): Promise<CommandOut<CircuitSolveOutput>> {
  const { design, part } = built;
  if (input.stimulus !== undefined) {
    throw cmdError({ code: "E_SCHEMA", path: "/stimulus", got: input.stimulus, expected: "no stimulus", hint: "a legacy scene holds its press in its element list; omit stimulus" });
  }
  const legacy = bossLegacyRow(design.target);
  const mcus = input.mcu === undefined ? decl.mcus.map((id, i) => mcuPinRow(id, `/scene/legacy/mcus/${i}`)) : [mcuPinRow(input.mcu, "/mcu")];
  const solved = solveLegacyScenes({ scenes: legacyScenes(design.dir, decl), pin: decl.pin, legacy, mcus, ends: input.pullup ?? "range" });

  const pullups = solved.rows.flatMap((r) => r.reads.map((m) => m.port));
  const byPort = new Map(pullups.map((p) => [p.port, p] as const));
  const ports: PortFeature[] = pullups.map((p) => ({ kind: "port", id: p.port, net: p.path.net, type: "signal", interface: "digital" }));
  const hookup: HookupDecl[] = pullups.map((p) => ({ port: p.port, mcu: p.mcu.id, pin: p.pin, read: { model: "pullup", active: "low" } }));
  const view: Part = { ...part, features: [...part.features, ...ports] };
  const defs = registerChecks({ seed: design.ws.checksSeed, filamentTemplate: design.ws.template }, CHECK_MODULES)
    .filter((d) => (CIRCUIT_SOLVE_CHECKS as readonly string[]).includes(d.id));
  const report = await runRegistry(defs, {
    kernels: kernelsAt("M05"),
    targets: { parts: [view], nets: [] },
    ctx: { profile: createProfileLookup(design.ws.tables), machine: part.machine, whitelist: new Map(), hookup },
    views: { circuit: (p, port) => (p === part.id ? byPort.get(port) : undefined) },
  });
  const results = report.results;

  const engineName = input.engine ?? "analytic";
  const [lo, hi] = legacy.legacy.hintBand;
  const lines = [
    `legacy scenes from ${decl.elements}, pin ${decl.pin}, ${decl.sim} element lists solved by the nodal solver (computed, BOSS v1 values, D-087)`,
    `engine analytic${engineName === "spice" ? "; spice not run: a legacy element list solves with the nodal solver only" : ""}`,
    ...solved.rows.flatMap((r) => [
      `${r.scene} ${decl.pin} pressed ${r.volts.toFixed(3)} V at pullup ${String(r.bossPullupOhm)}: ${legacy.id} ${String(legacy.legacy.single)} VIO read ${r.digital}, hint band ${String(lo)} to ${String(hi)} VIO ${r.band}, path ${String(r.pathOhm)} ohm (computed)`,
      ...r.reads.flatMap((m) => LEGACY_LINE(decl.pin, m.port.op, r.scene, m.port.mcu)),
    ]),
    ...solved.unsolved.map((u) => `${u.port} not solved: ${u.reason}`),
  ];
  const result: CircuitSolveOutput = {
    nets: [],
    points: solved.rows.flatMap((r) => [r.legacyPoint, ...r.reads.map((m) => m.port.op)]),
    reads: [],
    mcus: [legacy, ...mcus],
    unsolved: solved.unsolved,
    warnings: [],
    engine: { name: engineName, ran: false },
    buildInputs: built.inputs,
    results,
    lines,
  };
  return {
    verdict: worst(results), stage: "done", buildHash: part.buildHash, inputsHash: ctx.inputsHash,
    findings: findingsOf(results), counts: countsOf(results), errors: [], artifacts: [], next: [], result,
  };
}

// ---- declared series nets (M05-T12, D-021, C-13) ----

/**
 * A chase whose scene declares series nets (the Capricate reproduction):
 * each net is its declared resistor plus its leads, priced from the profile
 * rows (solveSeriesScene). The nets and their sensing ports are the solve's
 * own, built from the declaration; they never enter the Part IR or its
 * buildHash. CHK-NET-28 runs on each net through the circuit view. A net's
 * Net record holds its conductors only (bulkOhm is the lead share, as the
 * spec defines totalOhm); the resistor and the total travel in `series`.
 */
async function solveSeries(built: Built, decl: SeriesSceneDecl, input: CircuitSolveInput, ctx: CoreCtx): Promise<CommandOut<CircuitSolveOutput>> {
  const { design, part } = built;
  for (const k of ["stimulus", "mcu", "pullup"] as const) {
    if (input[k] !== undefined) {
      throw cmdError({ code: "E_SCHEMA", path: `/${k}`, got: input[k], expected: `no ${k}`, hint: `a declared series net names no receiving pin or press; omit ${k}` });
    }
  }
  const profile = createProfileLookup(design.ws.tables);
  const solved = solveSeriesScene(decl, profile);
  // Every conductor on a net reads its row, the electrode included, so a net with no lead still carries the material's tier (extract/resistance.ts).
  const materialTier: Tier = profile.resistivity(decl.material, "along", "printed").provenance.tier;
  const nets: Net[] = solved.map((s) => ({
    id: s.net,
    conductors: s.legs.map((l) => l.conductor),
    bodies: [...(s.electrode === null ? [] : [s.electrode]), ...s.legs.map((l) => l.conductor)],
    terminals: [s.port],
    resistance: s.legs.length === 0 ? [] : [{
      terminals: [s.port, s.electrode ?? s.legs[s.legs.length - 1]!.conductor],
      preview: { method: "path-1d", segments: s.legs.map((l) => ({ direction: l.direction, lengthMm: l.lengthMm, areaMm2: l.areaMm2, ohmCm: l.ohmCm, ohm: l.ohm })), ohm: s.conductorOhm },
      solved: null, solvedOverPreview: null,
    }],
    bulkOhm: s.conductorOhm,
    contacts: [],
    totalOhm: [s.conductorOhm, s.conductorOhm],
    unpricedContacts: [],
    capToGndPf: 0,
    couplingPf: {},
    capMethod: "pip-per-mm",
    tier: s.tier ?? materialTier,
    qualifier: s.q.qualifier,
  }));
  const ports: PortFeature[] = solved.map((s) => ({ kind: "port", id: s.port, net: s.net, type: "signal", interface: s.interface }));
  const byPort = new Map(solved.map((s) => [s.port, s] as const));
  const view: Part = { ...part, features: [...part.features, ...ports] };
  const defs = registerChecks({ seed: design.ws.checksSeed, filamentTemplate: design.ws.template }, CHECK_MODULES)
    .filter((d) => (CIRCUIT_SOLVE_CHECKS as readonly string[]).includes(d.id));
  const report = await runRegistry(defs, {
    kernels: kernelsAt("M05"),
    targets: { parts: [view], nets: nets.map((net) => ({ net, part: view })) },
    ctx: { profile, machine: part.machine, whitelist: new Map(), hookup: [] },
    views: { circuit: (p, port) => (p === part.id ? byPort.get(port) : undefined) },
  });
  const results = report.results;
  const engineName = input.engine ?? "analytic";
  const lines = [
    `series nets from scene.series, ${String(solved.length)} nets of ${decl.material}: declared resistor plus leads priced from the profile rows (computed)`,
    `engine analytic${engineName === "spice" ? "; spice not run: a series net is a sum of resistances" : ""}`,
    ...solved.map((s) => `${s.net} path ${fmt(s.totalOhm)} ohm: resistor ${fmt(s.resistorOhm)} ohm, lead ${fmt(s.leadMm)} mm at ${fmt(s.conductorOhm)} ohm (${s.q.qualifier}${s.tier === null ? "" : `, tier ${s.tier}`})`),
  ];
  const result: CircuitSolveOutput = {
    nets, points: [], reads: [], mcus: [], unsolved: [], warnings: [],
    engine: { name: engineName, ran: false }, series: solved, buildInputs: built.inputs, results, lines,
  };
  return {
    verdict: worst(results), stage: "done", buildHash: part.buildHash, inputsHash: ctx.inputsHash,
    findings: findingsOf(results), counts: countsOf(results), errors: [], artifacts: [], next: [], result,
  };
}

// ---- declared key paths (M05-T11, D-079, D-080) ----

/**
 * A chase whose scene declares drive keys (the PIP drive reproduction):
 * each key path is composed from the declared trace lengths, posts and
 * switch contact (solveDriveScene) and read by its hookup entry through
 * chargePort, the one charge-release reader. The nets and ports are the
 * solve's own, built from the declaration; they never enter the Part IR or
 * its buildHash, and nothing is extracted from the bodies. The registry runs
 * the circuit checks on the build's ports and these nets; the charge-release
 * gate is CHK-NET-29's.
 */
async function solveDrive(built: Built, decl: DriveSceneDecl, input: CircuitSolveInput, ctx: CoreCtx): Promise<CommandOut<CircuitSolveOutput>> {
  const { design, part } = built;
  if (input.pullup !== undefined) {
    throw cmdError({ code: "E_SCHEMA", path: "/pullup", got: input.pullup, expected: "no pullup", hint: "a drive key is read by charge-release with no pull; omit pullup" });
  }
  const hookup = stimulated((design.chase.hookup ?? []) as readonly HookupDecl[], input.stimulus);
  const effective = input.mcu === undefined ? hookup : hookup.map((h) => ({ ...h, mcu: input.mcu! }));
  const profile = createProfileLookup(design.ws.tables);
  const mcuOf = (id: string, at: `/${string}`): McuPinSpec => mcuPinRow(id, input.mcu === undefined ? at : "/mcu");
  const solved = solveDriveScene({ decl, hookup: effective, profile, mcu: mcuOf });
  const view: Part = { ...part, features: [...part.features, ...drivePortFeatures(decl)] };
  const rule = traceCapRule(profile);
  const nets: Net[] = decl.nets.map((n) => {
    const key = solved.keys.find((k) => k.net === n.net);
    const legs = key?.netLegs ?? solved.keys.find((k) => k.returnNet === n.net)?.returnLegs ?? [];
    const ohm = legs.reduce((a, l) => a + l.ohm, 0);
    const ports = view.features.filter((f): f is PortFeature => f.kind === "port" && f.net === n.net).map((f) => f.id);
    return {
      id: n.net,
      conductors: legs.map((l) => l.conductor),
      bodies: part.bodies.filter((b) => b.id === `trace.${n.net}`).map((b) => b.id),
      terminals: ports,
      resistance: legs.length === 0 ? [] : [{
        terminals: [ports[0] ?? n.net, legs[legs.length - 1]!.conductor],
        preview: { method: "path-1d", segments: legs.map((l) => ({ direction: l.direction, lengthMm: l.lengthMm, areaMm2: l.areaMm2, ohmCm: l.ohmCm, ohm: l.ohm })), ohm },
        solved: null, solvedOverPreview: null,
      }],
      bulkOhm: ohm,
      contacts: [],
      totalOhm: [ohm, ohm],
      unpricedContacts: [],
      capToGndPf: nodeCapPf(0, n.lengthMm, { perMmPf: rule.perMmPf.value, fixedPf: rule.fixedPf.value }),
      couplingPf: {},
      capMethod: "pip-per-mm",
      tier: legs.length === 0 ? profile.resistivity(decl.material, "along", "printed").provenance.tier : lowestTier(legs.map((l) => l.tier)) as Tier,
      qualifier: "computed",
    };
  });
  const driveIds: readonly string[] = [...CIRCUIT_SOLVE_CHECKS, ...DRIVE_CHECKS];
  const defs = registerChecks({ seed: design.ws.checksSeed, filamentTemplate: design.ws.template }, CHECK_MODULES)
    .filter((d) => driveIds.includes(d.id));
  const byCharge = new Map(solved.charges.map((c) => [c.port, c] as const));
  const report = await runRegistry(defs, {
    kernels: kernelsAt("M05"),
    targets: { parts: [view], nets: nets.map((net) => ({ net, part: view })) },
    ctx: { profile, machine: part.machine, whitelist: new Map(), hookup: effective },
    // CHK-NET-29 reads each key's read record, chargePort over the declared path (M05-T19 step 6).
    views: { circuit: (p, port) => (p === part.id ? byCharge.get(port) : undefined) },
  });
  const results = report.results;
  const engineName = input.engine ?? "analytic";
  const mOhm = (v: number): string => (v / 1e6).toFixed(2);
  const keyRows = solved.charges.filter((c) => c.path.returnType === "gnd");
  const touchRows = solved.charges.filter((c) => c.path.returnType !== "gnd");
  const range = (rows: readonly ChargePort[]): string => rows.length === 0 ? "none"
    : `${mOhm(Math.min(...rows.map((c) => c.path.pathOhm)))} to ${mOhm(Math.max(...rows.map((c) => c.path.pathOhm)))} Mohm`;
  const slowest = [...keyRows].sort((a, b) => b.read.tauUs - a.read.tauUs)[0];
  const lines = [
    `drive keys from scene.drive, ${String(solved.keys.length)} keys of ${decl.material}: PIP's key path (pip-controller src/model.js lines 393 to 416) over the profile rows and the declared switch contacts (computed)`,
    `route: ${decl.route}`,
    `engine analytic${engineName === "spice" ? "; spice not run: a drive key is an RC discharge with a closed form (rcCrossingUs); the test runs the ngspice cross-check" : ""}`,
    ...solved.keys.map((k) => {
      const c = solved.charges.find((x) => x.port === k.port);
      return `${c?.pin ?? k.port} ${k.net} path ${fmt(k.totalOhm)} ohm: net ${fmt(k.rnOhm)}, switch posts ${fmt(k.extraOhm)}, contact ${fmt(k.contactOhm)} (declared${k.contactTier === null ? "" : `, ${k.contactTier}`}), return ${k.returnNet} ${fmt(k.commonOhm)}; trace ${fmt(k.traceMm)} mm, C ${c === undefined ? "?" : c.read.cPf.toFixed(3)} pF (${k.q.qualifier}${k.q.basis === null ? "" : `, tier ${k.q.basis}`})`;
    }),
    ...solved.charges.map(CHARGE_LINE),
    ...solved.charges.flatMap((c) => c.read.wait.firmwareShipped === undefined ? [] : [
      `${c.pin} ${c.path.net} published firmware wait ${String(c.read.wait.firmwareShipped.value)} us (${c.read.wait.firmwareShipped.qualifier}, ${c.read.wait.firmwareShipped.source}), emitted ${String(c.read.wait.emit.value)} us; the owner decides which ships`,
    ]),
    `key paths ${range(keyRows)}, touch paths ${range(touchRows)} without the skin${slowest === undefined ? "" : `, slowest key ${slowest.path.net} tau ${slowest.read.tauUs.toFixed(3)} us, settle ${slowest.read.settleUs.toFixed(3)} us`} (computed)`,
    ...solved.unsolved.map((u) => `${u.port} not solved: ${u.reason}`),
  ];
  const mcuIds = [...new Set([...solved.charges.map((c) => c.mcu.id), ...effective.map((h) => h.mcu)])];
  const result: CircuitSolveOutput = {
    nets, points: solved.charges.map((c) => c.op), reads: solved.charges.map((c) => c.read),
    mcus: mcuIds.map((id) => mcuPinRow(id, "/mcu")), unsolved: solved.unsolved, warnings: [],
    engine: { name: engineName, ran: false }, drive: solved.keys, buildInputs: built.inputs, results, lines,
  };
  return {
    verdict: worst(results), stage: "done", buildHash: part.buildHash, inputsHash: ctx.inputsHash,
    findings: findingsOf(results), counts: countsOf(results), errors: [], artifacts: [], next: [], result,
  };
}
