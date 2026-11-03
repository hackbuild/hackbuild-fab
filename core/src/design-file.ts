// The one place a design directory is recognised and read. A directory holds
// its design as chase.ts (defineChase) or design.ts (design, plan v11.2
// section 4.1); callers ask here instead of naming chase.ts, so a third
// source form is one edit. Both are read as data (D-178).

import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { DESIGN_FILES, readChaseSource, type DesignFile } from "@hackbuild/chase";
import type { ChaseSourceRead } from "@hackbuild/spec";

/** The design file in dir, chase.ts before design.ts; undefined when the directory holds neither. */
export function designFileIn(dir: string): DesignFile | undefined {
  return DESIGN_FILES.find((f) => {
    const abs = path.join(dir, f);
    return existsSync(abs) && statSync(abs).isFile();
  });
}

/** True when dir holds a design file. */
export const hasDesignFile = (dir: string): boolean => designFileIn(dir) !== undefined;

/** The design file a path names: the file itself, or the directory holding one. */
export function designFileOfPath(abs: string): { readonly dir: string; readonly file: DesignFile } | undefined {
  if (existsSync(abs) && statSync(abs).isDirectory()) {
    const file = designFileIn(abs);
    return file === undefined ? undefined : { dir: abs, file };
  }
  const base = path.basename(abs) as DesignFile;
  return DESIGN_FILES.includes(base) && existsSync(abs) ? { dir: path.dirname(abs), file: base } : undefined;
}

/** A design directory read as data: the file name, its text and the reader's result. */
export function readDesignDir(dir: string, label: string): ChaseSourceRead & { readonly file: DesignFile; readonly text: string } {
  const file = designFileIn(dir) ?? "chase.ts";
  const text = readFileSync(path.join(dir, file), "utf8");
  return { ...readChaseSource(text, `${label}/${file}`), file, text };
}
