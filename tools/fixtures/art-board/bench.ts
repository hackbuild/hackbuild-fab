import { defineBench } from "@hackbuild/spec";
import { chase } from "./chase";

export const bench = defineBench(chase, {
  shell: "paper",
  views: {
    default: "assembled", modes: ["assembled"], render: ["solid"], overlays: ["busy", "welcome"], cams: ["iso", "top"], stage: "graph",
  },
  rail: [
    { step: "art", goal: "lay text, shapes, marks and svg paths on the front and back faces; drag, scale and turn them on the board.", panels: ["params.face"], focus: "art" },
    { step: "print", goal: "save the design file; this fixture carries no geometry build.", panels: ["exports"], focus: "export" },
  ],
  welcome: { tagline: "the art board on its own", presets: [], starts: [] },
  status: ["build.hash"],
});
