// catalog.pins and catalog.find over loaded rows (M08-T04 step 4, M08-T14
// step 1). A module row lists its pins from its own pins field, takes its
// pad centres from its pads field, and takes strapping and boot activity
// from the MCU row its `mcu` names; nothing is copied between rows.

import type { CatalogHit, McuPinSpec, PartRow, PinDef, Provenance, Tier } from "@hackbuild/spec";
import { TIERS } from "@hackbuild/spec";
import type { Catalog } from "./load.js";
import { unknownPart } from "./lookup.js";

export interface Strap { readonly pin: string; readonly default: string; readonly spiBoot: "high" | "low" | "any"; readonly note?: string }
export interface BootActivity { readonly pin: string; readonly activity: string; readonly drives: boolean }

export interface PinsOut {
  readonly pins: readonly PinDef[];
  readonly mcu: McuPinSpec | null;
  /** The row tier: weakest geometry or connectivity field. */
  readonly tier: Tier;
  /** Provenance of every field the answer read, by field name; strapping and bootActivity name the MCU row they came from. */
  readonly provenance: Readonly<Record<string, Provenance>>;
}

/** The MCU row a module or chip row points at through its threshold id, or undefined. */
export function mcuRowOf(catalog: Catalog, row: PartRow): PartRow | undefined {
  if (row.mcu === undefined) return undefined;
  if (row.kind === "mcu") return row;
  return [...catalog.rows.values()].find((r) => r.kind === "mcu" && r.mcu?.id === row.mcu?.id);
}

export function catalogPins(catalog: Catalog, id: string): PinsOut {
  const row = catalog.rows.get(id);
  if (row === undefined) throw unknownPart(id, [...catalog.rows.keys()]);
  const provenance: Record<string, Provenance> = {};
  const chip = mcuRowOf(catalog, row);
  const straps = (chip?.fields["strapping"]?.value ?? []) as readonly Strap[];
  const boots = (chip?.fields["bootActivity"]?.value ?? []) as readonly BootActivity[];
  for (const k of ["strapping", "bootActivity"] as const) {
    const f = chip?.fields[k];
    if (f !== undefined) provenance[k] = f.provenance;
  }
  const pinsField = row.fields["pins"];
  const padsField = row.fields["pads"];
  if (pinsField !== undefined) provenance["pins"] = pinsField.provenance;
  if (padsField !== undefined) provenance["pads"] = padsField.provenance;
  const pads = (padsField?.value ?? []) as readonly { pad: string; x: number; y: number }[];
  const pins = ((pinsField?.value ?? []) as readonly PinDef[]).map((p): PinDef => {
    const pad = pads.find((q) => q.pad === String(p.n));
    const strap = straps.find((s) => s.pin === p.name);
    const boot = boots.find((b) => b.pin === p.name);
    return {
      ...p,
      ...(strap === undefined ? {} : { strapping: true }),
      ...(boot === undefined ? {} : { bootActivity: boot.activity }),
      ...(pad === undefined ? {} : { at: [pad.x, pad.y, 0] as const }),
    };
  });
  return { pins, mcu: row.mcu ?? null, tier: row.tier, provenance };
}

/**
 * Rows whose id or name holds every word of the query, best tier first, then
 * id. A tier filter keeps rows at that tier or better.
 */
export function catalogFind(catalog: Catalog, query: string, tier?: Tier): readonly CatalogHit[] {
  const words = query.toLowerCase().split(/[\s,]+/).filter((w) => w !== "");
  const floor = tier === undefined ? TIERS.length - 1 : TIERS.indexOf(tier);
  return [...catalog.rows.values()]
    .filter((r) => {
      const hay = `${r.id} ${r.name}`.toLowerCase();
      return words.every((w) => hay.includes(w)) && TIERS.indexOf(r.tier) <= floor;
    })
    .sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((r): CatalogHit => {
      const body = r.fields["dims.body"]?.value;
      const env = Array.isArray(body) && body.length === 3 ? { envelope: body as unknown as readonly [number, number, number] } : {};
      return { id: r.id, name: r.name, tier: r.tier, ...env, source: r.provenance.source };
    });
}
