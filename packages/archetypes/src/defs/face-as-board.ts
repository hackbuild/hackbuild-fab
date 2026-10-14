// face-as-board: seed row of seed/archetypes.seed.yaml.
// Registered at M06-T01. Senses, emits, limits and provenance mirror the
// seed; read and channels are the CANONS.md 4.1 working values that M06-T07
// confirms against the original named below (D-222).

import { refusedArchetype } from "../def.js";

export const faceAsBoard = refusedArchetype({
  id: "face-as-board",
  family: "printed",
  channels: 0,
  senses: [],
  emits: [
    "conductor",
    "pad",
    "pocket",
  ],
  read: "none",
  limits: [],
  provenance: "TANG R6 2026-09",
  status: "candidate",
  statusReason: "not ported: the face plate D.buildFace (04_design.js lines 91 to 445: router DSL, hex pads, Teensy socket block and pin map, buses, grille, peg pads, bands) has no port; the original is recorded headless (test/legacy/tang.json, face stack 13 layers of 0.24) and its pot tracks are ported in printed-rotary-pot; promotes in M11-T09 when reference/conductors/face-as-board regenerates the face per slot (M06-T09 build notes)",
  original: [
    { slug: "tang-r6", file: "files/src/04_design.js", fn: "D.buildFace, D.faceStack", lines: "from 91, 47", sha256: "43893788df778791f8f309ee1253addfb0248dc9f5fd42495f8809cf8d0ceef0", record: "tang-r6 4.2" },
  ],
});
