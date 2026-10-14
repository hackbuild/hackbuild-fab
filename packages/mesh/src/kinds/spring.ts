// The spring feature kind (D-059, admitted at M06-T08; PACKAGES.md: mesh
// owns it). A SpringFeature declares the beam the archetype emitted as its
// own body (the PIP click element, click-spring-key apply), so the kind
// generates no geometry of its own: the element carries end blocks, a
// shuttle and a dovetailed tip the beam fields do not describe. Its checks
// read the declared beam: CHK-KEY-04 the FE window on riseQ (with sw).
// Fit class "none": the slot's fit is declared on the slot pockets.

import type { CheckId, FeatureKindDef, FeatureOf, NonEmpty, SchemaLike } from "@hackbuild/spec";
import { fieldsSchema } from "./pocket.js";

export const SPRING_KIND_VERSION = "1.0.0";
export const SPRING_CHECK_IDS: NonEmpty<CheckId> = ["CHK-KEY-04"];
export const SPRING_REFERENCE = "buttons/click-spring";

export const springKind: FeatureKindDef<"spring"> = {
  kind: "spring",
  version: SPRING_KIND_VERSION,
  schema: fieldsSchema("spring", ["l", "t", "w", "riseQ", "ends", "bend"]) as SchemaLike<unknown, FeatureOf<"spring">>,
  generate(f) {
    return { preUnionCutters: [], positives: [], postUnionCutters: [], bodies: [], owns: { volume: f.body ?? f.id } };
  },
  checks: SPRING_CHECK_IDS,
  fit: "none",
  reference: [SPRING_REFERENCE],
};
