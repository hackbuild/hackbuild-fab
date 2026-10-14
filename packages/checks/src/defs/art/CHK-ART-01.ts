// CHK-ART-01, export completeness: unique resolved object names, no
// undefined, null or NaN in part names; STL entry count equals object count
// (TENON 2026-09: five objects named tenon-undefined, and five parts
// overwrote one name in the STL zip, so four STLs were lost; the node
// LABEL map was never extended past the 6-part bench).
//
// M00 shipped the rule as export-completeness in packages/3mf: the writer
// refuses the export before a byte is written, and the validator mirror
// reads the names back from Metadata/model_settings.config. This module
// registers the mirror's result under the id, so the rule exists once; the
// old name resolves through CHECK_ID_ALIASES for one minor. The STL count
// clause needs the sibling STL zip, which an artifact target does not carry,
// so it runs where the writer and `validateEntries` are handed the members.

import { defineCheck } from "../../registry.js";
import { validatorFindings } from "../3mf/validator.js";

export const check = defineCheck({
  id: "CHK-ART-01",
  level: "artifact",
  run: (t, _ctx, src) => validatorFindings(t, "CHK-ART-01", src.filamentTemplate),
});
