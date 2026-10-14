// CHK-BRD-04 kernel (M08-T04 step 5, board-pcb.md "Boot-safety rules"): for
// every net that touches a pin of a catalog part with an MCU row, read that
// row's strapping and boot-activity fields and fail when
//  - a strapping pin sits at the wrong level at reset: pulled the wrong way
//    by a declared resistor or tied to the wrong rail, or left to a default
//    that is not the level SPI boot needs (GPIO2 floats on the ESP32-C3), or
//  - a pin reaches a load-switch gate, directly or through series
//    resistors, while it drives at boot (U0TXD prints the ROM log at every
//    reset, so no pulldown saves the load), or while the gate has no
//    declared pulldown (the pin floats through reset).
// A pull is a two-pad resistor (designator R) between the net and a rail;
// a rail is GND (low) or a supply net by name; a gate is a pad named G.

import type { BoardRecord, Finding, PartRow } from "@hackbuild/spec";
import { mcuRowOf, type BootActivity, type Catalog, type Strap } from "@hackbuild/catalog";
import { boolFinding } from "../defs/common.js";

const LOW = /^(?:GND|VSS|AGND|PGND)$/i;
const HIGH = /^(?:\+?\d+V\d*|\d+V\d+|3V3|VCC|VDD|VBUS|VIN|VSYS)(?:_\w+)?$/i;
const railOf = (net: string): "high" | "low" | null => (LOW.test(net) ? "low" : HIGH.test(net) ? "high" : null);

const isResistor = (ref: string): boolean => /^R\d+$/.test(ref);

interface Graph {
  readonly padsOf: ReadonlyMap<string, readonly { readonly pin: string; readonly net: string }[]>;
  readonly onNet: ReadonlyMap<string, readonly { readonly ref: string; readonly pin: string }[]>;
}

function graphOf(record: BoardRecord): Graph {
  const padsOf = new Map<string, { pin: string; net: string }[]>();
  const onNet = new Map<string, { ref: string; pin: string }[]>();
  for (const p of record.pads) {
    padsOf.set(p.ref, [...(padsOf.get(p.ref) ?? []), { pin: p.pin, net: p.net }]);
    if (p.net !== "") onNet.set(p.net, [...(onNet.get(p.net) ?? []), { ref: p.ref, pin: p.pin }]);
  }
  return { padsOf, onNet };
}

/** Nets reachable from net through two-pad resistors, net first. */
function seriesNets(g: Graph, net: string): readonly { net: string; via: readonly string[] }[] {
  const seen = new Map<string, readonly string[]>([[net, []]]);
  const queue = [net];
  while (queue.length > 0) {
    const n = queue.shift()!;
    for (const m of g.onNet.get(n) ?? []) {
      const pads = g.padsOf.get(m.ref) ?? [];
      if (!isResistor(m.ref) || pads.length !== 2) continue;
      const other = pads.find((p) => p.net !== n)?.net;
      if (other === undefined || other === "" || railOf(other) !== null || seen.has(other)) continue;
      seen.set(other, [...seen.get(n)!, m.ref]);
      queue.push(other);
    }
  }
  return [...seen].map(([n, via]) => ({ net: n, via }));
}

/** Rails a net is pulled or tied to: its own name, or a resistor to a rail. */
function pullsOf(g: Graph, net: string): readonly { level: "high" | "low"; by: string }[] {
  const own = railOf(net);
  if (own !== null) return [{ level: own, by: `net ${net}` }];
  const out: { level: "high" | "low"; by: string }[] = [];
  for (const m of g.onNet.get(net) ?? []) {
    const pads = g.padsOf.get(m.ref) ?? [];
    if (!isResistor(m.ref) || pads.length !== 2) continue;
    const other = pads.find((p) => p.net !== net)?.net;
    const r = other === undefined ? null : railOf(other);
    if (r !== null) out.push({ level: r, by: `${m.ref} to ${other}` });
  }
  return out;
}

const defaultLevel = (d: string): "high" | "low" | null => (/pull-up/.test(d) ? "high" : /pull-down/.test(d) ? "low" : null);

/** Findings for every net touching an MCU pin, or only the named net. */
export function strapFindings(record: BoardRecord, catalog: Catalog, only?: string): readonly Finding[] {
  const g = graphOf(record);
  const out: Finding[] = [];
  for (const part of record.parts) {
    const row: PartRow | undefined = catalog.rows.get(part.catalogId);
    const chip = row === undefined ? undefined : mcuRowOf(catalog, row);
    if (chip === undefined) continue;
    const straps = (chip.fields["strapping"]?.value ?? []) as readonly Strap[];
    const boots = (chip.fields["bootActivity"]?.value ?? []) as readonly BootActivity[];
    const tierNote = (k: string): string => {
      const f = chip.fields[k];
      return f === undefined ? `no ${k} field on ${chip.id}` : `${k} of ${chip.id} ${f.provenance.tier} (${f.provenance.source.split(" (")[0]})`;
    };
    for (const pad of g.padsOf.get(part.ref) ?? []) {
      if (pad.net === "" || (only !== undefined && pad.net !== only)) continue;
      const at = { level: "net" as const, part: part.ref, net: pad.net };
      const strap = straps.find((s) => s.pin === pad.pin);
      if (strap !== undefined && strap.spiBoot !== "any") {
        const pulls = pullsOf(g, pad.net);
        const wrong = pulls.filter((p) => p.level !== strap.spiBoot);
        const right = pulls.filter((p) => p.level === strap.spiBoot);
        const dflt = defaultLevel(strap.default);
        const ok = wrong.length === 0 && (right.length > 0 || dflt === strap.spiBoot);
        out.push(boolFinding(at, ok, ok
          ? `${part.ref}.${pad.pin} strapping pin sits ${strap.spiBoot} at reset (${right.map((p) => p.by).join(", ") || `default ${strap.default}`}); ${tierNote("strapping")}`
          : `${part.ref}.${pad.pin} strapping pin must sit ${strap.spiBoot} at reset for spi boot; ${wrong.length > 0 ? `held ${wrong[0]!.level} by ${wrong.map((p) => p.by).join(", ")}` : `nothing holds it, default ${strap.default}`}; add a pull ${strap.spiBoot === "high" ? "up to 3V3" : "down to GND"}. ${tierNote("strapping")}`,
          { pin: pad.pin, net: pad.net }));
      }
      const gates = seriesNets(g, pad.net).flatMap(({ net, via }) => (g.onNet.get(net) ?? []).filter((m) => m.pin === "G").map((m) => ({ net, via, gate: `${m.ref}.G` })));
      if (gates.length === 0) continue;
      const boot = boots.find((b) => b.pin === pad.pin);
      for (const gt of gates) {
        const down = pullsOf(g, gt.net).filter((p) => p.level === "low");
        const drives = boot?.drives === true;
        const ok = !drives && down.length > 0;
        const path = gt.via.length === 0 ? "directly" : `through ${gt.via.join(", ")}`;
        out.push(boolFinding(at, ok, ok
          ? `${part.ref}.${pad.pin} reaches load gate ${gt.gate} ${path} with pulldown ${down.map((p) => p.by).join(", ")}; the pin is quiet at boot`
          : drives
            ? `${part.ref}.${pad.pin} reaches load gate ${gt.gate} ${path} and drives at boot: ${boot!.activity}; move the gate to a pin without boot activity. ${tierNote("bootActivity")}`
            : `${part.ref}.${pad.pin} reaches load gate ${gt.gate} ${path} with no pulldown on ${gt.net}; the load can fire while the pin floats through reset. add a resistor from ${gt.net} to GND`,
          { pin: pad.pin, net: pad.net, gate: gt.gate }));
      }
    }
  }
  return out;
}
