// The hbf Claude Code plugin (R1-designs-reach-18, PLAN v9.1 sections 2 and 6 reach row):
// the manifest, the MCP server line, the export hook, the hbf skill and its copied references.
// Plugin facts read from the Claude Code plugin docs on 2026-10-21 (plugins-reference, hooks,
// mcp): the manifest lives at .claude-plugin/plugin.json and only name is required; a hooks file
// wraps its event map in "hooks"; a PreToolUse command hook asks with hookSpecificOutput
// { hookEventName, permissionDecision: "ask" }; a plugin MCP tool is named
// mcp__plugin_<plugin>_<server>__<tool>, so a matcher on the bare server key never fires; stdio
// servers substitute ${CLAUDE_PROJECT_DIR} in command, args and env; no path may leave the root.
// Run: node --test tools/test/plugin.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport, getDefaultEnvironment } from "@modelcontextprotocol/client/stdio";
import { lintText } from "@hackbuild/checks/voice";
import { ARCHIVE, DEST, drift, expected } from "../plugin/build.mjs";

const root = join(import.meta.dirname, "..", "..");
const plugin = join(root, "plugin", "hbf");
const refs = join(root, DEST);
const read = (p) => readFileSync(join(plugin, p), "utf8");
const manifest = JSON.parse(read(".claude-plugin/plugin.json"));
const mcp = JSON.parse(read(".mcp.json"));
const hooks = JSON.parse(read("hooks/hooks.json"));
const skill = read("skills/hbf/SKILL.md");

function walk(dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** The plugin's committed files: everything under plugin/hbf except the owner archive build. */
const committed = () => walk(plugin).filter((p) => !relative(refs, p).startsWith(`${ARCHIVE}/`));

const sub = (s, vars) => s.replace(/\$\{(\w+)\}/g, (m, k) => vars[k] ?? m);

/** The callable name of a plugin MCP tool: characters outside [A-Za-z0-9_-] become _. */
const pluginTool = (server, tool) => `mcp__plugin_${manifest.name}_${server}__${tool}`.replace(/[^A-Za-z0-9_-]/g, "_");

test("plugin.json parses with a kebab-case name, the owner as author and a licence", () => {
  assert.equal(manifest.name, "hbf");
  assert.match(manifest.name, /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/);
  assert.equal(manifest.version, "0.0.0");
  assert.equal(manifest.license, "MIT");
  assert.deepEqual(manifest.author, { name: "Moheeb Zara", email: "hackbuildvideo@gmail.com" });
  assert.ok(typeof manifest.description === "string" && manifest.description.length > 0);
});

test("the skill has its frontmatter and every reference it names exists", () => {
  const front = /^---\nname: (.+)\ndescription: (.+)\n---\n/.exec(skill);
  assert.ok(front, "SKILL.md opens with name and description frontmatter");
  assert.equal(front[1], "hbf");
  assert.ok(front[2].length <= 1024, `description ${front[2].length} characters, limit 1024`);
  const { archive } = expected();
  const named = [...skill.matchAll(/(?<![\w/.-])references\/([\w./-]+\.md)/g)].map((m) => m[1]);
  assert.ok(named.length >= 8, `SKILL.md names ${named.length} references`);
  const bad = named.filter((n) => (n.startsWith(`${ARCHIVE}/`) ? archive : true) && !existsSync(join(refs, n)));
  assert.deepEqual(bad, [], "SKILL.md names references the plugin does not hold");
});

test("every hbf verb the skill names is one the CLI serves", () => {
  const help = spawnSync(process.execPath, [join(root, "core", "bin", "hbf.mjs"), "--help"], { encoding: "utf8" });
  const verbs = new Set(`${help.stdout}${help.stderr}`.split("\n").map((l) => /^ {2}(\S+)/.exec(l)?.[1]).filter(Boolean));
  assert.ok(verbs.has("capabilities") && verbs.has("draft") && verbs.has("adopt"), `help lists ${verbs.size} verbs`);
  const named = [...skill.matchAll(/`hbf ([\w.]+)/g)].map((m) => m[1]);
  assert.ok(named.length > 0);
  assert.deepEqual(named.filter((v) => !verbs.has(v)), [], "SKILL.md names verbs hbf --help does not list");
});

test("build --check is clean, and an edited copy fails it", () => {
  const before = drift();
  assert.deepEqual(before.drift, [], `run node tools/plugin/build.mjs:\n${before.drift.join("\n")}`);
  const target = join(refs, "print-forge", "kernels.md");
  const text = readFileSync(target, "utf8");
  try {
    writeFileSync(target, `${text}edited by hand\n`);
    assert.deepEqual(drift().drift, ["changed print-forge/kernels.md"]);
    const r = spawnSync(process.execPath, [join(root, "tools", "plugin", "build.mjs"), "--check"], { encoding: "utf8" });
    assert.equal(r.status, 1, r.stdout);
  } finally {
    writeFileSync(target, text);
  }
});

test("the hook asks on the plugin's export_run tool and never allows", () => {
  const groups = hooks.hooks.PreToolUse;
  assert.deepEqual(Object.keys(hooks.hooks), ["PreToolUse"]);
  assert.equal(groups.length, 1);
  const [{ matcher, hooks: [hook] }] = groups;
  const name = pluginTool(Object.keys(mcp.mcpServers)[0], "export_run");
  assert.equal(name, "mcp__plugin_hbf_hbf__export_run");
  const re = new RegExp(`^(?:${matcher})$`);
  assert.ok(re.test(name), `matcher ${matcher} misses ${name}`);
  assert.ok(!re.test(pluginTool("hbf", "part_build")), "the matcher takes export_run only");
  const r = spawnSync("sh", ["-c", sub(hook.command, { CLAUDE_PLUGIN_ROOT: plugin })], {
    input: JSON.stringify({ hook_event_name: "PreToolUse", tool_name: name, tool_input: {} }),
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout).hookSpecificOutput, {
    hookEventName: "PreToolUse",
    permissionDecision: "ask",
    permissionDecisionReason: "export_run writes a fabrication file. a person approves every export; an agent never does.",
  });
});

test("the .mcp.json line starts hbf mcp in the project from any cwd and serves export_run", async () => {
  const [[server, cfg]] = Object.entries(mcp.mcpServers);
  assert.equal(server, "hbf");
  // hbf resolves its workspace from cwd before it reads --workspace (core/src/main.ts), and the
  // docs give a plugin stdio server no cwd field, so the line enters the project first.
  assert.equal(cfg.command, "sh");
  assert.match(cfg.args[1], /^cd "\$1" && exec npx --no-install hbf mcp /);
  assert.equal(cfg.args.at(-1), "${CLAUDE_PROJECT_DIR}");
  const transport = new StdioClientTransport({
    command: cfg.command,
    args: cfg.args.map((a) => sub(a, { CLAUDE_PROJECT_DIR: root })),
    cwd: tmpdir(),
    env: { ...getDefaultEnvironment(), ...(process.env.SOURCE_DATE_EPOCH === undefined ? {} : { SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH }) },
    stderr: "pipe",
  });
  const client = new Client({ name: "plugin-test", version: "0.0.0" }, { versionNegotiation: { mode: { pin: "2026-07-28" } } });
  await client.connect(transport);
  try {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    assert.ok(names.includes("export_run"), `tools: ${names.join(", ")}`);
  } finally {
    await client.close();
  }
});

test("no committed plugin file carries a user path or a banned character", () => {
  const files = committed();
  assert.ok(files.length >= 13, `${files.length} files`);
  const bad = [];
  for (const p of files) {
    const rel = relative(root, p);
    const text = readFileSync(p, "utf8");
    if (/\/Users\/|\/home\/|[A-Z]:\\Users\\|~\/\.claude/.test(text)) bad.push(`${rel}: absolute user path`);
    for (const f of lintText(rel, text)) if (f.severity === "block") bad.push(`${rel} line ${f.line}: ${f.rule}`);
  }
  assert.deepEqual(bad, []);
});
