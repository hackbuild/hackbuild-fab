// The shape a build function's draft must have before assembly: plain
// data with finite numbers and the PartDraft fields assembleBuild reads.
// Core's sandbox checks a reply with it, and a baked bench checks the draft
// its page build returned (D-264).

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v) && !ArrayBuffer.isView(v);

/** The first value that is not plain data or not a finite number, as a JSON pointer. */
export function plainProblem(v: unknown, at = "", depth = 0): { readonly path: string; readonly got: string } | undefined {
  if (depth > 64) return { path: at, got: "nesting deeper than 64" };
  if (v === null || v === undefined || typeof v === "string" || typeof v === "boolean") return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? undefined : { path: at || "/", got: String(v) };
  if (ArrayBuffer.isView(v)) return undefined;
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i += 1) {
      const p = plainProblem(v[i], `${at}/${i}`, depth + 1);
      if (p !== undefined) return p;
    }
    return undefined;
  }
  if (typeof v === "object") {
    const proto = Object.getPrototypeOf(v) as unknown;
    if (proto !== Object.prototype && proto !== null) return { path: at || "/", got: "a class instance" };
    for (const [k, x] of Object.entries(v)) {
      const p = plainProblem(x, `${at}/${k.replace(/~/g, "~0").replace(/\//g, "~1")}`, depth + 1);
      if (p !== undefined) return p;
    }
    return undefined;
  }
  return { path: at || "/", got: typeof v };
}

/** The fields the kernel stages read from a PartDraft. */
export function draftProblem(d: unknown): { readonly path: string; readonly got: string; readonly expected: string } | undefined {
  if (!isRecord(d)) return { path: "/", got: typeof d, expected: "one PartDraft object" };
  for (const k of ["id", "name", "process", "machine"]) {
    if (typeof d[k] !== "string") return { path: `/${k}`, got: typeof d[k], expected: "a string" };
  }
  if (!isRecord(d["frame"])) return { path: "/frame", got: typeof d["frame"], expected: "a frame object" };
  const bodies = d["bodies"];
  if (!Array.isArray(bodies)) return { path: "/bodies", got: typeof bodies, expected: "an array of bodies" };
  for (const [i, b] of bodies.entries()) {
    if (!isRecord(b)) return { path: `/bodies/${i}`, got: typeof b, expected: "a body object" };
    if (typeof b["id"] !== "string" || typeof b["role"] !== "string") return { path: `/bodies/${i}/id`, got: String(b["id"]), expected: "id and role strings" };
    if (!Number.isInteger(b["slot"])) return { path: `/bodies/${i}/slot`, got: String(b["slot"]), expected: "an integer slot" };
    if (!isRecord(b["base"]) || typeof b["base"]["route"] !== "string") return { path: `/bodies/${i}/base`, got: typeof b["base"], expected: "a ShapeDecl with a route" };
  }
  const features = d["features"];
  if (!Array.isArray(features)) return { path: "/features", got: typeof features, expected: "an array of features" };
  for (const [i, f] of features.entries()) {
    if (!isRecord(f) || typeof f["id"] !== "string" || typeof f["kind"] !== "string") return { path: `/features/${i}`, got: typeof f, expected: "a feature with id and kind" };
  }
  for (const k of ["faces", "metrics", "warnings", "assertions"]) {
    if (d[k] !== undefined && !Array.isArray(d[k])) return { path: `/${k}`, got: typeof d[k], expected: "an array" };
  }
  const p = plainProblem(d);
  return p === undefined ? undefined : { ...p, expected: "plain data with finite numbers" };
}

