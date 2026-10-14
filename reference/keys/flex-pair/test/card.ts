// The generated blocks of reference/keys/flex-pair/README.md (M-S-T09): the
// print card for the owner and the machine-checked list. Both are written
// from the build, the 3MF bytes and the chase, so a geometry change that
// leaves the README behind fails reference.test.ts. A person never edits
// text between the markers.

import type { Chase, CheckResult, ConductorFeature, PartDraft } from "@hackbuild/spec";

export const CARD_START = "<!-- generated: print card; rewrite with HBF_ACCEPT=1 npx vitest run reference/keys/flex-pair -->";
export const CARD_END = "<!-- end generated: print card -->";
export const CHECKS_START = "<!-- generated: checks; rewrite with HBF_ACCEPT=1 npx vitest run reference/keys/flex-pair -->";
export const CHECKS_END = "<!-- end generated: checks -->";

export interface CardInput {
  readonly chase: Chase;
  readonly preset: string;
  readonly draft: PartDraft;
  readonly values: { readonly W: number; readonly H: number };
  readonly buildHash: string;
  readonly artifactHash: string;
  readonly bytes: number;
  /** sha256 of the file bytes, hex. */
  readonly fileSha256: string;
  readonly sourceDateEpoch: number;
  /** Parsed Metadata/project_settings.config of the export. */
  readonly settings: Readonly<Record<string, unknown>>;
  /** Zip entry names of the export. */
  readonly entries: readonly string[];
  /** Metadata/model_settings.config of the export, for the per-object settings line (M05-T20). */
  readonly modelSettings: string;
  readonly profilePreset: { readonly id: string; readonly layer: number; readonly firstLayer: number };
}

const fmt = (v: number): string => Number(v.toFixed(3)).toString();
const list = (v: unknown, i: number): string => (Array.isArray(v) ? String(v[i] ?? "") : "");

/**
 * The per-object and per-part settings the writer put in model_settings
 * (M05-T20 overrides), as "object <name> <key> <value>" and "<key> <value>
 * on <parts>". The headless CLI applies both keys from that file; whether
 * the GUI does is open until the owner opens the export in it, so the card
 * asks the person to confirm each one in the slicer.
 */
function overrideLines(xml: string): string[] {
  const kv = (s: string): [string, string][] => [...s.matchAll(/<metadata key="([^"]+)" value="([^"]*)"\/>/g)].map((m) => [m[1]!, m[2]!]);
  const plain = new Set(["name", "extruder", "matrix", "source_file", "source_object_id", "source_volume_id", "source_offset_x", "source_offset_y", "source_offset_z"]);
  const out: string[] = [];
  for (const o of xml.matchAll(/<object id="\d+">([\s\S]*?)<\/object>/g)) {
    const own = kv(o[1]!.replace(/<part [\s\S]*?<\/part>/g, ""));
    const name = own.find(([k]) => k === "name")?.[1] ?? "";
    for (const [k, v] of own) if (!plain.has(k)) out.push(`object ${name} ${k} ${v}`);
    const byKey = new Map<string, string[]>();
    for (const p of o[1]!.matchAll(/<part [^>]*>([\s\S]*?)<\/part>/g)) {
      const meta = kv(p[1]!);
      const part = meta.find(([k]) => k === "name")?.[1] ?? "";
      for (const [k, v] of meta) if (!plain.has(k)) byKey.set(`${k} ${v}`, [...(byKey.get(`${k} ${v}`) ?? []), part]);
    }
    for (const [setting, parts] of byKey) out.push(`${setting} on ${parts.join(", ")}`);
  }
  return out;
}

/** Where each net's centreline conductor meets the pad edge, mm (computed). */
function edgeLeads(draft: PartDraft, W: number, H: number): Map<string, readonly [number, number]> {
  const out = new Map<string, readonly [number, number]>();
  const onEdge = (p: readonly [number, number]): boolean => Math.abs(Math.abs(p[0]) - W / 2) < 1e-6 || Math.abs(Math.abs(p[1]) - H / 2) < 1e-6;
  for (const f of draft.features) {
    if (f.kind !== "conductor") continue;
    const c = f as ConductorFeature;
    if (!("centreline" in c.region)) continue;
    for (const p of c.region.centreline) if (onEdge(p) && !out.has(c.net)) out.set(c.net, p);
  }
  return out;
}

export function printCard(c: CardInput): string {
  const slots = [...c.chase.materials].sort((a, b) => a.slot - b.slot);
  const leads = edgeLeads(c.draft, c.values.W, c.values.H);
  const band = c.draft.features.find((f) => f.kind === "conductor" && f.id === "conductor.gnd") as ConductorFeature | undefined;
  const bandLo = band !== undefined && "face" in band.region ? band.region.face.origin[2] : undefined;
  const bandText = band === undefined || bandLo === undefined ? "unknown" : `${fmt(bandLo)} to ${fmt(bandLo + band.t)} mm (computed)`;
  const ports = c.draft.features.filter((f) => f.kind === "port");
  const flexKeys = c.draft.bodies.filter((b) => b.role === "flex").length;
  const hookup = c.chase.hookup ?? [];
  const overrides = overrideLines(c.modelSettings);
  const pause = c.entries.some((e) => /custom_gcode_per_layer/.test(e)) ? "present in the 3mf; read it before printing" : "none (the 3mf carries no custom_gcode_per_layer entry)";
  const wiring = ports.map((p) => {
    const port = p as Extract<typeof p, { kind: "port" }>;
    const row = hookup.find((h) => h.port === port.id);
    const lead = leads.get(port.net);
    const at = lead === undefined ? "lead position unknown" : `trace meets the pad edge at x ${fmt(lead[0])}, y ${fmt(lead[1])} mm (computed)`;
    const pin = row === undefined ? (port.type === "gnd" ? "pico GND" : "no hookup row") : `${row.mcu} ${row.pin}`;
    const r = row?.read as { readonly model?: string; readonly drive?: string; readonly driveUs?: number; readonly waitUs?: number; readonly waitSource?: string } | undefined;
    const read = r === undefined ? "" : `, ${r.model ?? ""}, drive ${r.drive ?? ""} ${r.driveUs ?? ""} us, wait ${r.waitUs ?? ""} us (${r.waitSource === "default" ? "inferred default" : r.waitSource ?? "unknown"})`;
    return `| ${port.net} | ${port.id} | ${pin}${read} | ${at} |`;
  });
  return [
    CARD_START,
    "",
    `- design: ${c.chase.meta.id}, preset ${c.preset}, machine ${c.chase.meta.machines.join(", ")}`,
    `- file: out/flex-pair-${c.preset}.3mf, ${c.bytes} bytes, sha256 ${c.fileSha256}`,
    `- artifact hash (hbf): ${c.artifactHash}`,
    `- write it: \`SOURCE_DATE_EPOCH=${c.sourceDateEpoch} npx --no-install hbf export.run reference/keys/flex-pair --kind 3mf --preset ${c.preset} --out reference/keys/flex-pair/out/flex-pair-${c.preset}.3mf\` (the epoch is pinned; unset, it follows the HEAD commit time and the bytes move)`,
    `- build: ${c.buildHash}`,
    `- slicer: ${String(c.settings["printer_settings_id"] ?? "unknown")}, process ${String(c.settings["print_settings_id"] ?? "unknown")}`,
    `- plate: ${String(c.settings["curr_bed_type"] ?? "not written; the slicer opens on its default plate")}`,
    `- layer grid: ${c.profilePreset.id}, first layer ${fmt(c.profilePreset.firstLayer)} mm, then ${fmt(c.profilePreset.layer)} mm (profile)`,
    `- pause: ${pause}`,
    ...(overrides.length === 0 ? [] : [`- per-object settings in the file (M05-T20): ${overrides.join("; ")}; the Flash Studio CLI applies both keys from model_settings.config (computed, M05-T20 headless probes), the GUI is not run, so confirm each in the slicer object list before slicing`]),
    `- trace band: ${bandText}; leads are cPLA at the pad edge in that band`,
    ...(flexKeys > 0 ? ["- after peeling: work each key a few times to free the cone and its cap (PIP assembly step 1, bench/part2.js line 148)"] : []),
    "",
    "| slot | material | role | label | slicer type | slicer filament | colour |",
    "|---|---|---|---|---|---|---|",
    ...slots.map((s, i) => `| ${s.slot} | ${s.material} | ${s.role} | ${s.label ?? ""} | ${list(c.settings["filament_type"], i)} | ${list(c.settings["filament_settings_id"], i)} | ${list(c.settings["filament_colour"], i)} |`),
    "",
    "| net | port | probe pin | lead |",
    "|---|---|---|---|",
    ...wiring,
    "",
    CARD_END,
  ].join("\n");
}

interface TargetJson { readonly level?: string; readonly feature?: string; readonly artifact?: string; readonly net?: string; readonly part?: string; readonly a?: TargetJson; readonly b?: TargetJson }

/** A check target as written in report.json, named for a reader. */
function targetLabel(target: unknown): string {
  const t = target as TargetJson;
  if (t.level === "pair" && t.a !== undefined && t.b !== undefined) return `${targetLabel(t.a)} and ${targetLabel(t.b)}`;
  if (t.level === "net") return `net ${t.net ?? ""}`;
  return t.feature ?? t.artifact ?? (t.part === undefined ? "" : `part ${t.part}`);
}

export function checksBlock(results: readonly CheckResult[]): string {
  const rows = [...results].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map((r) => {
    return `| ${r.id} | ${r.verdict} | ${targetLabel(r.target)} |`;
  });
  return [
    CHECKS_START,
    "",
    "Defaults, from `expected/report.json` (computed by the checks, not measured):",
    "",
    "| check | verdict | target |",
    "|---|---|---|",
    ...rows,
    "",
    CHECKS_END,
  ].join("\n");
}

/** Replace the text between start and end, markers included. */
export function splice(text: string, start: string, end: string, block: string): string {
  const a = text.indexOf(start);
  const b = text.indexOf(end);
  if (a < 0 || b < a) throw new Error(`readme: markers ${start} and ${end} missing or out of order`);
  return text.slice(0, a) + block + text.slice(b + end.length);
}

export function between(text: string, start: string, end: string): string | undefined {
  const a = text.indexOf(start);
  const b = text.indexOf(end);
  return a < 0 || b < a ? undefined : text.slice(a, b + end.length);
}
