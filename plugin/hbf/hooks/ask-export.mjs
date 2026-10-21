#!/usr/bin/env node
// PreToolUse hook for the hbf export_run tool. It always answers "ask", so a
// person approves every fabrication export call in the host before the hbf
// gate puts its own question (USE.md, the export gate). It never answers
// "allow": the gate stays person only and no agent authorization opens it.
// The tool input is read and dropped; the answer does not depend on it.
import { argv, stdin, stdout } from "node:process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** The hook answer for one export_run call. */
export function askExport() {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: "export_run writes a fabrication file. a person approves every export; an agent never does.",
    },
  };
}

if (argv[1] && import.meta.url === pathToFileURL(resolve(argv[1])).href) {
  stdin.resume();
  stdin.on("data", () => {});
  stdin.on("end", () => stdout.write(`${JSON.stringify(askExport())}\n`));
}
