// The publish form of a record copied from the owner's archive into this repo.
// Local absolute paths name folders a public reader cannot open and carry the
// local user name, so a published copy names them by archive prefix instead:
// fab-knowledge: and fab-work-directory: for the evidence archive, repo-relative
// paths for this repo, and the bare repository name for a sibling repository.
// Private chat links and their titles are dropped. The sample-set test compares
// a repo record with publishText(original), so the transform lives here once.

const HOME = ["", "Users", "obsidian", ""].join("/");
const PROJECTS = `${HOME}Projects/`;
const HACKBUILD = `${PROJECTS}hackbuild/`;

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** [pattern, replacement] in the order they apply; the first rows are the most specific. */
export const PATH_RULES = [
  [new RegExp(`${esc(HACKBUILD)}hackbuild-fab/`, "g"), ""],
  [new RegExp(`${esc(HACKBUILD)}hackbuild-fab\\b`, "g"), "hackbuild-fab"],
  [new RegExp(`${esc(HACKBUILD)}fab-knowledge/`, "g"), "fab-knowledge:"],
  [new RegExp(`${esc(HACKBUILD)}fab-knowledge\\b`, "g"), "fab-knowledge"],
  [new RegExp(`${esc(HACKBUILD)}fab-work-directory/`, "g"), "fab-work-directory:"],
  [new RegExp(`${esc(HACKBUILD)}(?=[A-Za-z0-9])`, "g"), ""],
  [new RegExp(`${esc(PROJECTS)}(?=[A-Za-z0-9])`, "g"), ""],
  [new RegExp(esc(HOME), "g"), "~/"],
];

/** A sentence naming a chat by title and private link, as the 2026-10-05 records wrote it. */
const CHAT_LINK = / Chat "[^"]*" \(https:\/\/claude\.ai\/chat\/[0-9a-f-]+\)\./g;

/** The archive prefix the published CLAUDE.md names for the originals root. */
export const ORIGINALS_PREFIX = "fab-knowledge:originals";

export function publishText(text) {
  let out = text.replace(CHAT_LINK, "");
  for (const [re, to] of PATH_RULES) out = out.replace(re, to);
  return out;
}
