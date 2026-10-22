// Text rows of the query commands (R1-score-04): arch.find, catalog.find
// and catalog.pins print one line per hit, so a maker reading the terminal
// sees what --json carries: the id, its kind, why it matched and its
// numbers, each with its qualifier. A number read from a row takes the
// qualifier of the row's tier (TIER_QUALIFIER); a resistance arch.find
// computed at load says computed and names the tier of the row it read.

import { TIER_QUALIFIER, type CanonHit, type CatalogHit, type CommandOutput, type Tier } from "@hackbuild/spec";
import { archScored } from "../commands/arch.find.js";
import { wordHits, words } from "../commands/canon-hits.js";
import { fmtIn } from "./fmt.js";

const q = (tier: Tier): string => TIER_QUALIFIER[tier];

const ohm = (v: number | readonly [number, number]): string => (typeof v === "number" ? fmtIn("ohm", v) : `${fmtIn("ohm", v[0])} to ${fmtIn("ohm", v[1])}`);

const xyz = (v: readonly number[]): string => v.map((n) => fmtIn("mm", n)).join(" x ");

/** Why an archetype hit matched the behaviour: each query word and the fields it starts a word of. */
function archWhy(h: CanonHit, behaviour: string): string {
  const hits = wordHits(archScored(h), words(behaviour));
  const label = { id: "id", family: "family", text: "senses or emits" } as const;
  return hits.length === 0 ? "runs first, no word hit" : hits.map((x) => `${x.word} in ${x.fields.map((f) => label[f]).join(" and ")}`).join(", ");
}

export function archFindLines(res: CommandOutput<"arch.find">, behaviour: string): string[] {
  return res.hits.map((h) => {
    const channels = h.channels === undefined ? [] : [`channels ${h.channels === null ? "set by params (unknown)" : `${h.channels} (count)`}`];
    const r = (h.resistances ?? []).map((x) => `${x.id} ${ohm(x.ohm)} ohm (computed, ${x.material} row tier ${x.tier})`);
    return [
      `hit  ${h.id}  archetype ${h.family}  ${h.status ?? "unknown"}`,
      `why ${archWhy(h, behaviour)}`,
      ...channels,
      ...(r.length === 0 ? [] : [`resistances ${r.join(", ")}`]),
      ...(h.reference === undefined || h.reference.length === 0 ? [] : [`reference ${h.reference.join(", ")}`]),
    ].join("  ");
  });
}

export function catalogFindLines(res: CommandOutput<"catalog.find">, query: string): string[] {
  const ws = query.toLowerCase().split(/[\s,]+/).filter((w) => w !== "");
  return res.hits.map((h: CatalogHit) => [
    `hit  ${h.id}  part  ${h.name}`,
    `why ${ws.length === 0 ? "every row" : `${ws.join(", ")} in id or name`}`,
    `tier ${h.tier}`,
    ...(h.envelope === undefined ? ["envelope unknown"] : [`envelope ${xyz(h.envelope)} mm (${q(h.tier)})`]),
    `source ${h.source}`,
  ].join("  "));
}

export function catalogPinsLines(res: CommandOutput<"catalog.pins">, part: string): string[] {
  const m = res.mcu;
  const pull = m === null ? "" : m.pullup.kind === "range" ? `${fmtIn("ohm", m.pullup.minOhm)} to ${fmtIn("ohm", m.pullup.maxOhm)} ohm` : `${fmtIn("ohm", m.pullup.typOhm)} ohm typical`;
  return [
    `part  ${part}  ${res.pins.length} pins (count)  tier ${res.tier}`,
    ...(m === null ? [] : [`mcu  ${m.id}  vdd ${fmtIn("V", m.vddV)} V  vil max ${fmtIn("V", m.vilMaxV)} V  vih min ${fmtIn("V", m.vihMinV)} V  pullup ${pull} (${q(m.tier)})  source ${m.source}`]),
    ...res.pins.map((p) => [
      `pin  ${p.n}  ${p.name}  ${p.role}`,
      ...(p.strapping === true ? ["strapping"] : []),
      ...(p.bootActivity === undefined ? [] : [`boot ${p.bootActivity}`]),
      ...(p.at === undefined ? [] : [`at ${p.at.map((n) => fmtIn("mm", n)).join(", ")} mm (${q(res.tier)})`]),
    ].join("  ")),
    ...Object.entries(res.provenance).map(([field, p]) => `source  ${field}  ${p.tier}  ${p.source}`),
  ];
}
