// The one kinematics module (D-139): every machine whose parts move is
// placed from this folder, by build, viewer, sim sweeps and programs alike.
// sim never imports it (tools/tiers.json); core binds it to sim's place(pose)
// functions. tools/tiers.mjs fails a trig placement formula of these
// machines written anywhere else.
//
// One registry entry per machine (RegistryKind motion). The entry declares
// the machine's state and the lineage row its formulas port; the functions
// are the exports below.

import type { MotionDef, RegistryEntry, SchemaLike, SchemaResult } from "@hackbuild/spec";

export * from "./mat4.js";
export * from "./davit.js";
export * from "./derrick.js";
export * from "./ogee.js";
export * from "./stipple.js";
export * from "./detent.js";
export * from "./washer.js";

export const KINEMATICS_VERSION = "1.0.0";

/** A kinematics registry entry: the state a machine is posed by, in mm and degrees or radians as the machine names. */
export interface KinematicsDef<S> extends MotionDef<S> {
  /** Machine id, the design slug. */
  readonly machine: string;
  /** Lineage row (lineage.json) of the canonical source the formulas port. */
  readonly lineage: string;
  /** The state variables, in the order the source names them. */
  readonly state: readonly string[];
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function schema<S>(vendor: string, check: (v: Record<string, unknown>) => string | null): SchemaLike<unknown, S> {
  return {
    "~standard": {
      version: 1, vendor,
      validate: (value: unknown): SchemaResult<S> => {
        if (!isRecord(value)) return { issues: [{ message: "expected a state object" }] };
        const why = check(value);
        return why === null ? { value: value as S } : { issues: [{ message: why }] };
      },
    },
  };
}

const numList = (v: unknown, n?: number): boolean => Array.isArray(v) && v.every(isNum) && (n === undefined || v.length === n);

export const OGEE16_KINEMATICS: KinematicsDef<{ zR: number[]; zC: number[]; lp: number }> = {
  id: "kinematics/ogee16", version: KINEMATICS_VERSION, space: "mm", machine: "ogee16", lineage: "ogee16.kin/r16p",
  state: ["zR", "zC", "lp"],
  params: schema("hackbuild-motion", (v) => (numList(v.zR) && numList(v.zC) && isNum(v.lp) ? null : "zR and zC are lists of bar rises in mm, lp the plate slide in mm")),
};

export const DAVIT_KINEMATICS: KinematicsDef<{ model: string; pipe: string; pose: Record<"R" | "L", Record<string, number>> }> = {
  id: "kinematics/davit", version: KINEMATICS_VERSION, space: "mm", machine: "davit", lineage: "davit.collide/r4-page",
  state: ["pitch", "roll", "elbow", "wrist", "grip"],
  params: schema("hackbuild-motion", (v) => {
    const pose = v.pose;
    const arm = (p: unknown): boolean => isRecord(p) && ["pitch", "roll", "elbow", "wrist", "grip"].every((k) => isNum(p[k]));
    return (v.model === "std" || v.model === "mini") && ["1in", "125in", "15in"].includes(String(v.pipe)) && isRecord(pose) && arm(pose.R) && arm(pose.L)
      ? null : "model std or mini, pipe 1in, 125in or 15in, and pose.R and pose.L with pitch, roll, elbow, wrist and grip in degrees";
  }),
};

export const DERRICK_KINEMATICS: KinematicsDef<{ q: number[] }> = {
  id: "kinematics/derrick", version: KINEMATICS_VERSION, space: "mm", machine: "derrick", lineage: "derrick.build/r3",
  state: ["q1", "q2", "q3", "q4", "q5"],
  params: schema("hackbuild-motion", (v) => (numList(v.q, 5) ? null : "q is the five joint angles in radians, J1 to J5")),
};

export const STIPPLE_KINEMATICS: KinematicsDef<{ zR: number[]; zC: number[]; lp: number }> = {
  id: "kinematics/stipple", version: KINEMATICS_VERSION, space: "mm", machine: "stipple", lineage: "stipple.bench/r17b",
  state: ["zR", "zC", "lp"],
  params: schema("hackbuild-motion", (v) => (numList(v.zR) && numList(v.zC) && isNum(v.lp) ? null : "zR and zC are lists of comb rises in mm, lp the plate slide in mm")),
};

const DEFS = [OGEE16_KINEMATICS, DAVIT_KINEMATICS, DERRICK_KINEMATICS, STIPPLE_KINEMATICS] as const;

/** The motion registry entries of the kinematics module, one per machine. */
export const KINEMATICS_ENTRIES: readonly RegistryEntry<"motion">[] = DEFS.map((def) => ({
  kind: "motion" as const, id: def.id, version: def.version, def: def as MotionDef,
  manifest: { name: "@hackbuild/motion", registry: "motion" as const, version: "0.0.0", provides: DEFS.map((d) => d.id), license: "MIT" },
}));
