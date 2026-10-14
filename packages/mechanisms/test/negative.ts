// Compile-time refusals of a malformed def (M06-T01 "Done when"). Every
// expect-error directive below must be needed: if refusedMechanism() loosens so one of
// these compiles, tsc -p tsconfig.tests.json fails with "Unused
// '@ts-expect-error' directive".

import { refusedMechanism, type RefusedMechanism } from "@hackbuild/mechanisms";

const ok: RefusedMechanism = {
  id: "probe", family: "logic", dof: null, governs: [], failureModes: [], processes: ["laser"],
  provenance: "probe", status: "candidate", statusReason: "probe", original: [],
};
refusedMechanism(ok);

// @ts-expect-error a family outside the canon
refusedMechanism({ ...ok, family: "gear" });
// @ts-expect-error a refused def cannot claim typed
refusedMechanism({ ...ok, status: "typed" });
// @ts-expect-error a process outside spec PROCESSES
refusedMechanism({ ...ok, processes: ["cnc"] });
// @ts-expect-error dof is a count or null, never text
refusedMechanism({ ...ok, dof: "1" });

const { statusReason: _r, ...noReason } = ok;
// @ts-expect-error a refused def names why
refusedMechanism(noReason);
const { original: _o, ...noOriginal } = ok;
// @ts-expect-error every def names its original, an empty list when none exists
refusedMechanism(noOriginal);
