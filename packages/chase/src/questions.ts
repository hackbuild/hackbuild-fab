// The question audit of chase.validate (M10-T04 step 3, D-133). A
// question names what the chase leaves open and the value the build uses
// meanwhile; it never fails validation. Each question is typed data: a
// rule id, a JSON pointer into the chase that tells repeats of one rule
// apart, one line of text, and the default in force when one applies. The
// v3 shape (string arrays named errors, missing or questions, plan-deltas
// R76) is gone.
//
// The facts a rule reads beyond the chase come from the caller: the
// resistivity row in force per material from the profile, and the
// exporters whose ExporterDef.fabrication is true. This package reads no
// file and no registry of its own, so a bake runs the same audit.

import type { Chase, ValidateQuestion } from "@hackbuild/spec";

/**
 * Rule ids in table order (M10-T04 step 3). Q-OWNER-<D-id> is not here:
 * no chase field ties a param to a decision yet, so the audit cannot tell
 * which value an open owner decision sets.
 */
export const QUESTION_RULES = ["Q-STACK", "Q-MOTION", "Q-READ-MODEL", "Q-FAB-MACHINE", "Q-PRESETS", "Q-TIER"] as const;
export type QuestionRule = (typeof QUESTION_RULES)[number];

/** A profile resistivity row as the audit reads it. */
export interface RowInForce {
  readonly id: string;
  /** Provenance tier: measured, community, vendor, computed or inferred. */
  readonly tier: string;
  /** Ohm cm, as the profile row states it: one value or a range. */
  readonly ohmCm: number | readonly [number, number];
}

export interface QuestionFacts {
  /**
   * The resistivity row circuit.solve reads for each material id
   * (profile.resistivity(material, "along", "printed"), bulk when the
   * material has no along row); absent for a material with no printed row.
   */
  readonly resistivity?: Readonly<Record<string, RowInForce>>;
  /** Exporter ids whose ExporterDef.fabrication is true. */
  readonly fabricationExports?: readonly string[];
}

/** Material roles that carry current, so their resistivity row sets a verdict. */
const CONDUCTING: ReadonlySet<string> = new Set(["conductor", "flex-conductor"]);

type Rule = (chase: Chase, facts: QuestionFacts) => ValidateQuestion[];

const RULES: Readonly<Record<QuestionRule, Rule>> = {
  // D-063: a surface builds on a declared stack; without one the build has no layers to cut.
  "Q-STACK": (c) => (c.meta.kind === "surface" && c.stack === undefined
    ? [{ id: "Q-STACK", path: "/build", question: "which stack does this surface build on? declare stack with its layers" }]
    : []),
  "Q-MOTION": (c) => (c.meta.kind === "machine" && c.motion === undefined
    ? [{ id: "Q-MOTION", path: "/motion", question: "which motion program drives this machine? name a registered program in motion" }]
    : []),
  // D-078: a port is read through a model; the circuit kernel without hookup leaves every port unread.
  "Q-READ-MODEL": (c) => (c.meta.kernels.includes("circuit") && (c.hookup ?? []).length === 0
    ? [{ id: "Q-READ-MODEL", path: "/hookup", question: "how is each port read? add a hookup entry with a read model per port; circuit.solve reports the ports as unread" }]
    : []),
  "Q-FAB-MACHINE": (c, f) => {
    const fab = new Set(f.fabricationExports ?? []);
    const first = c.meta.machines[0];
    return c.exports.flatMap((e, i): ValidateQuestion[] => (fab.has(e.kind) && e.machine === undefined
      ? [{
        id: "Q-FAB-MACHINE", path: `/exports/${i}`,
        question: `which machine does the ${e.kind} export target? set machine on the export`,
        ...(c.meta.machines.length > 0 ? { options: c.meta.machines } : {}),
        ...(first === undefined ? {} : { defaultInForce: first }),
      }]
      : []));
  },
  // D-125: the welcome offers presets; with none it offers start blank only.
  "Q-PRESETS": (c) => ((c.presets ?? []).length === 0
    ? [{ id: "Q-PRESETS", path: "/presets", question: "which starting points does the welcome offer? declare presets", defaultInForce: "start blank only" }]
    : []),
  "Q-TIER": (c, f) => c.materials.flatMap((m, i): ValidateQuestion[] => {
    const row = f.resistivity?.[m.material];
    if (!CONDUCTING.has(m.role) || row === undefined || row.tier !== "inferred") return [];
    return [{
      id: "Q-TIER", path: `/materials/${i}`,
      question: `slot ${m.slot} ${m.material} reads resistivity row ${row.id}, tier inferred; measure a coupon to replace it`,
      defaultInForce: `${row.id}, ${typeof row.ohmCm === "number" ? row.ohmCm : `${row.ohmCm[0]} to ${row.ohmCm[1]}`} ohm cm inferred, CHK-NET-05 warns`,
    }];
  }),
};

/** Every question the chase leaves open, in QUESTION_RULES order, then by pointer order within a rule. */
export function chaseQuestions(chase: Chase, facts: QuestionFacts = {}): ValidateQuestion[] {
  return QUESTION_RULES.flatMap((id) => RULES[id](chase, facts));
}
