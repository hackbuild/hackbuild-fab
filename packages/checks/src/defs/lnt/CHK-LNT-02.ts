// CHK-LNT-02, no emoji; no four-point sparkle glyph (hackbuild design
// system 2026-08: sparkle glyphs read as an AI signature and were rejected
// by name). The run is lint-voice's emoji and sparkle rules. 2.0.0
// (2026-10-08): the emoji presentation set RULES.md names (U+203C, U+2049,
// U+20E3, U+200D, U+2B50 and kin) now fails where 1.0.1 passed it.

import { defineCheck } from "../../registry.js";
import { voiceFinding } from "./voice.js";

export const check = defineCheck({
  id: "CHK-LNT-02",
  level: "source",
  run: (t) => [voiceFinding(t.source, ["emoji", "sparkle"], "RULES.md Language: no emoji and no sparkle glyph U+2726 to U+2728; icons are HbIcon or inline svg")],
});
