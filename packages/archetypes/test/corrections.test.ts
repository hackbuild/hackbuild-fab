// M06-T07 step 2: one assertion per row of the D-096 correction table. Each
// probe reads what the code now holds (a default, a profile constant, a
// def field) and must equal the corrected value; the seed value, read from
// the seed YAML where the seed states it, must not be what the code holds.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { parse } from "yaml";
import { CLICK_DEFAULTS, CORRECTIONS, NECK_DEFAULTS, POT_DEFAULTS, archetypes, neckDerive, potDerive, shippedProfile } from "@hackbuild/archetypes";
import { originalPath } from "../../../tools/test-support/originals-root.js";

const seed = parse(readFileSync(new URL("../seed/archetypes.seed.yaml", import.meta.url), "utf8")) as { id: string; params?: Record<string, unknown>; limits?: string[]; geometry?: unknown; firmware?: string; fits?: string[]; hookup?: string }[];
const row = (id: string) => seed.find((r) => r.id === id);
const def = (id: string) => archetypes.resolve(id).def;
const p = shippedProfile();
const k = (id: string): number => p.constant(id).value;
const limitHas = (id: string, s: string): boolean => def(id).limits.some((l) => l.includes(s));
const kohm = (v: number | null): string => `${Math.round((v ?? Number.NaN) / 1000)}k`;
const rowOf = (m: string, d: "along" | "bulk"): string => { const r = p.resistivity(m, d, "printed"); return `${r.id} ${String(r.ohmCm)} ohm cm (computed, row ${r.provenance.tier})`; };
const tpu95 = p.material("tpu95");
/** TANG's own material row, 03_design.js line 27: the values the seed's numbers were computed at. */
const TANG = originalPath("tang-r6/files/src/03_design.js");
const tangMat = readFileSync(TANG, "utf8").split("\n")[26] ?? "";
const tang = (k: string): number => Number(new RegExp(`${k}: (\\d+)`).exec(tangMat)?.[1]);

/** The rotary pot's arc readouts at the shipped rows, from its own derive, in the sentence the def carries. */
function potSentence(): string {
  const ctpu = potDerive({ ...POT_DEFAULTS, arcMat: "ctpu" }, p)["R.arc"]!.value;
  const cpla = potDerive({ ...POT_DEFAULTS, arcMat: "cpla" }, p)["R.arc"]!.value;
  return `at the shipped rows the cTPU arc is ${kohm(ctpu)} on ${rowOf("ctpu", "bulk")} and a cPLA arc ${kohm(cpla)} on ${rowOf("cpla-protopasta", "along")}; the seed's cPLA 14k swinging 10 percent against 40k of printed leads and cTPU 709k swinging 73 were computed at Protopasta ${tang("cplaXY")} and cTPU ${tang("ctpu")} ohm cm (TANG 03_design.js line 27); a rigid wiper scratches the track`;
}

/** The wall slider's track and press force at the shipped rows, from its own derive. */
function wallSentence(): string {
  const d = neckDerive(NECK_DEFAULTS, p);
  return `at the shipped rows contact takes about ${(d.pressForce!.value ?? Number.NaN).toFixed(2)} N on tpu95 ${String(tpu95.modulusMPa)} MPa (computed, row ${tpu95.provenance.tier}) and the slide track is ${kohm(d["R.track"]!.value)} on ${rowOf("ctpu", "bulk")}; the seed's 2.2 N and 358k swinging 74 percent were computed at TPU ${tang("tpuE")} MPa and cTPU ${tang("ctpu")} ohm cm (TANG 03_design.js line 27)`;
}

/** What the code holds for each row, by entry and item. */
const PROBES: Record<string, () => string> = {
  "click-spring-key defaults": () => `l ${CLICK_DEFAULTS.l}, t ${CLICK_DEFAULTS.t}, w ${CLICK_DEFAULTS.w}, Q ${CLICK_DEFAULTS.Q}, E ${CLICK_DEFAULTS.E}, sw ${CLICK_DEFAULTS.sw}`,
  "click-spring-key rise limits": () => def("click-spring-key").limits.find((l) => l.startsWith("FE window")) ?? "",
  "click-spring-key fatigue": () => def("click-spring-key").limits.find((l) => l.startsWith("PETG")) ?? "",
  "tilt-stick read and pad": () => def("tilt-stick").limits.find((l) => l.startsWith(`read ${def("tilt-stick").read}`)) ?? "",
  "buried-trace-stack stack": () => `traces ${k("stack.traceWidth")} wide, layer ${k("stack.trace")}, iso ${k("stack.iso")}, PETG over L2 ${k("stack.overL2")}, net to net floor ${k("stack.netToNetMin")}`,
  "rp2040-zero-seat wire cups": () => def("rp2040-zero-seat").limits.find((l) => l.startsWith("cup gap")) ?? "",
  "rp2040-zero-seat firmware": () => def("rp2040-zero-seat").limits.find((l) => l.startsWith("read charge-release")) ?? "",
  "hex-key across flats": () => (limitHas("hex-key", "across flats 18.53") ? "18.53" : "absent"),
  "astable-blinky split": () => `astable-blinky-tack: ${def("astable-blinky-tack").limits.at(-1)?.replace(" (design value, plan-deltas R47)", "")}; astable-blinky-shim: ${def("astable-blinky-shim").limits.at(-1)?.replace(" (design value, plan-deltas R47)", "")}`,
  "three-source-power-oring status": () => def("three-source-power-oring").status,
  "printed-membrane-slider split": () => ["membrane-slider-thinpot", "membrane-slider-gib", "membrane-slider-wall"].filter((id) => archetypes.get(id) !== undefined).join(", "),
  "c3-carrier dual-supply jumper": () => def("c3-carrier").limits.find((l) => l.startsWith("dual-supply")) ?? "",
  "blocks-stud standard": () => (def("blocks-stud").limits.find((l) => l.includes("two presets"))?.replace("pin to stud 5 to 50 kohm; ", "") ?? ""),
  "sao-port entry": () => def("sao-port").limits[0] ?? "",
  "pi-hat-carrier entry": () => def("pi-hat-carrier").limits[0] ?? "",
  "printed-rotary-pot arc resistance": () => (def("printed-rotary-pot").limits.includes(potSentence()) ? potSentence() : "absent"),
  "membrane-slider-wall track and force": () => (def("membrane-slider-wall").limits.includes(wallSentence()) ? wallSentence() : "absent"),
};

describe("D-096 archetype corrections", () => {
  test("the table has a probe for every row and a row for every probe", () => {
    expect(CORRECTIONS.map((c) => `${c.entry} ${c.item}`).sort()).toEqual(Object.keys(PROBES).sort());
  });
  for (const c of CORRECTIONS) {
    test(`${c.entry}: ${c.item}`, () => {
      const got = PROBES[`${c.entry} ${c.item}`]!();
      expect(got).toBe(c.corrected);
      expect(got).not.toBe(c.seed);
    });
  }
  test("the seed values are what the seed states", () => {
    expect(row("click-spring-key")?.params).toMatchObject({ span: 22, beam: 0.5 });
    expect(row("click-spring-key")?.limits).toContain(CORRECTIONS.find((c) => c.item === "rise limits")?.seed);
    expect(row("tilt-stick")?.params).toMatchObject({ pullup: "470k" });
    expect(String(row("buried-trace-stack")?.geometry)).toContain("1.0 wide by 0.72 tall with 0.48 PETG");
    expect(JSON.stringify(row("rp2040-zero-seat")?.geometry)).toContain("5.2 mm spacing so a trace fits between two cups");
    expect(row("rp2040-zero-seat")?.firmware).toContain("470k pullup per key as the fallback");
    expect(row("hex-key")?.params).toMatchObject({ across_flats: 17.3 });
    expect(row("blocks-stud")?.limits?.join(" ")).toContain("45k pullup lands in the undefined band");
    expect(row("astable-blinky")).toBeDefined();
    expect(row("sao-port")).toBeUndefined();
    expect(row("printed-rotary-pot")?.limits).toContain(CORRECTIONS.find((c) => c.item === "arc resistance")?.seed);
    expect(row("printed-membrane-slider")?.limits).toContain(CORRECTIONS.find((c) => c.item === "track and force")?.seed);
  });

  test("the shipped-row sentences read values that differ from the seed's, and TANG's row is what the seed priced", () => {
    expect([tang("cplaXY"), tang("ctpu"), tang("tpuE")]).toEqual([30, 1500, 30]);
    // At TANG's own cTPU 1500 the pot's derive returns the seed's 709k, so the sentence's 189k is the row, not the port.
    const at1500 = new Proxy(p, { get: (t, k) => (k === "resistivity" ? (m: string, d: "along" | "bulk", f: "printed") => ({ ...t.resistivity(m, d, f), ohmCm: m === "ctpu" ? tang("ctpu") : t.resistivity(m, d, f).ohmCm }) : Reflect.get(t, k)) });
    expect(kohm(potDerive({ ...POT_DEFAULTS, arcMat: "ctpu" }, at1500)["R.arc"]!.value)).toBe("709k");
    expect(kohm(neckDerive(NECK_DEFAULTS, at1500)["R.track"]!.value)).toBe("358k");
  });
});
