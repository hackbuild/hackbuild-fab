// keys/midi-pad reference (K-04): every key and the fader read through the
// seated RP2040-Zero, with no lead to the body edge. The real build (core
// buildPart at the pinned epoch) is extracted from its meshes, and each
// net's read path is walked conductor by conductor: from the seat bump the
// board pin presses on, to the key's contact, or to the fader terminal
// post. Expected chains are named from the chase and build.ts layout, never
// read from the goldens; the parity goldens are rerun without accept off
// the pinned epoch.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import type { HookupDecl, PortFeature } from "@hackbuild/spec";
import { createProfileLookup } from "@hackbuild/profile";
import { extractNets, readPath, type Extraction } from "@hackbuild/circuit";
import { buildPart, loadDesign, resolveParams, type Built, type Design } from "../../../../core/src/commands/build.js";
import { runParity } from "../../../../core/src/commands/parity.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..", "..");
const REF = "reference/keys/midi-pad";
const SEAT = "rp2040-zero-seat.0";
const KEYS = [["K1", "GP8"], ["K2", "GP7"], ["K3", "GP6"], ["K4", "GP5"]] as const;

let design: Design;
let built: Built;
let ex: Extraction;
beforeAll(async () => {
  design = await loadDesign(REF, ROOT);
  built = await buildPart(design, resolveParams(design.chase, undefined, undefined), { epoch: 315532800 });
  const meshes = new Map(built.meshed.bodies.map((b) => [b.ref.hash, b.mesh] as const));
  ex = await extractNets({ part: built.part, profile: createProfileLookup(design.ws.tables), mesh: (r) => meshes.get(r.hash), itemTransform: built.meshed.itemTransform });
}, 300_000);

const chainOf = (net: string, contact?: string): readonly string[] => {
  const p = readPath({
    id: net, part: built.part, profile: createProfileLookup(design.ws.tables), leads: ex.leads[net] ?? [], touching: ex.touching,
    bodiesOf: (b) => ex.nets.find((n) => n.id === net)?.bodies.includes(b) ?? false,
  }, contact);
  if (p === null) throw new Error(`net ${net} has no read path`);
  return p.chain;
};

describe("midi-pad reads through the seat", () => {
  test("every net starts at a seat tap; no lead runs to the body edge for a terminal", () => {
    for (const n of ex.nets) {
      const first = ex.leads[n.id]?.[0];
      expect(first?.port, n.id).toMatch(new RegExp(`^${SEAT}\\.port\\.`));
    }
    expect(ex.warnings.map((w) => w.code).filter((c) => c !== "NET_SHORT")).toEqual([]);
    expect(built.part.features.some((f) => f.id.startsWith("conductor.test"))).toBe(false);
  });

  test("each key reads from its GP pin bump along its own lane to its contact", () => {
    KEYS.forEach(([net, pin], i) => {
      const chain = chainOf(net);
      expect(chain[0], net).toBe(`${SEAT}.conductor.bump${pin}`);
      expect(chain, net).toContain(`conductor.sig${i + 1}`);
      expect(chain[chain.length - 1], net).toBe(`flex-cone-key.${i}.conductor.col`);
      const r = ex.nets.find((n) => n.id === net)!.resistance[0]!;
      expect(r.terminals).toEqual([`${SEAT}.port.${pin}`, `flex-cone-key.${i}.contact.key`]);
    });
  });

  test("the GND return is priced per key, from the seat's GND bump to that key's contact", () => {
    const gnd = ex.nets.find((n) => n.id === "GND")!;
    expect(gnd.resistance.map((r) => r.terminals)).toEqual(KEYS.map((_, i) => [`${SEAT}.port.GND`, `flex-cone-key.${i}.contact.key`]));
    KEYS.forEach((_, i) => {
      const chain = chainOf("GND", `flex-cone-key.${i}.contact.key`);
      expect(chain[0]).toBe(`${SEAT}.conductor.bumpGND`);
      expect(chain).toContain(`conductor.com${i + 1}`);
      expect(chain[chain.length - 1]).toBe(`flex-cone-key.${i}.conductor.colCommon`);
    });
  });

  test("the fader wiper reads from the GP26 bump to the T2 post", () => {
    const chain = chainOf("W");
    expect(chain[0]).toBe(`${SEAT}.conductor.bumpGP26`);
    expect(chain.slice(-3)).toEqual(["conductor.faderW", "conductor.faderWBase", "conductor.t2post"]);
  });

  test("each hookup entry reads the pin the seat lands its net on", () => {
    const ports = built.part.features.filter((f): f is PortFeature => f.kind === "port");
    for (const h of (design.chase.hookup ?? []) as readonly HookupDecl[]) {
      const net = ports.find((p) => p.id === h.port)!.net;
      const tap = ports.find((p) => p.net === net && p.tap !== undefined)!.tap!;
      expect([h.mcu, h.pin], h.port).toEqual([tap.mcu, tap.pin]);
    }
  });

  test("parity goldens hold off the pinned epoch", { timeout: 540_000 }, async () => {
    const saved = process.env["SOURCE_DATE_EPOCH"];
    process.env["SOURCE_DATE_EPOCH"] = "1000000000";
    try {
      const out = await runParity({ reference: REF }, ROOT);
      expect(out.files.map((f) => [f.file, f.status])).toEqual([
        ["build.json", "equal"], ["report.json", "equal"], ["edit.json", "equal"], ["artifacts.json", "equal"], ["expected/query-solve.json", "equal"],
      ]);
      expect(out.ok).toBe(true);
    } finally {
      if (saved === undefined) delete process.env["SOURCE_DATE_EPOCH"]; else process.env["SOURCE_DATE_EPOCH"] = saved;
    }
  });
});
