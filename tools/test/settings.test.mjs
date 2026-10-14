// .claude/settings.json must deep equal the M-1-T04 object (D-002, D-109, D-110).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const expected = {
  attribution: { commit: "", pr: "" },
  permissions: {
    ask: [
      "mcp__hbf__export_run",
      "Bash(npx --no-install hbf export.run*)",
      "Bash(npx hbf export.run*)",
      "Bash(hbf export.run*)",
      "Bash(script *)",
    ],
    deny: [
      "Bash(git commit*--trailer*)",
      "Read(./.hbf/gate.key)",
      "Read(./.hbf/http.token)",
    ],
  },
};

test("claude settings carry empty attribution and the export ask rules", () => {
  const path = join(import.meta.dirname, "..", "..", ".claude", "settings.json");
  const settings = JSON.parse(readFileSync(path, "utf8"));
  assert.deepEqual(settings, expected);
});
