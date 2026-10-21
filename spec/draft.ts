// spec/draft.ts
/**
 * Status: draft until the release 1 exit. MILESTONES.md 1.5, D-179.
 * Release 1 item R1-engine-24 is the first that runs this file (hbf draft,
 * the DRAFT page and its exports); R1-engine-25 (hbf adopt) reads it back.
 */
// Drafts (plan v9 section 3.1). A draft is one offline page made in one
// turn: any route the kernel offers, one inline widget, checks shown as
// warnings, and every export marked DRAFT so a draft never passes for an
// adopted design. The marks live here once: the pipeline writes them into
// the page's exports, the ui names the downloads with them, core refuses
// export.run on a draft, and adopt lifts the sources from the page block.

/** File name prefix of every export a draft page writes. */
export const DRAFT_PREFIX = "DRAFT_";

/** The 3MF model metadata name a draft export carries, with the value DRAFT_META_VALUE. */
export const DRAFT_META_KEY = "hbf:draft";
export const DRAFT_META_VALUE = "1";
/** Namespace the hbf metadata prefix is declared with on the model element; an identifier, never fetched. */
export const DRAFT_META_NS = "https://tools.hack.build/3mf/2026/draft";

/** The print card line a draft export carries, first in the card. */
export const DRAFT_CARD_LINE = "DRAFT: not adopted. checks ran as warnings only. run hbf adopt before you print it.";

/** The waiver reason a draft gives a failing check, so it shows as a warning (D-173 waiver shape). */
export const DRAFT_WAIVER = "draft: checks show as warnings until hbf adopt runs them as blocking";

/** The script type of the block that carries a draft's sources in its page. */
export const DRAFT_BLOCK_TYPE = "application/hbf-draft+json";

/** The file in a draft directory that holds the block; its presence marks the directory as a draft. */
export const DRAFT_BLOCK_FILE = "draft.json";

/** Where hbf draft writes, under the git top of the working directory. */
export const DRAFTS_DIR = ".hbf/drafts";

/** The sources a draft page embeds, enough for hbf adopt to lift the design from the page alone. */
export interface DraftBlock {
  /** What the draft is for, as the person or model gave it. */
  readonly goal: string;
  /** The bench or design it started from, as chase.scaffold names it; absent for none. */
  readonly from?: string;
  /** chase.ts source. */
  readonly chase: string;
  /** build.ts source. */
  readonly build: string;
  /** Other files of the build closure inside the draft, by path; empty for a one-file build. */
  readonly files: Readonly<Record<string, string>>;
  /** widget.ts source, the one inline widget; null when the draft has none. */
  readonly widget: string | null;
  /** The param values the page opens with. */
  readonly state: Readonly<Record<string, unknown>>;
  /** @hackbuild/kernel package version the draft was baked against. */
  readonly kernelVersion: string;
  /** defHash of the chase and its build closure at bake time. */
  readonly defHash: string;
}

/** A draft export's file name: DRAFT_ before the name, once. */
export const draftName = (name: string): string => (name.startsWith(DRAFT_PREFIX) ? name : `${DRAFT_PREFIX}${name}`);
