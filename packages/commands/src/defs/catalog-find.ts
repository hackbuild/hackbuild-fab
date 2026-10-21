// The catalog reads (M08-T04, M08-T14): offline over committed rows and
// the .hbf cache; --fetch kicad|seeed is the one network path (writes "network",
// CLI only), and it writes only the workspace .hbf cache.

import { z } from "zod";
import { PROCESSES, TIERS } from "@hackbuild/spec";
import type { CommandSpec } from "../spec.js";
import { inputOf, outputOf } from "../shared.js";

export const spec: CommandSpec<"catalog.find"> = {
  name: "catalog.find",
  group: "query",
  description: [
    "Search bought-part rows by id and name words, offline, over the committed catalog and the workspace .hbf cache.",
    "Each hit gives its tier, the weakest geometry or connectivity field of the row, and the source that tier rests on; best tier first.",
    "A tier filter keeps rows at that tier or better.",
    "fetch kicad or seeed first caches matching footprints from that KiCad library in .hbf (kicad community; seeed vendor for Seeed boards, community otherwise); without fetch nothing leaves the machine.",
    "fetch is CLI only: catalog_search on the MCP route does not offer it.",
    "Do not use it to read pins; catalog.pins returns the pin table with its provenance.",
  ].join(" "),
  input: inputOf<"catalog.find">(z.object({
    query: z.string().min(1).describe("words matched against row id and name, for example supermini"),
    process: z.enum(PROCESSES).exactOptional().describe("mount process; accepted, not yet a filter"),
    tier: z.enum(TIERS).exactOptional().describe("keep rows at this tier or better"),
    fetch: z.enum(["kicad", "seeed"]).exactOptional().describe("list a footprint library through kicad_fetch.py and cache matching rows first: kicad is the KiCad library on gitlab (tier community), seeed the Seeed OPL KiCad library (tier vendor for Seeed boards, community otherwise); each row records its origin, commit and licence; needs the network"),
  }).strict()),
  output: outputOf<"catalog.find">(),
  examples: [{ input: { query: "supermini" }, note: "esp32c3-supermini at tier vendor before the inferred BLOCKS seat" }, { input: { query: "sg90" }, note: "the SG90 row, tier inferred on its conflicted dimensions" }, { input: { query: "PinHeader_1x02_P2.54mm_Vertical", fetch: "kicad" }, note: "cache the KiCad 2.54 mm two-pin header footprints as community rows, then search; needs the network" }, { input: { query: "XIAO-RP2040-SMD", fetch: "seeed" }, note: "cache the Seeed XIAO RP2040 SMD footprint as a vendor row, then search; needs the network" }],
  writes: "network",
  cli: { target: "query", flags: { tier: { field: "tier", kind: "string" }, process: { field: "process", kind: "string" }, fetch: { field: "fetch", kind: "string" } }, transport: [] },
};
