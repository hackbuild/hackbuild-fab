// reference/electrical/capricate-touch/chase.ts
// M05-T12 (D-021, C-12, C-13): Capricate's 30 kohm ceiling for capacitive
// electrodes in cABS, rebuilt as a sweep that circuit.solve and CHK-NET-28
// read. Capricate (Schmitz et al., UIST 2015) measured touch electrodes of
// 5, 10, 15 and 20 mm against series resistors of 20 to 120 kohm in 10
// kohm steps and saw the SNR fall under 5:1 above 30 kohm for every size;
// the resistors stood in for trace resistance (capricate.txt lines 407 to
// 416). Electrodes are 0.2 mm thick, Capricate's minimum (line 417).
//
// scene.series declares the 45 nets: per electrode and resistor, a net whose
// resistor sits on the electrode edge and on the sensing pad, so the lead
// is 0 mm and the path is the resistor alone; and the minimal trace, 0.8 by
// 0.2 mm and 100 mm long, printed along the flow (lines 419 to 423), with
// no resistor. The electrode disc is the sensing surface and is not on the
// path. build.ts builds the four electrodes and the lead from this same
// declaration, so the geometry and the solve read one source.

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "electrical-capricate-touch", kind: "single", name: "CAPRICATE TOUCH", version: 1, chase: 2,
    kernels: ["geom", "mesh", "circuit", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0",
  },
  // Capricate printed Torwell conductive ABS (cABS) on its own machine; the profile carries its three rows (D-081).
  materials: [
    { slot: 1, material: "cabs", role: "conductor", label: "electrodes and lead", preview: "#1A1A1A" },
  ],
  params: [
    { id: "layout", label: "LAYOUT", live: "commit", fields: [
      { id: "pitchMm", type: "mm", label: "pitch", range: [22, 60], step: 1, default: 25,
        help: "electrode centre to centre spacing on the plate; no path reads it" },
    ] },
  ],
  presets: [],
  build: { module: "./build.ts", fn: "build" },
  // No 3mf: cABS has no harvested ffc5p preset row, and the writer refuses a guessed one (packages/3mf resolvePreset).
  exports: [{ kind: "stl" }],
  assertions: [],
  scene: {
    nets: "contact",
    series: {
      material: "cabs",
      electrodes: [
        { id: "electrode.d05", diameterMm: 5, tMm: 0.2 },
        { id: "electrode.d10", diameterMm: 10, tMm: 0.2 },
        { id: "electrode.d15", diameterMm: 15, tMm: 0.2 },
        { id: "electrode.d20", diameterMm: 20, tMm: 0.2 },
      ],
      leads: [
        { id: "lead.min", lengthMm: 100, widthMm: 0.8, tMm: 0.2 },
      ],
      nets: [
      { net: "D05-R020", interface: "capacitive", electrode: "electrode.d05", resistorOhm: 20000, leads: [] },
      { net: "D05-R030", interface: "capacitive", electrode: "electrode.d05", resistorOhm: 30000, leads: [] },
      { net: "D05-R040", interface: "capacitive", electrode: "electrode.d05", resistorOhm: 40000, leads: [] },
      { net: "D05-R050", interface: "capacitive", electrode: "electrode.d05", resistorOhm: 50000, leads: [] },
      { net: "D05-R060", interface: "capacitive", electrode: "electrode.d05", resistorOhm: 60000, leads: [] },
      { net: "D05-R070", interface: "capacitive", electrode: "electrode.d05", resistorOhm: 70000, leads: [] },
      { net: "D05-R080", interface: "capacitive", electrode: "electrode.d05", resistorOhm: 80000, leads: [] },
      { net: "D05-R090", interface: "capacitive", electrode: "electrode.d05", resistorOhm: 90000, leads: [] },
      { net: "D05-R100", interface: "capacitive", electrode: "electrode.d05", resistorOhm: 100000, leads: [] },
      { net: "D05-R110", interface: "capacitive", electrode: "electrode.d05", resistorOhm: 110000, leads: [] },
      { net: "D05-R120", interface: "capacitive", electrode: "electrode.d05", resistorOhm: 120000, leads: [] },
      { net: "D10-R020", interface: "capacitive", electrode: "electrode.d10", resistorOhm: 20000, leads: [] },
      { net: "D10-R030", interface: "capacitive", electrode: "electrode.d10", resistorOhm: 30000, leads: [] },
      { net: "D10-R040", interface: "capacitive", electrode: "electrode.d10", resistorOhm: 40000, leads: [] },
      { net: "D10-R050", interface: "capacitive", electrode: "electrode.d10", resistorOhm: 50000, leads: [] },
      { net: "D10-R060", interface: "capacitive", electrode: "electrode.d10", resistorOhm: 60000, leads: [] },
      { net: "D10-R070", interface: "capacitive", electrode: "electrode.d10", resistorOhm: 70000, leads: [] },
      { net: "D10-R080", interface: "capacitive", electrode: "electrode.d10", resistorOhm: 80000, leads: [] },
      { net: "D10-R090", interface: "capacitive", electrode: "electrode.d10", resistorOhm: 90000, leads: [] },
      { net: "D10-R100", interface: "capacitive", electrode: "electrode.d10", resistorOhm: 100000, leads: [] },
      { net: "D10-R110", interface: "capacitive", electrode: "electrode.d10", resistorOhm: 110000, leads: [] },
      { net: "D10-R120", interface: "capacitive", electrode: "electrode.d10", resistorOhm: 120000, leads: [] },
      { net: "D15-R020", interface: "capacitive", electrode: "electrode.d15", resistorOhm: 20000, leads: [] },
      { net: "D15-R030", interface: "capacitive", electrode: "electrode.d15", resistorOhm: 30000, leads: [] },
      { net: "D15-R040", interface: "capacitive", electrode: "electrode.d15", resistorOhm: 40000, leads: [] },
      { net: "D15-R050", interface: "capacitive", electrode: "electrode.d15", resistorOhm: 50000, leads: [] },
      { net: "D15-R060", interface: "capacitive", electrode: "electrode.d15", resistorOhm: 60000, leads: [] },
      { net: "D15-R070", interface: "capacitive", electrode: "electrode.d15", resistorOhm: 70000, leads: [] },
      { net: "D15-R080", interface: "capacitive", electrode: "electrode.d15", resistorOhm: 80000, leads: [] },
      { net: "D15-R090", interface: "capacitive", electrode: "electrode.d15", resistorOhm: 90000, leads: [] },
      { net: "D15-R100", interface: "capacitive", electrode: "electrode.d15", resistorOhm: 100000, leads: [] },
      { net: "D15-R110", interface: "capacitive", electrode: "electrode.d15", resistorOhm: 110000, leads: [] },
      { net: "D15-R120", interface: "capacitive", electrode: "electrode.d15", resistorOhm: 120000, leads: [] },
      { net: "D20-R020", interface: "capacitive", electrode: "electrode.d20", resistorOhm: 20000, leads: [] },
      { net: "D20-R030", interface: "capacitive", electrode: "electrode.d20", resistorOhm: 30000, leads: [] },
      { net: "D20-R040", interface: "capacitive", electrode: "electrode.d20", resistorOhm: 40000, leads: [] },
      { net: "D20-R050", interface: "capacitive", electrode: "electrode.d20", resistorOhm: 50000, leads: [] },
      { net: "D20-R060", interface: "capacitive", electrode: "electrode.d20", resistorOhm: 60000, leads: [] },
      { net: "D20-R070", interface: "capacitive", electrode: "electrode.d20", resistorOhm: 70000, leads: [] },
      { net: "D20-R080", interface: "capacitive", electrode: "electrode.d20", resistorOhm: 80000, leads: [] },
      { net: "D20-R090", interface: "capacitive", electrode: "electrode.d20", resistorOhm: 90000, leads: [] },
      { net: "D20-R100", interface: "capacitive", electrode: "electrode.d20", resistorOhm: 100000, leads: [] },
      { net: "D20-R110", interface: "capacitive", electrode: "electrode.d20", resistorOhm: 110000, leads: [] },
      { net: "D20-R120", interface: "capacitive", electrode: "electrode.d20", resistorOhm: 120000, leads: [] },
      { net: "TRACE-MIN", interface: "capacitive", resistorOhm: 0, leads: ["lead.min"] },
      ],
    },
  },
});

/** The params type a build function sees. */
export type CapricateTouchParams = ParamsOf<typeof chase>;
