// The coupon card of reference/keys/access-switch/COUPON.md
// (R1-flagship-access-switch-11), in the shape of the switch's print card
// (../../test/card.ts, whose plate reader it reuses, and the flex-pair
// override reader and marker splice). It is written from the coupon
// build, the 3MF bytes the writer makes in process and the chase, so a
// coupon change that leaves COUPON.md behind fails test/reference.test.ts.
// A person never edits text between the markers. The export command on
// the card is the owner's: the export gate is person-only and an agent
// never runs it.

import type { Chase, Metric } from "@hackbuild/spec";
import { overrideLines } from "../../../flex-pair/test/card";
import { plateRows } from "../../test/card";

export { between, splice } from "../../../flex-pair/test/card";

export const COUPON_START = "<!-- generated: coupon card; rewrite with HBF_ACCEPT=1 npx vitest run reference/keys/access-switch/coupon -->";
export const COUPON_END = "<!-- end generated: coupon card -->";

/** The repo path of the coupon and the stem of its export file. */
const REF = "reference/keys/access-switch/coupon";
const STEM = "access-switch-coupon";
const KEY = "click-spring-key";
const RUNGS = [1, 2, 3] as const;

export interface CouponCardInput {
  readonly chase: Chase;
  readonly preset: string;
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
  if (typeof v !== "number") throw new Error(`coupon card: no numeric metric ${id}`);
  return v;
}

export function couponCard(c: CouponCardInput): string {
  const slots = [...c.chase.materials].sort((a, b) => a.slot - b.slot);
  const m = c.metrics;
  const file = `out/${STEM}-${c.preset}.3mf`;
  const overrides = overrideLines(c.modelSettings);
  const brim = c.settings["brim_type"];
  return [
    COUPON_START,
    "",
    `- design: ${c.chase.meta.id}, preset ${c.preset}, machine ${c.chase.meta.machines.join(", ")}`,
    `- file: ${file}, ${c.bytes} bytes, sha256 ${c.fileSha256} (computed from the writer bytes in process; no export was run)`,
    `- artifact hash (hbf): ${c.artifactHash}`,
    `- write it, a person at the export gate: \`SOURCE_DATE_EPOCH=${c.sourceDateEpoch} npx --no-install hbf export.run ${REF} --kind 3mf --preset ${c.preset} --out ${REF}/${file}\` (the epoch is pinned; unset, it follows the HEAD commit time and the bytes move)`,
    `- build: ${c.buildHash}`,
    `- slicer: ${String(c.settings["printer_settings_id"] ?? "unknown")}, process ${String(c.settings["print_settings_id"] ?? "unknown")} (vendor preset names)`,
    `- plate: ${String(c.settings["curr_bed_type"] ?? "not written; the slicer opens on its default plate")}`,
    `- layer grid: ${c.profilePreset.id}, first layer ${fmt(c.profilePreset.firstLayer)} mm, then ${fmt(c.profilePreset.layer)} mm (profile preset, vendor, a slicer save)`,
    ...(overrides.length === 0 ? [] : [`- per-object settings in the file (M05-T20): ${overrides.join("; ")}; the Flash Studio CLI applies these keys from model_settings.config (computed, M05-T20 headless probes), the GUI is not run, so confirm each in the slicer object list before slicing`]),
    `- brim: ${brim === undefined ? "the file sets none, and the bundled process fills auto_brim, which the switch's virtual slice laid in TPU 95A around its PETG bodies (computed, switch README, Virtual slice); turn the brim off before slicing" : String(brim)}`,
    `- cup: ${fmt(num(m, "cup.massG"))} g solid (computed, PETG density inferred; infill lowers it, unknown), it rests on the cap and the cap on the spring, and neither is subtracted from a rung`,
    "",
    "| rung | bars | beam mm (drawn) | peak N (computed) | peak g (computed) | coins to snap (computed) |",
    "|---|---|---|---|---|---|",
    ...RUNGS.map((r) => `| ${r} | ${r} | ${num(m, `rung.${r}.t`).toFixed(2)} | ${num(m, `${KEY}.${r - 1}.spring.peakN`).toFixed(3)} | ${num(m, `rung.${r}.peakG`).toFixed(0)} | ${num(m, `rung.${r}.coins`).toFixed(1)} |`),
    "",
    "| slot | material | role | label | slicer type | slicer filament | colour |",
    "|---|---|---|---|---|---|---|",
    ...slots.map((s, i) => `| ${s.slot} | ${s.material} | ${s.role} | ${s.label ?? ""} | ${list(c.settings["filament_type"], i)} | ${list(c.settings["filament_settings_id"], i)} | ${list(c.settings["filament_colour"], i)} |`),
    "",
    "| object on the plate | slot | parts |",
    "|---|---|---|",
    ...plateRows(c.modelSettings, new Map(slots.map((s) => [s.slot, s.label ?? ""] as const))),
    "",
    COUPON_END,
  ].join("\n");
}
