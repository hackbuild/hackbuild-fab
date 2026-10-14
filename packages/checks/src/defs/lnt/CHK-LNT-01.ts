// CHK-LNT-01, no em or en dash anywhere in source, prose or UI (BEAM PRD
// 2026-08 states the ban as a lint rule; RULES.md Language). The run is
// lint-voice's dash rule: U+2012 to U+2015, U+2212 and the extra dashes
// of RULES.md Language (U+2E3A, U+2E3B, U+FE58, U+FE63, U+FE31, U+FE32,
// U+FF0D), raw, escaped or as an entity. 2.0.0 (2026-10-08): the extra
// dashes now fail where 1.0.1 passed them.

import { defineCheck } from "../../registry.js";
import { voiceFinding } from "./voice.js";

export const check = defineCheck({
  id: "CHK-LNT-01",
  level: "source",
  run: (t) => [voiceFinding(t.source, ["dash"], "RULES.md Language: no em or en dash, U+2012 to U+2015, U+2212 or the extra dashes RULES.md names, in any form; use commas, periods or to")],
});
