// The print card of reference/keys/access-switch/README.md
// (R1-flagship-access-switch-09), in the shape of the flex-pair card
// (reference/keys/flex-pair/test/card.ts, whose override reader and
// marker splice it reuses). It is written from the build, the 3MF bytes
// the writer makes in process and the chase, so a geometry change that
// leaves the README behind fails test/reference.test.ts. A person never
// edits text between the markers. The export command on the card is the
// owner's: the export gate is person-only and an agent never runs it.
//
// The spring and cap steps port the PIP print card assembly steps 2 and 3
// (originals/pip/files/print-card.txt lines 36 to 37) and the RECORD 5.2 lesson
// that a snap-through arch loose in its slot flattens (pip.md 5.2,
// "Limits and lessons"); lineage row pip.print-card/haft-9-access-switch-card.

import type { Chase, Metric, PartDraft } from "@hackbuild/spec";
import { grams, PRESS_METRIC } from "../claim";
import { overrideLines } from "../../flex-pair/test/card";

export { between, splice } from "../../flex-pair/test/card";

export const CARD_START = "<!-- generated: print card; rewrite with HBF_ACCEPT=1 npx vitest run reference/keys/access-switch -->";
export const CARD_END = "<!-- end generated: print card -->";

/** The repo path of the design and the stem of its export file. */
const REF = "reference/keys/access-switch";
const STEM = "access-switch";

/** Each jack lug the switch wires, its socket feature and what the plug contact is. */
const LUGS = [
  { lug: "T", socket: "conductor.socketT", plug: "tip" },
  { lug: "S", socket: "conductor.socketS", plug: "sleeve" },
] as const;

export interface CardInput {
  readonly chase: Chase;
  readonly preset: string;
  readonly draft: PartDraft;
  readonly metrics: readonly Metric[];
  readonly buildHash: string;
  readonly artifactHash: string;
  readonly bytes: number;
  /** sha256 of the file bytes, hex. */
  readonly fileSha256: string;
  readonly sourceDateEpoch: number;
  /** Parsed Metadata/project_settings.config of the export. */
  readonly settings: Readonly<Record<string, unknown>>;
  /** Metadata/model_settings.config of the export. */
  readonly modelSettings: string;
  readonly profilePreset: { readonly id: string; readonly layer: number; readonly firstLayer: number };
}

const fmt = (v: number): string => Number(v.toFixed(3)).toString();
const list = (v: unknown, i: number): string => (Array.isArray(v) ? String(v[i] ?? "") : "");

function num(metrics: readonly Metric[], id: string): number {
  const v = metrics.find((m) => m.id === id)?.value;
  if (typeof v !== "number") throw new Error(`print card: no numeric metric ${id}`);
  return v;
}

/**
 * The objects the writer put on the plate, one row per object and slot,
 * each part named by its body id (the writer prefixes the slot label).
 */
export function plateRows(xml: string, labels: ReadonlyMap<number, string>): string[] {
  const meta = (s: string, key: string): string => new RegExp(`<metadata key="${key}" value="([^"]*)"/>`).exec(s)?.[1] ?? "";
  return [...xml.matchAll(/<object id="\d+">([\s\S]*?)<\/object>/g)].flatMap((o) => {
    const name = meta(o[1]!.replace(/<part [\s\S]*?<\/part>/g, ""), "name");
    const bySlot = new Map<number, string[]>();
    for (const p of o[1]!.matchAll(/<part [^>]*>([\s\S]*?)<\/part>/g)) {
      const slot = Number(meta(p[1]!, "extruder"));
      const label = labels.get(slot);
      const part = meta(p[1]!, "name");
      bySlot.set(slot, [...(bySlot.get(slot) ?? []), label !== undefined && part.startsWith(`${label} `) ? part.slice(label.length + 1) : part]);
    }
    return [...bySlot].sort((a, b) => a[0] - b[0]).map(([slot, parts]) => `| ${name} | ${slot} | ${parts.join(", ")} |`);
  });
}

export function printCard(c: CardInput): string {
  const slots = [...c.chase.materials].sort((a, b) => a.slot - b.slot);
  const m = c.metrics;
  const peak = num(m, PRESS_METRIC);
  const target = num(m, "claim.press.targetN");
  const lo = num(m, "claim.press.lo");
  const hi = num(m, "claim.press.hi");
  const g = (n: number): string => grams(n).toFixed(0);
  const file = `out/${STEM}-${c.preset}.3mf`;
  const overrides = overrideLines(c.modelSettings);
  const brim = c.settings["brim_type"];
  const wiring = LUGS.map((l) => {
    const f = c.draft.features.find((x) => x.id === l.socket);
    const net = f?.kind === "conductor" ? f.net : "unknown";
    return `| ${l.lug} | ${l.plug} | ${net} | ${l.socket} |`;
  });
  return [
    CARD_START,
    "",
    `- design: ${c.chase.meta.id}, preset ${c.preset}, machine ${c.chase.meta.machines.join(", ")}`,
    `- file: ${file}, ${c.bytes} bytes, sha256 ${c.fileSha256} (computed from the writer bytes in process; no export was run)`,
    `- artifact hash (hbf): ${c.artifactHash}`,
    `- write it, a person at the export gate: \`SOURCE_DATE_EPOCH=${c.sourceDateEpoch} npx --no-install hbf export.run ${REF} --kind 3mf --preset ${c.preset} --out ${REF}/${file}\` (the epoch is pinned; unset, it follows the HEAD commit time and the bytes move)`,
    `- build: ${c.buildHash}`,
    `- slicer: ${String(c.settings["printer_settings_id"] ?? "unknown")}, process ${String(c.settings["print_settings_id"] ?? "unknown")}`,
    `- plate: ${String(c.settings["curr_bed_type"] ?? "not written; the slicer opens on its default plate")}`,
    `- layer grid: ${c.profilePreset.id}, first layer ${fmt(c.profilePreset.firstLayer)} mm, then ${fmt(c.profilePreset.layer)} mm (profile)`,
    ...(overrides.length === 0 ? [] : [`- per-object settings in the file (M05-T20): ${overrides.join("; ")}; the Flash Studio CLI applies these keys from model_settings.config (computed, M05-T20 headless probes), the GUI is not run, so confirm each in the slicer object list before slicing`]),
    `- brim: ${brim === undefined ? "the file sets none, and the bundled process fills auto_brim, which the virtual slice laid in the cap's TPU 95A around body and paddle (computed, see Virtual slice); turn the brim off before slicing" : String(brim)}`,
    `- press: target ${fmt(target)} N (${g(target)} g), band ${fmt(lo)} to ${fmt(hi)} N (${g(lo)} to ${g(hi)} g, inferred), drawn peak ${fmt(peak)} N (${g(peak)} g, computed at drawn geometry); unproven until a person enters a thickness ladder coupon reading`,
    `- R.closed: ${num(m, "R.closed").toFixed(0)} ohm pressed, T to S (computed, tier inferred); the legs in their sockets add a contact resistance (unknown); the input threshold of the device you plug into is unknown, so read one device before you trust the switch closes for it`,
    "",
    "| slot | material | role | label | slicer type | slicer filament | colour |",
    "|---|---|---|---|---|---|---|",
    ...slots.map((s, i) => `| ${s.slot} | ${s.material} | ${s.role} | ${s.label ?? ""} | ${list(c.settings["filament_type"], i)} | ${list(c.settings["filament_settings_id"], i)} | ${list(c.settings["filament_colour"], i)} |`),
    "",
    "| object on the plate | slot | parts |",
    "|---|---|---|",
    ...plateRows(c.modelSettings, new Map(slots.map((s) => [s.slot, s.label ?? ""] as const))),
    "",
    "| jack lug | plug contact | net | socket |",
    "|---|---|---|---|",
    ...wiring,
    "",
    "Assembly:",
    "",
    "1. let the plate cool and peel the body, the paddle, the spring with its grey tip, and the cap; they print apart on one plate.",
    "2. drop the spring into its slot standing on edge, grey conductive tip down toward the two floor pads. the groove in each end block drops over the rib on the slot floor; wiggle it until it seats, it should not need pushing. upside down it will not click. loose in the slot the arch flattens and does not snap.",
    "3. drop the cap into its well, flange down, onto the spring stem.",
    `4. drop the jack in from the top, bushing out through the hole in the ${fmt(num(m, "jack.wall"))} mm wall, the T and S legs into the two cPLA sockets, and run the nut on from outside. whether the bushing thread clears that wall is unknown.`,
    "5. set the paddle on, plate up, skirt down into the rim bore; it rests on the cap.",
    "6. plug a mono 3.5 mm cable from the jack to the device's switch input and press the paddle.",
    "",
    "Use policy: USE.md at the repository root (plan v9 section 5); the file is not written yet.",
    "",
    CARD_END,
  ].join("\n");
}
