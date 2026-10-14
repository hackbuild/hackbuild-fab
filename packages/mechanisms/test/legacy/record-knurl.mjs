// Records the KNURL legacy numbers the M06-T04 parity suite compares the
// port against (M06-T04 step 1). It evaluates the canonical original's two
// classic scripts, core lines 163 to 549 and design lines 553 to 1226 of
// knurl.html, under node with no DOM, after checking the file's sha256
// against the lineage.json canonical row knurl.bench/knurl-8, then calls
// KNURL.layout(KNURL.defaults()), KNURL.geneva and KNURL.sim the way
// originals/knurl/drive/layout.cjs does, and repeats the layout at
// print.clr 0.15 (the jam record). Nothing here is ported.
//
//   node packages/mechanisms/test/legacy/record-knurl.mjs
//
// writes packages/mechanisms/test/legacy/knurl.json.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";

const ROW = "knurl.bench/knurl-8";
const repo = new URL("../../../../", import.meta.url);
const row = JSON.parse(readFileSync(new URL("lineage.json", repo), "utf8")).find((r) => r.id === ROW);
if (row === undefined) throw new Error(`lineage.json has no row ${ROW}`);
const bytes = readFileSync(row.source);
const sha256 = createHash("sha256").update(bytes).digest("hex");
if (sha256 !== row.sha256) throw new Error(`${row.source}: sha256 ${sha256}, lineage ${row.sha256}`);
const lines = bytes.toString("utf8").split("\n");
const CORE = [163, 549];
const DESIGN = [553, 1226];
const code = [CORE, DESIGN].map(([a, b]) => lines.slice(a - 1, b).join("\n")).join("\n");

const ctx = vm.createContext({ Math, Object, Array, Number, String, JSON, Map, Set, Float32Array, Float64Array, Uint8Array, Uint16Array, Uint32Array, Int32Array, TextEncoder, DataView, ArrayBuffer, console });
vm.runInContext(code, ctx);
const K = ctx.KNURL;
const D = K.defaults();
const G = K.layout(D);
const D2 = K.defaults();
D2.print.clr = 0.15;
const G2 = K.layout(D2);
const plain = (x) => JSON.parse(JSON.stringify(x));
const pick = (g, keys) => Object.fromEntries(keys.map((k) => [k, g[k]]));
const KEYS = ["d", "S_n", "rp", "Rs", "slotLen", "alpha", "pinR", "slotW", "delta", "betaP", "rho0", "bumpR", "pawlLine", "pawlTipDeg", "pawlK", "pawlLift", "clickN", "pawlStrain", "pinSweep", "lockR"];
const record = {
  source: { lineage: ROW, file: "files/knurl.html", sha256, core: `${CORE[0]} to ${CORE[1]}`, design: `${DESIGN[0]} to ${DESIGN[1]}` },
  defaults: plain({ rounds: D.rounds, pawl: D.pawl, count: D.count, print: { clr: D.print.clr } }),
  layout: plain(pick(G, KEYS)),
  geneva: [-30, -15, 0, 15, 30].map((phi) => ({ phi, theta: K.geneva(G, phi) })),
  sims: [0, 27, 28, 29, 30, 31, 32, 33].map((i) => plain(K.sim(D, G, K.omegaFor(D, G, i)))),
  jam: plain({ clr: 0.15, ...pick(G2, ["pawlK", "pawlLift", "clickN", "pawlStrain"]) }),
};
writeFileSync(new URL("knurl.json", import.meta.url), `${JSON.stringify(record, null, 1)}\n`);
console.log(`rp ${G.rp} Rs ${G.Rs} slotLen ${G.slotLen} alpha ${G.alpha} k ${G.pawlK} click ${G.clickN} strain ${G.pawlStrain}; jam click ${G2.clickN} strain ${G2.pawlStrain}`);
