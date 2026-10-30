// A loaded design merges onto a fresh blank at every depth, ported from PIP
// bench/part2.js loadDesign (lines 188 to 197): a key the blank lacks is a
// retired setting and is dropped, an array replaces the blank's array
// whole, a plain object recurses. TOGGLE part4.js lines 62 to 68 merges one
// level only; PIP's recursion is the one kept.

export interface MergeResult<S> {
  readonly state: S;
  /** JSON pointers of the dropped keys, in document order. */
  readonly dropped: readonly string[];
}

type Obj = Record<string, unknown>;

function isPlain(v: unknown): v is Obj {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function ptr(base: string, key: string): string {
  return `${base}/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`;
}

function into(a: Obj, b: Obj, at: string, dropped: string[]): void {
  for (const k of Object.keys(b)) {
    if (!Object.prototype.hasOwnProperty.call(a, k)) {
      dropped.push(ptr(at, k));
      continue;
    }
    const bv = b[k], av = a[k];
    if (isPlain(bv) && isPlain(av)) into(av, bv, ptr(at, k), dropped);
    else a[k] = bv;
  }
}

/** Merge `loaded` onto `fresh` in place and return it with the dropped keys. */
export function mergeOntoBlank<S>(fresh: S, loaded: unknown): MergeResult<S> {
  const dropped: string[] = [];
  if (isPlain(fresh) && isPlain(loaded)) into(fresh, loaded, "", dropped);
  return { state: fresh, dropped };
}

/** JSON pointer of the first number that is NaN or infinite, or undefined. */
export function firstNonFinite(v: unknown, at = ""): string | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? undefined : at || "/";
  if (Array.isArray(v)) {
    for (let k = 0; k < v.length; k++) {
      const hit = firstNonFinite(v[k], `${at}/${k}`);
      if (hit !== undefined) return hit;
    }
    return undefined;
  }
  if (isPlain(v)) {
    for (const k of Object.keys(v)) {
      const hit = firstNonFinite(v[k], ptr(at, k));
      if (hit !== undefined) return hit;
    }
  }
  return undefined;
}
