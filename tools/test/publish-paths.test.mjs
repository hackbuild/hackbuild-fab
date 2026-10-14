// Publish audit of 2026-10-13 (findings S-03, D-02, D-03): public Markdown names the owner's
// archive by prefix, never by a local absolute path, and no tracked file carries a private
// chat link. docs/reference/checks/ is generated from the check seed and is left to that
// generator; packages/mesh/seed/README.md mirrors lineage.json row for row.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { publishText } from "../publish-paths.mjs";

const root = join(import.meta.dirname, "..", "..");
const inGit = existsSync(join(root, ".git"));
const home = ["", "Users", "obsidian", ""].join("/");
const chat = ["claude", "ai/chat/"].join(".");

const tracked = () => execFileSync("git", ["ls-files", "--cached"], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);
const PUBLIC_MD = /^(?:[^/]+\.md|knowledge\/.+\.md|docs\/plan\/.+\.md|docs\/explanation\/.+\.md|spec\/README\.md|packages\/[^/]+\/README\.md|core\/README\.md|designs\/[^/]+\/README\.md|reference\/.+\/README\.md)$/;

test("publishText maps local paths to archive prefixes and drops chat links", () => {
  const src = `a ${home}Projects/hackbuild/fab-knowledge/originals/x/RECORD.md b ${home}Projects/hackbuild/hackbuild-fab/spec/ids.ts`
    + ` c ${home}Projects/hackbuild/fab-work-directory/benches/y d ${home}Projects/hackbuild/hackbuild-ui/src e ${home}Downloads/z`
    + ` f. Chat "a title" (https://${chat}0ae6e90c-b9cb-4869-9852-ee33f5af5386). g`;
  assert.equal(publishText(src), "a fab-knowledge:originals/x/RECORD.md b spec/ids.ts c fab-work-directory:benches/y d hackbuild-ui/src e ~/Downloads/z f. g");
});

test("public Markdown carries no local absolute path", { skip: !inGit && "no git index" }, () => {
  const hits = tracked().filter((p) => PUBLIC_MD.test(p) && !p.includes("/legacy/") && existsSync(join(root, p))
    && readFileSync(join(root, p), "utf8").includes(home));
  assert.deepEqual(hits, []);
});

test("no tracked text file carries a private chat link", { skip: !inGit && "no git index" }, () => {
  const hits = tracked().filter((p) => /\.(md|json|ts|mjs|txt|yml|yaml)$/.test(p) && !p.includes("/legacy/") && existsSync(join(root, p))
    && readFileSync(join(root, p), "utf8").includes(chat));
  assert.deepEqual(hits, []);
});

test("registry rows keep chat slugs and carry no chat links", () => {
  const reg = JSON.parse(readFileSync(join(root, "registry/tools.json"), "utf8"));
  for (const t of reg.tools) assert.ok(!("chat_urls" in t), `${t.slug} has chat_urls`);
  for (const [slug, c] of Object.entries(reg.chats)) assert.ok(!("url" in c) && !("id" in c) && !("title" in c), `chat ${slug}`);
});
