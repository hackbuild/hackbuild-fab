// .claude/settings.json keeps the M-1-T04 attribution and permissions
// (D-002, D-109, D-110) and wires the three agent hooks (R1-rails-ci-hooks-08).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const hooksDir = join(root, "tools", "agent-hooks");
const settings = JSON.parse(readFileSync(join(root, ".claude", "settings.json"), "utf8"));

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

/** Every command hook entry in the settings, with its event and matcher. */
function entries() {
  const out = [];
  for (const [event, groups] of Object.entries(settings.hooks ?? {})) {
    for (const group of groups) {
      for (const hook of group.hooks) out.push({ event, matcher: group.matcher, ...hook });
    }
  }
  return out;
}

const prefix = 'node "$CLAUDE_PROJECT_DIR/tools/agent-hooks/';

test("claude settings carry empty attribution and the export ask rules", () => {
  assert.deepEqual(settings.attribution, expected.attribution);
  assert.deepEqual(settings.permissions, expected.permissions);
  assert.deepEqual(Object.keys(settings).sort(), ["attribution", "hooks", "permissions"]);
});

test("hooks wire exactly the three agent hooks in four entries", () => {
  assert.deepEqual(Object.keys(settings.hooks).sort(), ["PostToolUse", "Stop", "SubagentStop"]);
  const wired = entries().map((e) => [e.event, e.matcher ?? "", e.command.slice(prefix.length, -1), e.timeout]);
  assert.deepEqual(wired, [
    ["PostToolUse", "Bash", "quiet-output.mjs", 30],
    ["PostToolUse", "Edit|Write", "touched-typecheck.mjs", 90],
    ["Stop", "", "stop-acceptance.mjs", 420],
    ["SubagentStop", "", "stop-acceptance.mjs", 420],
  ]);
});

test("every hook command runs a script that exists under tools/agent-hooks", () => {
  for (const e of entries()) {
    assert.equal(e.type, "command");
    assert.ok(e.command.startsWith(prefix) && e.command.endsWith('"'), e.command);
    const file = e.command.slice(prefix.length, -1);
    assert.ok(!file.includes("/") && file.endsWith(".mjs"), file);
    assert.ok(existsSync(join(hooksDir, file)), `missing ${file}`);
  }
});

test("no hook entry names export.run", () => {
  assert.ok(!JSON.stringify(settings.hooks).includes("export.run"));
  assert.ok(!JSON.stringify(settings.hooks).includes("export_run"));
});

test("no hook script approves a call", () => {
  const scripts = readdirSync(hooksDir).filter((f) => f.endsWith(".mjs"));
  assert.ok(scripts.length >= 3);
  for (const f of scripts) {
    const src = readFileSync(join(hooksDir, f), "utf8");
    assert.ok(!src.includes("permissionDecision"), `${f} names permissionDecision`);
  }
});
