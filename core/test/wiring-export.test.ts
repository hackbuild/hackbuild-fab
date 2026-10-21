// M08-T13 steps 3 and 4: export.run --kind wiring through runWiringExport on
// the two wiring references. The SuperMini side reads the SPINDLE README
// pin map (an independent source, fab-work-directory benches/spindle) and
// the committed catalog.pins answer the wiring package tests read; the
// TANG R5 side reads the net list and the drawing labels of the original
// tang_r5_wiring.html, never build.ts. Nothing here comes from the code
// under test.

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import { isThrownCommandError, type CommandInput, type Hash, type PinDef } from "@hackbuild/spec";
import { wiringReport, wiringSvg } from "@hackbuild/wiring";
import { loadDesign } from "../src/commands/build.js";
import { isWiringDesign, runWiringExport, wiringCommandError, wiringDraft, wiringInputOf, WIRING_EXPORTER } from "../src/exporters/wiring.js";
import { workspaceCatalog } from "../src/catalog-files.js";
import { PROCESS_STREAMS } from "../src/tty-gate.js";
import { Store } from "../src/store.js";
import type { CoreCtx } from "../src/ctx.js";
import { ROOT } from "./hbf.js";
import { localSource, originalPath } from "../../tools/test-support/originals-root.js";

const OUT = mkdtempSync(path.join(tmpdir(), "hbf-wiring-"));
afterAll(() => rmSync(OUT, { recursive: true, force: true }));

const ctxFor = (out: string): CoreCtx => ({
  workspace: ROOT, cwd: ROOT, branch: "", store: new Store(ROOT), transport: "cli",
  inputsHash: "0".repeat(64) as Hash, gate: PROCESS_STREAMS, cli: { out },
} as unknown as CoreCtx);

async function exportOf(ref: string) {
  const design = await loadDesign(ref, ROOT);
  const file = path.join(OUT, `${path.basename(ref)}.svg`);
  const r = await runWiringExport(design, { chase: ref, kind: "wiring" } as CommandInput<"export.run">, ctxFor(file));
  return { design, r, file, svg: readFileSync(file, "utf8") };
}

/** Text content of every <text> element of an SVG, whitespace collapsed. */
const texts = (svg: string): string[] => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]!.replace(/&amp;/g, "&").replace(/\s+/g, " ").trim());

describe("wiring-supermini (SPINDLE R1 module)", async () => {
  const { design, r, file, svg } = await exportOf("reference/boards/wiring-supermini");
  const readme = readFileSync(localSource("fab-work-directory:benches/spindle/outputs/spindle/README.md"), "utf8");
  const table = readme.split("### Pin map")[1]!.split("\n").filter((l) => /^\| (motor|laser|calibration|spare)/.test(l));
  const gpios = table.flatMap((l) => l.split("|")[2]!.replace(/\(.*\)/, "").split(",").map((s) => `GPIO${s.trim()}`));

  test("a wiring design, no gate: one SVG artifact written and stored", () => {
    expect(isWiringDesign(design)).toBe(true);
    expect(WIRING_EXPORTER.fabrication).toBe(false);
    expect(r.verdict).toBe("pass");
    expect(r.artifacts).toHaveLength(1);
    expect(r.artifacts[0]).toMatchObject({ kind: "wiring", mediaType: "image/svg+xml" });
    expect(existsSync(file)).toBe(true);
  });

  test("every GPIO of the SPINDLE README pin map is drawn used, with its function", () => {
    expect(gpios.sort()).toEqual(["GPIO0", "GPIO1", "GPIO10", "GPIO2", "GPIO20", "GPIO21", "GPIO3", "GPIO4", "GPIO5", "GPIO6", "GPIO7"]);
    const used = [...svg.matchAll(/<circle [^>]*r="7" fill="#FE0386"[^>]*data-pin="([^"]+)"/g)].map((m) => m[1]!);
    for (const g of gpios) expect(used, g).toContain(g);
    const labels = texts(svg);
    for (const g of gpios) expect(labels.some((t) => t.startsWith(`${g} `)), g).toBe(true);
  });

  test("the two pins the README leaves unused are drawn in gold", () => {
    const unused = [...svg.matchAll(/<circle [^>]*r="7" fill="#d4a94a"[^>]*data-pin="([^"]+)"/g)].map((m) => m[1]!).sort();
    expect(unused).toEqual(["GPIO8", "GPIO9"]);
  });
});

describe("wiring-tang-r5 parity with tang_r5_wiring.html", async () => {
  const { r, svg } = await exportOf("reference/boards/wiring-tang-r5");
  const report = (r.result as unknown as { report: { used: { pin: string; function: string }[]; unmatched: unknown[]; ends: { net: string; pin: string }[] } }).report;
  const html = readFileSync(originalPath("tang-r5/files/tang_r5_wiring.html"), "utf8");
  const rows = [...html.split("<h2>Net list</h2>")[1]!.split("</table>")[0]!.matchAll(/<tr>(.*?)<\/tr>/g)]
    .map((m) => [...m[1]!.matchAll(/<td>(.*?)<\/td>/g)].map((c) => c[1]!));
  const origLabels = [...html.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]!.replace(/\s+/g, " ").trim());

  /** Pin to net pairs the original states: its net list rows naming a Teensy pin, and the pot labels "MODE A2 / 16" of its drawing. */
  function originalPairs(): Map<string, string> {
    const out = new Map<string, string>();
    for (const [a, b] of rows) {
      const left = /^Teensy (\S+)$/.exec(a!);
      if (left !== null) out.set(left[1]!, /MAX98357A (\S+)/.exec(b!)![1]!);
      const sns = /^island (\S+) tail$/.exec(a!);
      const tails = /^island P1\.\.P6 tails$/.exec(a!);
      const pins = /^Teensy ([\d,]+)/.exec(b ?? "");
      if (sns !== null && pins !== null) out.set(pins[1]!, sns[1]!);
      if (tails !== null && pins !== null) pins[1]!.split(",").forEach((p, i) => out.set(p, `P${i + 1}`));
    }
    for (const t of origLabels) {
      const m = /^(\w+) A\d \/ (\d+)$/.exec(t);
      if (m !== null) out.set(m[2]!, m[1]!);
    }
    return out;
  }

  test("the original states 15 Teensy pin pairs (counted from its net list and drawing)", () => {
    expect(originalPairs().size).toBe(15);
  });

  test("the WiringReport lists the same pin and net pairs, plus the 3.3V rail the 47k and the pots use", () => {
    const got = new Map(report.used.map((u) => [u.pin, u.function]));
    const want = originalPairs();
    want.set("3.3V", "3V3");
    expect(Object.fromEntries([...got].sort())).toEqual(Object.fromEntries([...want].sort()));
    expect(report.unmatched).toEqual([]);
  });

  test("the original's Teensy pin columns equal the drawing's: same names, same side, same order from the USB end", () => {
    /** Labels or pads grouped into columns by x, each column read from the top (the USB end) down. */
    const columns = (pts: readonly { name: string; x: number; y: number }[]): string[][] => {
      const xs = [...new Set(pts.map((p) => p.x))].sort((a, b) => a - b);
      return xs.map((x) => pts.filter((p) => p.x === x).sort((a, b) => a.y - b.y).map((p) => p.name));
    };
    const at = html.indexOf(">TEENSY 4.0<");
    const orig = [...html.slice(at).matchAll(/<text x="([\d.]+)" y="([\d.]+)"[^>]*>([^<]*)<\/text>/g)].slice(0, 28)
      .map((m) => ({ name: m[3]!, x: Number(m[1]), y: Number(m[2]) }));
    const ours = [...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="7" [^>]*data-pin="([^"]+)"/g)]
      .map((m) => ({ name: m[3]!, x: Number(m[1]), y: Number(m[2]) }));
    expect(ours).toHaveLength(28);
    expect(columns(ours)).toEqual(columns(orig));
  });

  test("every net label of the original's Teensy side appears on the drawing", () => {
    const labels = texts(svg).join("\n");
    for (const net of new Set([...originalPairs().values(), "3V3"])) expect(labels, net).toMatch(new RegExp(`(^|[\\s>])${net.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|\\s)`, "m"));
  });

  test("the drawing prints the row tier: vendor, from the PJRC card", () => {
    expect(texts(svg)[0]).toBe("Teensy 4.0, top view, USB up, pads vendor");
  });
});

describe("wiring refusals as command errors", async () => {
  const design = await loadDesign("reference/boards/wiring-supermini", ROOT);
  const wi = wiringInputOf(workspaceCatalog(ROOT), await wiringDraft(design, {}));
  const codeOf = (f: () => unknown) => {
    try { f(); } catch (e) { const c = wiringCommandError(e, wi); return isThrownCommandError(c) ? c.hbf : c; }
    throw new Error("expected a throw");
  };

  test("a catalog row naming a pin with no pad position is E_SCHEMA at the row, never E_REF", () => {
    const pins = wi.pins.map((p) => (p.name === "GPIO20" ? { n: p.n, name: p.name, role: p.role } as PinDef : p));
    expect(codeOf(() => wiringReport({ ...wi, pins }))).toMatchObject({ code: "E_SCHEMA", path: "/catalog/esp32c3-supermini/pads", got: "GPIO20" });
    const unused = wi.pins.map((p) => (p.name === "GPIO8" ? { n: p.n, name: p.name, role: p.role } as PinDef : p));
    expect(codeOf(() => wiringSvg({ ...wi, pins: unused }))).toMatchObject({ code: "E_SCHEMA", got: "GPIO8" });
  });

  test("a used pin the row lacks is E_REF at its used entry, offering the row's pin names", () => {
    const used = [wi.used[0]!, { pin: "GPIO21x", function: "X" }];
    expect(codeOf(() => wiringReport({ ...wi, used }))).toMatchObject({ code: "E_REF", path: "/build/used/1/pin", got: "GPIO21x", didYouMean: expect.arrayContaining(["GPIO21"]) });
  });

  test("any other throw passes through unchanged", () => {
    const e = new RangeError("x");
    expect(wiringCommandError(e, wi)).toBe(e);
  });
});
