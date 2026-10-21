// The DRAFT marks a draft page puts on what it shows and writes (plan v9
// 3.1, R1-engine-24): a failing check reads as a warning carrying the
// draft waiver, the 3MF model carries the metadata hbf:draft = 1, and the
// print card opens with the draft line. File names take DRAFT_ in the page
// (packages/ui pageBench and createPageBuild below). The constants live in
// spec/draft.ts once.

import {
  DRAFT_CARD_LINE, DRAFT_META_KEY, DRAFT_META_NS, DRAFT_META_VALUE, DRAFT_WAIVER, type CheckResult,
} from "@hackbuild/spec";

/** The model part of every 3MF the writer emits, for both targets. */
export const MODEL_ENTRY = "3D/3dmodel.model";

const META_LINE = ` <metadata name="${DRAFT_META_KEY}">${DRAFT_META_VALUE}</metadata>\n`;
const PREFIX = DRAFT_META_KEY.slice(0, DRAFT_META_KEY.indexOf(":"));

/**
 * The model xml with the draft metadata: the hbf prefix declared on the
 * model element (3MF Core 2.1 qualifies a namespaced metadata name by a
 * declared prefix; no requiredextensions entry, so a consumer may ignore
 * it) and the metadata line before resources, after the writer's own.
 */
export function draftModel(xml: string): string {
  const open = xml.indexOf("<model ");
  const res = xml.indexOf(" <resources>");
  if (open < 0 || res < 0) throw new Error(`draft mark: ${MODEL_ENTRY} has no model element or resources; the writer changed its layout`);
  if (xml.includes(META_LINE)) return xml;
  const withNs = `${xml.slice(0, open)}<model xmlns:${PREFIX}="${DRAFT_META_NS}" ${xml.slice(open + "<model ".length)}`;
  const at = withNs.indexOf(" <resources>");
  return `${withNs.slice(0, at)}${META_LINE}${withNs.slice(at)}`;
}

/** The package entries with the draft model; every other entry as written. */
export function draftEntries(entries: Readonly<Record<string, string>>): Record<string, string> {
  const model = entries[MODEL_ENTRY];
  if (model === undefined) throw new Error(`draft mark: the package has no ${MODEL_ENTRY}`);
  return { ...entries, [MODEL_ENTRY]: draftModel(model) };
}

/** The print card with the draft line first. */
export const draftCard = (card: string): string => (card.startsWith(DRAFT_CARD_LINE) ? card : `${DRAFT_CARD_LINE}\n${card}`);

/** Results with every unwaived fail turned to a warning that carries the draft waiver; measured, legal and fix stay as computed (D-173). */
export function draftResults(results: readonly CheckResult[]): CheckResult[] {
  return results.map((r) => (r.verdict === "fail" && r.waived === undefined ? { ...r, verdict: "warn", waived: { reason: DRAFT_WAIVER } } : r));
}
