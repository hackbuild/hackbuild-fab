// M04-T07 (D-075, CHECKS.md section 11): a metric with no gate and no
// informational label is a defect. DETENT rev C printed its overhang area
// as information only and let an inverted teardrop through
// (sources/benches/benches-machines.md line 175). spec/part-ir.ts carries
// the two labels in one field, `gate: CheckId | "informational"`, so
// exactly one is present whenever the field is; the rule here fails a
// metric whose field is absent or names no registered check.
//
// The metrics come from metric-gates/builds.json, which
// core/test/metric-record.test.ts records from a fresh build of every
// reference and design (this package cannot import the build, tools/tiers.json)
// and keeps equal to one. The set of builds is read from the tree here, so
// a design added without a new recording fails. HBF_METRIC_RECORD names
// another record to judge, for example metric-gates/ungated.json,
// whose metric has neither label and makes this file exit 1.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DEFAULT_TEMPLATE } from "@hackbuild/3mf";
import { CHECK_MODULES, registerChecks } from "../src/index";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const FIXTURES = path.join(ROOT, "packages", "checks", "test", "metric-gates");

interface RecordedMetric {
  readonly id: string;
  readonly gate?: unknown;
}
interface RecordedBuild {
  readonly build: string;
  readonly part: string;
  readonly metrics: readonly RecordedMetric[];
}
interface MetricRecord {
  readonly note: string;
  readonly builds: readonly RecordedBuild[];
}

const readRecord = (file: string): MetricRecord => JSON.parse(readFileSync(file, "utf8")) as MetricRecord;
const RECORD_FILE = process.env["HBF_METRIC_RECORD"] === undefined
  ? path.join(FIXTURES, "builds.json")
  : path.resolve(ROOT, process.env["HBF_METRIC_RECORD"]);
const record = readRecord(RECORD_FILE);

const seed = JSON.parse(readFileSync(new URL("../seed/checks.seed.json", import.meta.url), "utf8")) as unknown;
const defs = registerChecks({ seed, filamentTemplate: DEFAULT_TEMPLATE }, CHECK_MODULES);
const byId = new Map(defs.map((d) => [d.id as string, d]));

/** One line per metric the D-075 rule refuses, naming the build, the part and the metric. */
function gateProblems(rec: MetricRecord): string[] {
  const out: string[] = [];
  for (const b of rec.builds) {
    const seen = new Set<string>();
    for (const m of b.metrics) {
      const at = `${b.build} part ${b.part} metric ${m.id}`;
      if (seen.has(m.id)) out.push(`${at}: id repeats in the part`);
      seen.add(m.id);
      if (m.gate === undefined) { out.push(`${at}: neither a gate nor informational (D-075)`); continue; }
      if (m.gate === "informational") continue;
      if (typeof m.gate !== "string") { out.push(`${at}: gate ${JSON.stringify(m.gate)} is neither a check id nor informational`); continue; }
      const def = byId.get(m.gate);
      if (def === undefined) out.push(`${at}: gate ${m.gate} is not a registered check`);
      else if (def.status === "retired") out.push(`${at}: gate ${m.gate} is retired`);
    }
  }
  return out;
}

/**
 * The M04-T07 step 4 audit: why each informational family carries no
 * gate. A new informational metric matching no row fails, and a row that
 * matches no recorded metric fails, so the table holds only live reasons.
 */
const INFORMATIONAL: readonly { readonly pattern: RegExp; readonly why: string }[] = [
  { pattern: /^derived\./, why: "Author.derive values; core/src/sandbox.ts refuses any gate but informational on them" },
  { pattern: /^fits\.model$/, why: "names the fit model the rows are banded by; CHK-FIT-01 reads it beside each drawn row" },
  { pattern: /^fits\.\d+\.(hole|shaft|class)$/, why: "inputs and class word of a FITS row; CHK-FIT-01 reads them with fits.<nn>.drawn, which carries the row's gate (hole is also bounded there; relabel is an owner question in the card)" },
  { pattern: /^keys\.\d+\.printedTravel$/, why: "the sliced view of keys.<n>.travel, which CHK-KEY-01 gates; mid-layer slicing is inferred" },
  { pattern: /^keys\.\d+\.feel$/, why: "a feel word from wall over cone height (PIP bench/part3.js line 429); no failure on record sets a bound" },
  { pattern: /^keys\.\d+\.(capBridge|split|columnToWall|proud)$/, why: "flex-pair fits readouts; build.ts warns FIT past its bound and no registered check reads them yet (owner question in the card)" },
  { pattern: /^route\.iters$/, why: "PIP's iteration count, kept for parity (router.js line 259); CHK-NET-12 reads route.conflicts and route.unrouted, never iters (M05-T08)" },
  { pattern: /^route\.net\.[^.]+\.length$/, why: "routed length per net, a route readout; the read path prices the built conductor, not this figure" },
  { pattern: /^stack\.(l1|l2)\.(bottom|top)$|^stack\.(pads\.bottom|floor|iso|overL2|traceWidth)$/, why: "the buried stack z as built from the profile stack rows (PROFILE.md 6.1); the rows carry the provenance and no failure on record sets a bound on the built z" },
  { pattern: /^print\.smallestFeature$/, why: "least of trace width, split and cone wall; build.ts warns FIT, no registered check reads it yet (owner question in the card)" },
  { pattern: /^spring\.riseMm$/, why: "arch rise h = Q t, a geometry readout; the spring verdict is CHK-KEY-04 on the sim curve" },
  { pattern: /^sprue\.(thickness|layers|inlayDepth)$/, why: "layer snap readouts of the SPRUE blank set by the layer grid; no failure on record sets a bound" },
  { pattern: /^board\.(nets|pads|holes|vias|npth|tightest)$/, why: "counts read off the BoardRecord and the generator DRC's tightest clearance (packages/board boardMetrics); the CHK-BRD checks measure the record and the reparsed fab zip themselves" },
  { pattern: /^[a-z0-9-]+\.\d+\.host\.top$/, why: "the host top an archetype was placed under, its need snapped up a layer or the top asked for; a placement readout, no failure on record sets a bound" },
  { pattern: /^[a-z0-9-]+\.\d+\.[a-z]+\.fits\.[a-z0-9-]+$/, why: "an archetype's fits row as its original prints it (PIP model.js, BLOCKS parts.js, THINPOT); a row out of its bound warns FIT at build and no registered check reads the rows yet" },
  { pattern: /^[a-z0-9-]+\.\d+\.[a-z]+\.say\.[A-Za-z0-9-]+$/, why: "the readout lines the original bench prints (GIB part2.js, THINPOT); resistance and current lines carry the material tier, no failure on record sets a bound" },
  { pattern: /^[a-z0-9-]+\.\d+\.[a-z]+\.R\.[A-Za-z]+$/, why: "a resistance estimate on the material's tier, printed where the original prints it (PIP model.js lines 469 to 478, BLOCKS parts.js, TANG 04_design.js and 05_design.js); no failure on record sets a bound" },
  { pattern: /^[a-z0-9-]+\.\d+\.key\.(height|rsb|wallH|feel|fingers)$/, why: "PIP key geometry readouts: cone height, base radius and wall, the feel word, the comb's finger count; CHK-KEY-01 gates the key's travel" },
  { pattern: /^[a-z0-9-]+\.\d+\.seat\.(boardZ|boardTop|cableEdge)$/, why: "the seated board's z and the host cable edge, placement readouts; no failure on record sets a bound" },
  { pattern: /^[a-z0-9-]+\.\d+\.stud\.(postTop|standard|tap\.[A-Za-z0-9-]+)$/, why: "BLOCKS stud readouts: post top, brick standard (D-087) and tap heights as the original declares them; the socket's press fit is CHK-FIT-07" },
  { pattern: /^[a-z0-9-]+\.\d+\.wire\.(len|chord|R)$/, why: "BLOCKS wire path length, flat chord and core resistance on its tier (parts.js line 702); no failure on record sets a bound" },
  { pattern: /^[a-z0-9-]+\.\d+\.neck\.(trackLen|memT|pressForce)$/, why: "TANG membrane slider readouts (05_design.js line 296): track length, membrane depth, press force; no failure on record sets a bound" },
  { pattern: /^[a-z0-9-]+\.\d+\.pot\.(preload|leafForce|marginArc|marginCol|hubClear|arcColGap|stopClear|terminal\.[a-z0-9]+)$/, why: "TANG printed rotary pot readouts (05_design.js lines 120 and 262 to 301); a clearance under zero warns FIT at build" },
  { pattern: /^[a-z0-9-]+\.\d+\.gib\.(F|capVal|gap|settle|span|trackL|R[A-Za-z]*)$/, why: "GIB part2.js physics values as the bench computes them (packages/archetypes gib.ts); no failure on record sets a bound" },
  { pattern: /^layout\.(width|depth|faderOverhang|top)$/, why: "keys/midi-pad body extents and top as build.ts lays the archetypes out; the top is the seat's host.top and no failure on record sets a bound on the others" },
  { pattern: /^layout\.(diameter|rimTop)$/, why: "keys/access-switch body diameter and rim top as build.ts lays them out from the paddle and the cap top; no failure on record sets a bound" },
  { pattern: /^paddle\.(massG|guideClr|travel|boss)$/, why: "keys/access-switch paddle readouts: solid mass (a spring preload, never subtracted), guide clearance from profile access.paddleGuideClr, stop travel and boss length; no CHK-FIT row covers the guide and no failure on record sets a bound (R1-flagship-access-switch-02)" },
  { pattern: /^claim\.press\.(targetN|lo|hi)$/, why: "keys/access-switch press claim band from profile access.pressTargetN and access.pressBandPct; the claim stays unproven until a person enters a coupon reading, so no check gates it (R1-flagship-access-switch-04)" },
  { pattern: /^jack\.(legDepth|axisZ|wall)$/, why: "keys/access-switch jack seat readouts: leg depth against seat.socketPinMin (build.ts warns FIT under it), axis height and the wall the nut clamps; no failure on record sets a bound (R1-flagship-access-switch-06)" },
  { pattern: /^blocks\.standard$/, why: "the brick standard a designs/blocks part is built on (D-087), a word with no bound; the stud archetype's <id>.<n>.stud.standard row states the same fact (R1-designs-reach-13)" },
  { pattern: /^layout\.(bezelTop|floor|buttons)$/, why: "designs/pip bezel top, stack floor and button count as build.ts lays the archetypes out: the floor is the profile stack, the bezel top the host top plus the bezel, and no failure on record sets a bound (R1-designs-reach-09)" },
  { pattern: /^layout\.slot\.[A-Z]+$/, why: "designs/pip click slot direction each click key takes from the original's search (layout.js lines 281 to 345), an angle with no bound; the slot's fit rows are the click-spring-key archetype's (R1-designs-reach-09)" },
  { pattern: /^drive\.(UP|DOWN|LEFT|RIGHT|X|Y|A|B|SELECT|START|L|R)$/, why: "designs/pip drive pad targets, each the conductor id a key's contact closes, a name with no bound (R1-designs-reach-09)" },
  { pattern: /^keys\.\d+\.travel$/, why: "keys/midi-pad drive pad targets, each a copy of its key's flex-cone-key.<n>.key.travel, which CHK-KEY-01 gates (R1-designs-reach-07)" },
  { pattern: /^[a-z0-9-]+\.\d+\.host\.size$/, why: "designs/toggle host extent as the tilt-stick archetype places it under the stick, a placement readout; no failure on record sets a bound (R1-fix-23)" },
  { pattern: /^[a-z0-9-]+\.\d+\.stick\.(zf|topTrace|Rw|gateD|thContact|thStop|restBand|squeeze|Fc|Fs|strain|rCollar|ring|stemStress)$/, why: "designs/toggle tilt-stick readouts as the original bench computes them (packages/archetypes toggle/tilt.ts, port of part2a.js): heights, gate, contact and stop angles, forces, strain and stress on the material tier; the cup walls are CHK-PRT-04 (D-615, D-629) and no failure on record sets a bound on these (R1-fix-23)" },
  { pattern: /^[a-z0-9-]+\.\d+\.drive\.\d+\.(contact|stop)$/, why: "designs/toggle conductor ids a tilt sector closes at contact and at the stop, names with no bound (R1-fix-23)" },
  { pattern: /^drive\.(N|E|S|W)(\.deg)?$/, why: "designs/toggle drive pad sectors: the sector index of each direction and its centre angle, read by the drive pad; no failure on record sets a bound (R1-fix-23)" },
  { pattern: /^route\.(layers|tries|comDeg)$/, why: "designs/toggle route readouts: trace layers settled on, attempts before the first clean route and the COM column angle; CHK-NET-12 reads route.conflicts and route.unrouted, never these, and no failure on record sets a bound (R1-fix-23)" },
  { pattern: /^pinout\.P\d+$/, why: "designs/toggle net on each header terminal, a name with no bound (R1-fix-23)" },
  { pattern: /^drive\.(input\.(ceilOhm|pinFrac)|toy\.ceilOhm)$/, why: "keys/access-switch contact closure read: each device class ceiling from profile access.drive rows (inferred) and the pressed pin fraction; build.ts warns DRIVE past a ceiling and names the metal contact swap, and no failure on record sets a check bound (R1-score-05)" },
  { pattern: /^R\.(leads|closed)$/, why: "keys/access-switch closed path resistance on the cPLA tier, PIP's readout (model.js lines 453 to 460 and 481); the threshold of a switch interface is unknown, so no failure on record sets a bound (R1-flagship-access-switch-06)" },
];

/**
 * The builds a recording must hold: reference/<area>/<id> and designs/<id>
 * with a chase.ts and a build.ts. A design whose chase landed before its
 * build (designs/pip until R1-designs-reach-09) has nothing to record;
 * core/test/metric-record.test.ts names it in BUILD_PENDING and fails once
 * its build lands.
 */
function chases(): string[] {
  const dirs = (p: string): string[] => readdirSync(p, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  const refs = dirs(path.join(ROOT, "reference")).flatMap((a) => dirs(path.join(ROOT, "reference", a)).map((id) => `reference/${a}/${id}`));
  return [...dirs(path.join(ROOT, "designs")).map((id) => `designs/${id}`), ...refs]
    .filter((rel) => existsSync(path.join(ROOT, rel, "chase.ts")) && (rel.startsWith("reference/") || existsSync(path.join(ROOT, rel, "build.ts")))).sort();
}

describe(`metric gates over ${path.relative(ROOT, RECORD_FILE)}`, () => {
  it("every metric of every build names a registered gate or informational", () => {
    expect(gateProblems(record)).toEqual([]);
  });

  it("the record holds every reference and design build in the tree", () => {
    expect(record.builds.map((b) => b.build)).toEqual(chases());
  });
});

describe("the rule itself", () => {
  it("names the metric and the build when a metric has neither label", () => {
    expect(gateProblems(readRecord(path.join(FIXTURES, "ungated.json")))).toEqual([
      "reference/fixture/detent-rev-c part detent metric overhang.areaMm2: neither a gate nor informational (D-075)",
    ]);
  });

  it("refuses a gate that names no registered check, and passes a registered one", () => {
    const one = (gate: unknown): string[] => gateProblems({ note: "", builds: [{ build: "b", part: "p", metrics: [{ id: "m", gate }] }] });
    expect(one("CHK-KYE-01")).toEqual(["b part p metric m: gate CHK-KYE-01 is not a registered check"]);
    expect(one(true)).toEqual(["b part p metric m: gate true is neither a check id nor informational"]);
    expect(one("CHK-KEY-01")).toEqual([]);
    expect(one("informational")).toEqual([]);
  });
});

describe("informational audit (step 4)", () => {
  const informational = record.builds.flatMap((b) => b.metrics.filter((m) => m.gate === "informational").map((m) => `${b.build} ${m.id}`));

  it("every informational metric has a reason", () => {
    const bare = informational.filter((s) => !INFORMATIONAL.some((r) => r.pattern.test(s.split(" ")[1]!)));
    expect(bare).toEqual([]);
  });

  it("every reason matches a recorded metric", () => {
    const dead = INFORMATIONAL.filter((r) => !informational.some((s) => r.pattern.test(s.split(" ")[1]!))).map((r) => String(r.pattern));
    expect(dead).toEqual([]);
  });
});
