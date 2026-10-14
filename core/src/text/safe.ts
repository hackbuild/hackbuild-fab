// Terminal-safe text. A string that came from a design (a chase id, a
// constraint, a warning, a path) can carry ESC, CR or a bidi override and
// redraw what a person reads, the export gate prompt above all (D-109).
// Every string a renderer interpolates passes through oneLine: C0 controls
// (line feed and tab included), DEL, C1 controls and the bidi controls are
// written as \uXXXX, so one printed line stays one line and shows what the
// string holds.

const UNSAFE = /[\u0000-\u001f\u007f-\u009f؜‎‏‪-‮⁦-⁩]/g;

/** The string with every control and bidi control written as \uXXXX. */
export function oneLine(s: string): string {
  return s.replace(UNSAFE, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
}

/** A page of lines: each line through oneLine, the line feeds between them kept. */
export function safeLines(s: string): string {
  return s.split("\n").map(oneLine).join("\n");
}
