// Types of rules.mjs, written by hand: the module is plain ESM outside the
// tsc build so the git hooks can run it before any build.

export interface VoiceHit {
  readonly path: string;
  readonly line: number;
  readonly col: number;
  readonly rule: string;
  readonly severity: "block" | "warn";
  readonly text: string;
}

export declare const MARKETING: readonly string[];
export declare const FILLER: readonly string[];
export declare const OPENERS: readonly string[];
export declare const BRAND_HEX: readonly string[];
export declare const JSON_MESSAGE_KEYS: readonly string[];
export declare const CHAR_RULES: readonly string[];
export declare const WORD_RULES: readonly string[];
export declare const ALLOWABLE_RULES: readonly string[];
export declare const KINDS: readonly string[];
/** Dash code points beyond U+2012 to U+2015 and U+2212. */
export declare const EXTRA_DASHES: readonly number[];
/** Emoji presentation code points outside the dingbat and pictograph blocks. */
export declare const EXTRA_EMOJI: readonly number[];

/** Fenced code blocks and inline code spans blanked, every offset kept. */
export declare function maskMarkdown(text: string): string;

/** Every hit of the rules in one text; kind is null for a file, or one of KINDS for stdin text. */
export declare function lintText(path: string, text: string, kind?: string | null): VoiceHit[];
