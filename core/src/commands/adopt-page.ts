// A page written on the libraries (plan 3.6): chase, bench and build are source
// in one data-hbf-page script, sections marked "// ---- chase", "// ---- bench",
// "// ---- build" and "// ---- run". adopt runs check-page on it first, then
// splits chase and build back into the two modules a design holds.

import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { CommandError, DraftBlock } from "@hackbuild/spec";
import { cmdError } from "../errors.js";

interface PageCheck {
  readonly id: string;
  readonly ok: boolean;
  readonly line: string;
}

interface CheckPageModule {
  checkPage(html: string, opts?: { root?: string }): PageCheck[];
}

const PAGE_SCRIPT = /<script\b[^>]*\bdata-hbf-page\b[^>]*>([\s\S]*?)<\/script>/i;

/** The source of the data-hbf-page script, or undefined when the page has none. */
export function pageSourceOf(html: string): string | undefined {
  return PAGE_SCRIPT.exec(html)?.[1];
}

/** Section text between a "// ---- <name>" marker line and the next marker. */
function section(src: string, name: string): string | undefined {
  const at = src.search(new RegExp(`^// ---- ${name}\\b`, "m"));
  if (at < 0) return undefined;
  const from = src.indexOf("\n", at) + 1;
  const next = src.slice(from).search(/^\/\/ ---- /m);
  return next < 0 ? src.slice(from) : src.slice(from, from + next);
}

const specNames = (src: string): string[] => {
  const m = /import\s*\{([^}]*)\}\s*from\s*"@hackbuild\/spec"/.exec(src);
  return (m?.[1] ?? "").split(",").map((s) => s.trim()).filter((s) => s !== "");
};

/** Run tools/skill-kit/check-page.mjs on a page; each failed check is one E_SCHEMA row, none when the page passes. */
export async function checkLibraryPage(html: string, root: string, label: string): Promise<CommandError[]> {
  const file = path.join(root, "tools", "skill-kit", "check-page.mjs");
  if (!existsSync(file)) {
    return [{ code: "E_REF", path: "/draft", got: label, expected: "tools/skill-kit/check-page.mjs in the workspace", hint: "adopt runs check-page on a library page first; the workspace has no tools/skill-kit" }];
  }
  const mod = (await import(pathToFileURL(file).href)) as CheckPageModule;
  return mod.checkPage(html, { root }).filter((r) => !r.ok).map((r): CommandError => ({
    code: "E_SCHEMA", path: `/draft/check-page/${r.id}`, got: r.line, expected: `check-page ${r.id} passes`,
    hint: `fix the page and run node tools/skill-kit/check-page.mjs ${label}`,
  }));
}

/** The draft block a library page stands for: chase.ts and build.ts from its source, the defaults as state. */
export function blockOfLibraryPage(source: string, label: string): DraftBlock {
  const chaseBody = section(source, "chase");
  const buildBody = section(source, "build");
  const bad = (what: string): never => {
    throw cmdError({ code: "E_SCHEMA", path: "/draft", got: label, expected: "a library page with // ---- chase and // ---- build sections", hint: `${label} ${what}` });
  };
  if (chaseBody === undefined || !/^const chase = defineChase\(/m.test(chaseBody)) return bad("has no \"const chase = defineChase(\" in its chase section");
  if (buildBody === undefined || !/^const build = defineBuild\(/m.test(buildBody)) return bad("has no \"const build = defineBuild(\" in its build section");
  const chase = `import { defineChase } from "@hackbuild/spec";\n\n${chaseBody.replace(/^const chase = /m, "export const chase = ").trimEnd()}\n`;
  const names = specNames(source).filter((n) => n !== "defineChase" && n !== "defineBench");
  const build = `import { ${names.join(", ")} } from "@hackbuild/spec";\nimport { chase } from "./chase";\n\n${buildBody.replace(/^const build = /m, "export const build = ").trimEnd()}\n`;
  return { goal: label, chase, build, files: {}, widget: null, state: {}, kernelVersion: "", defHash: "" } as unknown as DraftBlock;
}
