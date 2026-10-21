// motion.run (M07-T14 step 2, D-106 group prove): run a Motion IR program
// by id on its machine and return MotionRunResult, or plan a planner
// program's path and return PlanResult. The programs are motion's own
// (packages/motion/src/programs); this file only names each family, the
// pinned legacy source its machine is read from, and the args it takes.
//
// A program decides nothing by frames: the commit is evaluated at the op
// (CHK-MOT-06). --expect declares the latched set the last commit must
// leave (D-074): pass and exit 0 when the measured set equals it, fail and
// exit 1 when not. Without --expect nothing is compared and the verdict is
// skip, exit 0, as sim.run reports a scene that declares nothing.
// --audit runs CHK-MOT-04, -05 and -06 on the program's machine through
// the registry, with the handle the motion kernel opens on it (latchHandle);
// a machine with no latch reports each one not run.

import { readFileSync } from "node:fs";
import path from "node:path";
import type {
  Assembly, CheckResult, KernelId, MotionHandle, MotionProgram, MotionRunResult, Part, PathPoint, PlanResult, ProfileLookup, ProjectGraph, Stage, Verdict,
} from "@hackbuild/spec";
import { createProfileLookup } from "@hackbuild/profile";
import { CHECK_MODULES, kernelsAt, registerChecks, runRegistry } from "@hackbuild/checks";
import {
  OGEE_PROGRAMS, SLUG_MACHINE, STIPPLE_PROGRAMS, detentPlan, detentPlanner, detentSquare, expectSet, latchHandle, latchMachine, latchedCells,
  ogeeKinematics, ogeeProgram, ogeeSequence, readScadParams, readStippleParams, runProgram, servoPreset, slugDrive, slugVendProgram, stippleKinematics,
  stipplePattern, stippleProgram, washerPlan, washerPlanner, washerRig, washerSquare, type MachineModel, type OgeeProgramId, type StippleProgramId,
} from "@hackbuild/motion";
import { cmdError, didYouMean } from "../errors.js";
import { fullProfile } from "../load-build.js";
import { countsOf, findingsOf, worst, type CommandOut } from "../result.js";
import type { CoreCtx } from "../ctx.js";
import { loadWorkspace } from "./build.js";

/** The pinned sources each machine is read from, workspace relative; stipple is line 117 of stipple-r17b.html, stored (lineage stipple.kin/r17b). */
const SOURCES = {
  ogee16: "designs/ogee16/legacy/source/params.scad",
  stipple: "packages/motion/inputs/stipple/stipple-r17b-DATA.txt",
  slug: "designs/slug/legacy/slug.scad",
} as const;

/** A run: the machine, the program and the patterns --expect may name. */
interface ProgramRun {
  readonly kind: "program";
  readonly machine: MachineModel<unknown>;
  readonly program: MotionProgram;
  /** Named latched sets, as "i,j" cells; empty for a machine with no latch. */
  readonly patterns: Readonly<Record<string, readonly string[]>>;
  /** The motion checks' handle on this machine; undefined when it has no latch. */
  readonly handle?: MotionHandle;
  readonly source: string;
}

interface PlanRun {
  readonly kind: "plan";
  readonly plan: PlanResult;
  readonly source: string;
}

interface Family {
  /** Program ids of the family and the args each reads. */
  readonly programs: Readonly<Record<string, readonly string[]>>;
  /** Args a program cannot run without. */
  readonly required?: Readonly<Record<string, readonly string[]>>;
  open(id: string, args: Readonly<Record<string, number>>, ctx: Opened): ProgramRun | PlanRun;
}

interface Opened {
  readonly profile: ProfileLookup;
  text(rel: string): string;
}

const cellsOf = (m: readonly (readonly number[])[]): string[] => m.flatMap((r, i) => r.flatMap((v, j) => (v === 1 ? [`${i},${j}`] : [])));

const FAMILIES: readonly Family[] = [
  {
    programs: OGEE_PROGRAMS,
    open: (id, args, o) => {
      const K = ogeeKinematics(readScadParams(o.text(SOURCES.ogee16)));
      const seq = (n: "checker" | "diagonal" | "all"): string[] => ogeeSequence(K, n).map(([i, j]) => `${i},${j}`);
      return {
        kind: "program", machine: latchMachine(K.latch) as MachineModel<unknown>, program: ogeeProgram(K, id as OgeeProgramId, args),
        patterns: { checker: seq("checker"), diagonal: seq("diagonal"), all: seq("all") },
        handle: latchHandle(K.latch, ogeeProgram(K, "ogee.checker")), source: SOURCES.ogee16,
      };
    },
  },
  {
    programs: STIPPLE_PROGRAMS,
    open: (id, args, o) => {
      const K = stippleKinematics(readStippleParams(o.text(SOURCES.stipple)), "stipple-r17b");
      return {
        kind: "program", machine: latchMachine(K.latch) as MachineModel<unknown>, program: stippleProgram(K, id as StippleProgramId, args),
        patterns: { checker: cellsOf(stipplePattern(K, "checker")), rowWrite: cellsOf(stipplePattern(K, "rowWrite")), all: cellsOf(stipplePattern(K, "all")) },
        handle: latchHandle(K.latch, stippleProgram(K, "stipple.checker")), source: SOURCES.stipple,
      };
    },
  },
  {
    programs: { "slug.vend": ["k"] },
    required: { "slug.vend": ["k"] },
    open: (_id, args, o) => ({
      kind: "program", machine: SLUG_MACHINE as MachineModel<unknown>, program: slugVendProgram(slugDrive(o.profile, o.text(SOURCES.slug)), args["k"]!),
      patterns: {}, source: SOURCES.slug,
    }),
  },
  {
    programs: { "detent.square": ["side", "sample"], "washer.square": ["side"] },
    required: { "detent.square": ["side", "sample"], "washer.square": ["side"] },
    open: (id, args, o) => {
      if (id === "detent.square") {
        const path: PathPoint[] = detentSquare(args["side"]!, args["sample"]!);
        return { kind: "plan", plan: detentPlanner(detentPlan(o.profile)).plan(path), source: "profile detent.* (fab-knowledge:originals/detent/files/beam/detent-plot.html planSpeeds)" };
      }
      const plan = washerPlan(o.profile);
      const p = washerPlanner({ rig: washerRig(o.profile), plan, servo: servoPreset(o.profile), calib: null }).plan(washerSquare(args["side"]!, plan.dense));
      return { kind: "plan", plan: p, source: "profile washer.* and servo.micro9g.* (fab-knowledge:originals/washer/files/rig/laser-rig.html planChainPen)" };
    },
  },
];

/** Every program id motion.run takes. */
export const PROGRAM_IDS: readonly string[] = FAMILIES.flatMap((f) => Object.keys(f.programs));

export interface MotionRunInput {
  readonly program: string;
  readonly args?: Readonly<Record<string, number>>;
  readonly expect?: string;
  readonly audit?: boolean;
}

const ZERO = { pass: 0, warn: 0, fail: 0, skip: 0 } as const;

/** The declared set --expect names: a pattern of the program's machine, none, or cells "i,j" joined by spaces or semicolons. */
function declaredSet(expect: string, run: ProgramRun): string[] {
  const named = run.patterns[expect];
  if (named !== undefined) return [...named];
  if (expect === "none") return [];
  const cells = expect.split(/[\s;]+/).filter((c) => c !== "");
  const names = ["none", ...Object.keys(run.patterns)];
  if (names.length === 1) {
    throw cmdError({ code: "E_SCHEMA", path: "/expect", got: expect, expected: "absent", hint: `machine ${run.machine.machine} latches nothing; leave --expect out` });
  }
  cells.forEach((c, i) => {
    if (!/^\d+,\d+$/.test(c)) {
      throw cmdError({ code: "E_SCHEMA", path: `/expect/${i}`, got: c, expected: `${names.join(", ")} or cells i,j`, didYouMean: didYouMean(expect, names), hint: "name a pattern or list cells as i,j" });
    }
  });
  return cells;
}

/** CHK-MOT-04, -05 and -06 on one machine's handle; the targets are the machine's latch field, cell and project until M10 gives the machine a chase. */
async function auditChecks(ctx: CoreCtx, machine: string, handle: MotionHandle | undefined, profile: ProfileLookup): Promise<CheckResult[]> {
  const ws = await loadWorkspace(ctx.workspace);
  const defs = registerChecks({ seed: ws.checksSeed, filamentTemplate: ws.template }, CHECK_MODULES)
    .filter((d) => ["CHK-MOT-04", "CHK-MOT-05", "CHK-MOT-06"].includes(d.id));
  const assembly = { id: `${machine}.latch-field`, parts: [], instances: [], bought: [], joints: [], connections: [], assertions: [], metrics: [], warnings: [] } as unknown as Assembly;
  const part = { id: `${machine}.cell`, bodies: [], features: [], metrics: [], assertions: [{ type: "identity", mechanism: "displacement-coincidence-latch" }] } as unknown as Part;
  const report = await runRegistry(defs, {
    kernels: kernelsAt("M07") as ReadonlySet<KernelId>, produced: new Set(["assembly", "part", "project"]),
    targets: { assemblies: [assembly], parts: [part], project: {} as unknown as ProjectGraph },
    ctx: { profile, machine, whitelist: new Map(), ...(handle === undefined ? {} : { motion: handle }) },
  });
  return [...report.results];
}

export async function runMotionRun(i: MotionRunInput, ctx: CoreCtx): Promise<CommandOut<unknown>> {
  const family = FAMILIES.find((f) => f.programs[i.program] !== undefined);
  if (family === undefined) {
    throw cmdError({ code: "E_REF", path: "/program", got: i.program, didYouMean: didYouMean(i.program, PROGRAM_IDS), hint: `name a program: ${PROGRAM_IDS.join(", ")}` });
  }
  const reads = family.programs[i.program]!;
  const args = i.args ?? {};
  for (const k of Object.keys(args)) {
    if (!reads.includes(k)) {
      throw cmdError({ code: "E_SCHEMA", path: `/args/${k}`, got: k, expected: reads.length === 0 ? "no args" : reads.join(", "), didYouMean: didYouMean(k, reads), hint: `${i.program} reads ${reads.length === 0 ? "no args" : reads.map((r) => `--${r}`).join(", ")}` });
    }
  }
  for (const k of family.required?.[i.program] ?? []) {
    if (args[k] === undefined) throw cmdError({ code: "E_PARAM_MISSING", path: `/args/${k}`, expected: "a number", hint: `${i.program} needs --${k}` });
  }
  const profile = createProfileLookup(fullProfile());
  const run = family.open(i.program, args, { profile, text: (rel) => readFileSync(path.join(ctx.workspace, rel), "utf8") });
  if (run.kind === "plan") {
    if (i.expect !== undefined) throw cmdError({ code: "E_SCHEMA", path: "/expect", got: i.expect, expected: "absent", hint: "a planner program latches nothing; leave --expect out" });
    if (i.audit === true) throw cmdError({ code: "E_SCHEMA", path: "/audit", got: true, expected: "absent", hint: "a planner program has no latch to audit; leave --audit out" });
    const { space, points, durationS, binding } = run.plan;
    return { verdict: "skip", stage: "done", inputsHash: ctx.inputsHash, findings: [], counts: { ...ZERO, skip: 1 }, errors: [], artifacts: [], next: [], result: { space, points, durationS, binding, source: run.source } };
  }
  const out = runProgram(run.machine, run.program);
  const last = out.result.states.at(-1) ?? run.machine.view(run.machine.init());
  const latched = Object.keys(run.patterns).length > 0 ? latchedCells(last) : undefined;
  const expectation = i.expect === undefined ? undefined : expectSet(latched ?? [], declaredSet(i.expect, run));
  const checks = i.audit === true ? await auditChecks(ctx, run.machine.machine, run.handle, profile) : [];
  const result: MotionRunResult & Record<string, unknown> = {
    ...out.result, durationS: out.durationS, end: last, source: run.source,
    ...(latched === undefined ? {} : { latched }),
    ...(expectation === undefined ? {} : { expectation }),
  };
  const expectVerdict: Verdict | undefined = expectation === undefined ? undefined : expectation.pass ? "pass" : "fail";
  const checkVerdict: Verdict | undefined = checks.length === 0 ? undefined : worst(checks);
  const rank: Readonly<Record<Verdict, number>> = { fail: 3, warn: 2, pass: 1, skip: 0 };
  const verdict = [expectVerdict, checkVerdict].reduce<Verdict>((v, x) => (x !== undefined && rank[x] > rank[v] ? x : v), "skip");
  const counts = countsOf(checks);
  const stage: Stage = verdict === "fail" ? "check" : "done";
  return {
    verdict, stage, inputsHash: ctx.inputsHash, findings: findingsOf(checks),
    counts: expectVerdict === undefined ? (checks.length === 0 ? { ...ZERO, skip: 1 } : counts) : { ...counts, [expectVerdict]: counts[expectVerdict] + 1 },
    errors: [], artifacts: [], next: [], result,
  };
}
