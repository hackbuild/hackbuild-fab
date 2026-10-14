// Compile-time refusals of a malformed def (M06-T01 "Done when"). Every
// expect-error directive below must be needed: if refusedArchetype() loosens so one of
// these compiles, tsc -p tsconfig.tests.json fails with "Unused
// '@ts-expect-error' directive".

import { refusedArchetype, type RefusedArchetype } from "@hackbuild/archetypes";

const ok: RefusedArchetype = {
  id: "probe", family: "printed", channels: 1, senses: [], emits: ["conductor"], read: "adc", limits: [],
  provenance: "probe", status: "candidate", statusReason: "probe", original: [],
};
refusedArchetype(ok);

// @ts-expect-error the seed family board-or-copper is outside the spec union
refusedArchetype({ ...ok, family: "board-or-copper" });
// @ts-expect-error a refused def cannot claim proven
refusedArchetype({ ...ok, status: "proven" });
// @ts-expect-error latch left the feature kinds (D-177)
refusedArchetype({ ...ok, emits: ["latch"] });
// @ts-expect-error a read model outside D-078 and none
refusedArchetype({ ...ok, read: "capacitive" });

const { statusReason: _r, ...noReason } = ok;
// @ts-expect-error a refused def names why
refusedArchetype(noReason);
