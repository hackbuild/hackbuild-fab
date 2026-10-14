// Declared key paths (M05-T11, D-079, C-06): the PIP drive reproduction.
// A chase that declares scene.drive names, per key, the read net, its
// return net, the switch posts and a declared contact resistance, and per
// net the routed trace length with stubs, its terminal posts and its vias.
// Each key path is composed as PIP composes it (pip-controller
// src/model.js lines 393 to 416 at b137deb, designs/pip/legacy):
//
//   Rn     = Rtrace(net) + terminal posts + vias x Rpost(via)     (line 401)
//   extra  = the switch posts                                     (lines 403 to 413)
//   common = Rtrace(return) + its terminal posts                  (lines 395, 415)
//   total  = Rn + extra + Rsw + common                            (line 416)
//
// Rtrace is one path1d leg "along" at the trace width by thickness, and
// Rpost one leg "through" over a disc (postLeg), both read through profile
// sectionResistance, the one home of R = rho L / A. Rsw is the declared
// contact resistance: PIP computes it from the switch geometry over its
// rhoT, and those formulas move to the archetypes in M06, so here it is a
// declaration that takes the tier of the bulk row it was computed over.
// The read itself is chargePort, the one charge-release reader.
//
// The traces and posts are priced as in-memory legs built from the
// declaration, and the ports are the solve's own (drivePortFeatures): one
// per key at its declared interface and one per common net at its rail,
// the way solveSeriesScene builds its ports. None of them enters the Part
// IR or its buildHash. The return rail (gnd or power) sets the level a
// press pulls the floated pin toward.

import type { DriveSceneDecl, HookupDecl, McuPinSpec, Ohm, PortFeature, ProfileLookup, Qualification, Qualified, Tier } from "@hackbuild/spec";
import { lowestTier, qualify } from "@hackbuild/spec";
import { circuitError, legOf, postLeg, type PathLeg } from "../path1d.js";
import { shippedWait } from "../read/charge-release.js";
import { chargePort, type ChargeHookup, type ChargePort, type PressedPathOhm } from "./ports.js";

/** One key's composed path, in PIP's terms, with every leg it read. */
export interface DriveKey {
  readonly port: string;
  readonly net: string;
  readonly returnNet: string;
  /** Read net legs: the trace, its terminal posts, its vias, in that order (PIP's Rn). */
  readonly netLegs: readonly PathLeg[];
  /** The switch posts (PIP's extra). */
  readonly switchLegs: readonly PathLeg[];
  /** Declared contact resistance, ohm (PIP's Rsw). */
  readonly contactOhm: Ohm;
  /** Tier of the bulk row the contact was computed over; null when the key declares no contact. */
  readonly contactTier: Tier | null;
  /** Return net legs: its trace and terminal posts (PIP's common). */
  readonly returnLegs: readonly PathLeg[];
  readonly rnOhm: Ohm;
  readonly extraOhm: Ohm;
  readonly commonOhm: Ohm;
  /** rnOhm + extraOhm + contactOhm + commonOhm, ohm (model.js:416 order). */
  readonly totalOhm: Ohm;
  /** The read net's trace length with stubs, mm: PIP's netLen, the length the trace capacitance rule reads. */
  readonly traceMm: number;
  readonly q: Qualification;
}

const sum = (legs: readonly PathLeg[]): Ohm => legs.reduce((s, l) => s + l.ohm, 0);

const count = (v: unknown): boolean => typeof v === "number" && Number.isInteger(v) && v >= 0;
const positive = (v: unknown): boolean => typeof v === "number" && Number.isFinite(v) && v > 0;

/** Every key path of a drive declaration, composed; E_SCHEMA for a bad length or count, E_REF for an unknown net. */
export function driveKeys(decl: DriveSceneDecl, profile: ProfileLookup): readonly DriveKey[] {
  const at = "/scene/drive";
  for (const [k, v] of [["trace/widthMm", decl.trace.widthMm], ["trace/tMm", decl.trace.tMm], ["terminal/hMm", decl.terminal.hMm],
    ["terminal/rMm", decl.terminal.rMm], ["via/hMm", decl.via.hMm], ["via/rMm", decl.via.rMm]] as const) {
    if (!positive(v)) throw circuitError({ code: "E_SCHEMA", path: `${at}/${k}`, got: v ?? null, expected: "a length above 0 mm", hint: `declare ${k} in mm` });
  }
  const nets = new Map<string, DriveSceneDecl["nets"][number]>();
  decl.nets.forEach((n, i) => {
    if (nets.has(n.net)) throw circuitError({ code: "E_SCHEMA", path: `${at}/nets/${i}/net`, got: n.net, expected: "a net id declared once", hint: "name each drive net once" });
    if (!positive(n.lengthMm)) throw circuitError({ code: "E_SCHEMA", path: `${at}/nets/${i}/lengthMm`, got: n.lengthMm ?? null, expected: "a length above 0 mm", hint: `net ${n.net}: declare its routed length with stubs` });
    for (const k of ["terminalPosts", "vias"] as const) {
      if (!count(n[k])) throw circuitError({ code: "E_SCHEMA", path: `${at}/nets/${i}/${k}`, got: n[k] ?? null, expected: "a count of 0 or more", hint: `net ${n.net}: declare ${k} as a whole number` });
    }
    nets.set(n.net, n);
  });
  // One net's legs: the trace along its centreline, then each terminal post, then each via.
  const netLegs = (id: string, where: string): PathLeg[] => {
    const n = nets.get(id);
    if (n === undefined) throw circuitError({ code: "E_REF", path: where, got: id, hint: "name a net scene.drive declares" });
    const trace = legOf({
      kind: "conductor", id: `trace.${id}`, material: decl.material, net: id, width: decl.trace.widthMm, t: decl.trace.tMm,
      region: { centreline: [[0, 0], [n.lengthMm, 0]], face: { origin: [0, 0, 0], normal: [0, 0, 1], u: [1, 0, 0] } },
    }, profile);
    const posts = Array.from({ length: n.terminalPosts }, (_, j) => postLeg(`post.${id}.${j}`, id, decl.material, decl.terminal.hMm, decl.terminal.rMm, profile));
    const vias = Array.from({ length: n.vias }, (_, j) => postLeg(`via.${id}.${j}`, id, decl.material, decl.via.hMm, decl.via.rMm, profile));
    return [trace, ...posts, ...vias];
  };
  const seen = new Set<string>();
  return decl.keys.map((k, i): DriveKey => {
    const here = `${at}/keys/${i}`;
    if (seen.has(k.port)) throw circuitError({ code: "E_SCHEMA", path: `${here}/port`, got: k.port, expected: "a port declared once", hint: "name each drive key once" });
    seen.add(k.port);
    if (!(typeof k.contactOhm === "number" && Number.isFinite(k.contactOhm) && k.contactOhm >= 0)) {
      throw circuitError({ code: "E_SCHEMA", path: `${here}/contactOhm`, got: k.contactOhm ?? null, expected: "a resistance of 0 ohm or more", hint: `key ${k.port}: declare the switch contact in ohm, 0 for none` });
    }
    if (k.contactOhm > 0 && k.contactMaterial === undefined) {
      throw circuitError({ code: "E_SCHEMA", path: `${here}/contactMaterial`, got: null, expected: "the material whose bulk row the contact was computed over", hint: `key ${k.port}: a priced contact names its row` });
    }
    const switchLegs = k.posts.flatMap((p, j) => {
      if (!positive(p.hMm) || !positive(p.rMm) || !count(p.count)) {
        throw circuitError({ code: "E_SCHEMA", path: `${here}/posts/${j}`, got: p, expected: "hMm and rMm above 0 mm and a whole count", hint: `key ${k.port}: declare post ${p.id}` });
      }
      return Array.from({ length: p.count }, (_, c) => postLeg(`${p.id}.${c}`, k.net, decl.material, p.hMm, p.rMm, profile));
    });
    const own = netLegs(k.net, `${here}/net`);
    const ret = netLegs(k.return, `${here}/return`);
    const contactTier = k.contactMaterial === undefined ? null : profile.resistivity(k.contactMaterial, "bulk", "printed").provenance.tier;
    const rnOhm = sum(own);
    const extraOhm = sum(switchLegs);
    const commonOhm = sum(ret);
    const q = qualify([...own, ...switchLegs, ...ret].map((l) => l.tier).concat(contactTier === null ? [] : [contactTier]));
    return {
      port: k.port, net: k.net, returnNet: k.return, netLegs: own, switchLegs, contactOhm: k.contactOhm, contactTier, returnLegs: ret,
      rnOhm, extraOhm, commonOhm, totalOhm: rnOhm + extraOhm + k.contactOhm + commonOhm,
      traceMm: own[0]!.lengthMm, q,
    };
  });
}

export interface DriveSolveInput {
  readonly decl: DriveSceneDecl;
  /** Hookup entries; those whose port a drive key names are solved here. */
  readonly hookup: readonly HookupDecl[];
  readonly profile: ProfileLookup;
  readonly mcu: (id: string, at: `/${string}`) => McuPinSpec;
}

export interface DriveSolve {
  readonly keys: readonly DriveKey[];
  /** One per hookup entry a drive key names, in hookup order. */
  readonly charges: readonly ChargePort[];
  readonly unsolved: readonly { readonly port: string; readonly reason: string }[];
}

/**
 * The ports a drive declaration reads at: one signal port per key at its
 * declared interface, and one port per common net typed by its rail.
 */
export function drivePortFeatures(decl: DriveSceneDecl): PortFeature[] {
  return [
    ...decl.keys.map((k): PortFeature => ({ kind: "port", id: k.port, net: k.net, type: "signal", interface: k.interface })),
    ...decl.nets.flatMap((n): PortFeature[] => n.rail === undefined ? [] : [{ kind: "port", id: `port.${n.net}`, net: n.net, type: n.rail, interface: "digital" }]),
  ];
}

/** Every drive key read by its hookup entry through chargePort. */
export function solveDriveScene(i: DriveSolveInput): DriveSolve {
  const keys = driveKeys(i.decl, i.profile);
  const byPort = new Map(keys.map((k) => [k.port, k] as const));
  const ports = drivePortFeatures(i.decl);
  const shipped: Qualified | undefined = i.decl.shipped === undefined ? undefined : shippedWait(i.decl.shipped.keyWaitUs, i.decl.shipped.source);
  const charges: ChargePort[] = [];
  const unsolved: { port: string; reason: string }[] = [];
  for (const [j, h] of i.hookup.entries()) {
    const key = byPort.get(h.port);
    if (key === undefined) continue;
    if (h.read.model !== "charge-release") {
      unsolved.push({ port: h.port, reason: `read model ${h.read.model}; a declared drive key is read by charge-release` });
      continue;
    }
    const port = ports.find((p) => p.id === h.port)!;
    const ret = ports.find((p) => p.net === key.returnNet && p.type !== "signal");
    if (ret === undefined) {
      unsolved.push({ port: h.port, reason: `return net ${key.returnNet} declares no rail; a press returns to a gnd or power net` });
      continue;
    }
    const path: PressedPathOhm = {
      net: key.net, returnNet: key.returnNet, contact: `switch.${key.net}`, pathOhm: key.totalOhm,
      returnType: ret.type as "gnd" | "power",
      tier: (key.q.basis ?? lowestTier([...key.netLegs, ...key.returnLegs].map((l) => l.tier))) as Tier,
      unpriced: [], traceMm: key.traceMm,
    };
    const mcu = i.mcu(h.mcu, `/hookup/${j}/mcu`);
    charges.push(chargePort({
      hookup: h as ChargeHookup, port, mcu, path, profile: i.profile, unknown: key.q.qualifier === "unknown",
      source: "the declared PIP key path", ...(shipped === undefined || port.interface === "touch" ? {} : { shipped }),
    }));
  }
  return { keys, charges, unsolved };
}
