// The runner manifest (plan v11.2 section 5): external programs hbf runs as
// separate processes, one row each in registry/runners.json, and the doctor
// lines that report them. A runner is optional: an absent one is "not run"
// with its install line, never a fail, since only the command that needs it
// can refuse. A copyleft runner must declare link process (D-043).

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { DoctorLine } from "./commands/doctor.js";

export type RunnerKind = "slicer" | "eda" | "firmware" | "router" | "intake";

export interface RunnerDetect {
  /** A macOS app executable; its version is the bundle's CFBundleShortVersionString. */
  readonly app?: string;
  /** The Info.plist, relative to the executable's folder. */
  readonly plist?: string;
  /** A command looked up on PATH, then at each of paths. */
  readonly command?: string;
  readonly paths?: readonly string[];
  readonly versionArgs?: readonly string[];
  /** The first group is the version, read from the command's output. */
  readonly versionRe?: string;
  /** An npm package in the workspace's node_modules, run in a child process; its version is its package.json version. */
  readonly module?: string;
}

export interface RunnerRow {
  readonly id: string;
  readonly label: string;
  readonly kind: RunnerKind;
  readonly licence: string;
  readonly link: "process";
  readonly detect: RunnerDetect;
  readonly tested: { readonly version: string; readonly on: string; readonly qualifier: "measured" } | null;
  readonly network: "none" | "fetch";
  readonly keys: readonly string[];
  readonly install: string;
  readonly usedBy: readonly string[];
  readonly source: string;
}

const KINDS = new Set<RunnerKind>(["slicer", "eda", "firmware", "router", "intake"]);

export const runnersFile = (workspace: string): string => path.join(workspace, "registry", "runners.json");

/** Every way a row breaks the manifest's form, as one line each; empty when the row holds. */
export function runnerIssues(r: Partial<RunnerRow>): string[] {
  const out: string[] = [];
  const id = typeof r.id === "string" && r.id !== "" ? r.id : "(no id)";
  for (const k of ["id", "label", "licence", "install", "source"] as const) if (typeof r[k] !== "string" || r[k] === "") out.push(`${id}: ${k} is not a non-empty string`);
  if (r.kind === undefined || !KINDS.has(r.kind)) out.push(`${id}: kind ${String(r.kind)} is not one of ${[...KINDS].join(", ")}`);
  if (r.link !== "process") out.push(`${id}: link ${String(r.link)}; every runner runs as a separate process (D-043)`);
  if (r.network !== "none" && r.network !== "fetch") out.push(`${id}: network ${String(r.network)} is not none or fetch`);
  if (!Array.isArray(r.keys) || !Array.isArray(r.usedBy) || r.usedBy.length === 0) out.push(`${id}: keys and usedBy must be arrays, usedBy non-empty`);
  const d = r.detect;
  if (d === undefined || [d.app, d.command, d.module].filter((x) => x !== undefined).length !== 1) out.push(`${id}: detect names exactly one of app, command or module`);
  else if (d.command !== undefined && (d.versionArgs === undefined || d.versionRe === undefined)) out.push(`${id}: a command detect needs versionArgs and versionRe`);
  if (r.tested !== null && (r.tested === undefined || typeof r.tested.version !== "string" || r.tested.qualifier !== "measured")) out.push(`${id}: tested is null or a measured version`);
  return out;
}

/** The manifest's rows; throws with every issue when a row breaks the form or an id repeats. */
export function loadRunners(workspace: string): RunnerRow[] {
  const raw = JSON.parse(readFileSync(runnersFile(workspace), "utf8")) as { runners?: Partial<RunnerRow>[] };
  const rows = raw.runners ?? [];
  const issues = rows.flatMap((r) => runnerIssues(r));
  const ids = rows.map((r) => r.id);
  for (const id of new Set(ids)) if (ids.filter((x) => x === id).length > 1) issues.push(`${String(id)}: id repeats`);
  if (issues.length > 0) throw new Error(`registry/runners.json: ${issues.join("; ")}`);
  return rows as RunnerRow[];
}

export interface RunnerFound {
  readonly present: boolean;
  readonly at?: string;
  readonly version?: string;
}

/** Looks a runner up on this machine; a version that cannot be read is undefined, the runner still present. */
export type RunnerProbe = (r: RunnerRow, workspace: string) => RunnerFound;

const quiet = (cmd: string, args: readonly string[]): string | undefined => {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 20_000 }).trim();
  } catch {
    return undefined;
  }
};

const isFile = (p: string): boolean => existsSync(p) && statSync(p).isFile();

export const probeRunner: RunnerProbe = (r, workspace) => {
  const d = r.detect;
  if (d.module !== undefined) {
    const pj = path.join(workspace, "node_modules", d.module, "package.json");
    if (!isFile(pj)) return { present: false };
    const version = (JSON.parse(readFileSync(pj, "utf8")) as { version?: string }).version;
    return { present: true, at: path.dirname(pj), ...(version === undefined ? {} : { version }) };
  }
  if (d.app !== undefined) {
    if (!isFile(d.app)) return { present: false };
    const plist = path.resolve(path.dirname(d.app), d.plist ?? "../Info.plist");
    const version = isFile(plist) ? quiet("plutil", ["-extract", "CFBundleShortVersionString", "raw", plist]) : undefined;
    return { present: true, at: d.app, ...(version === undefined ? {} : { version }) };
  }
  const found = quiet("which", [d.command as string]) ?? (d.paths ?? []).find(isFile);
  if (found === undefined || found === "") return { present: false };
  const out = quiet(found, d.versionArgs ?? []);
  const m = out === undefined ? null : new RegExp(d.versionRe as string, "m").exec(out);
  return { present: true, at: found, ...(m?.[1] === undefined ? {} : { version: m[1] }) };
};

/** One doctor line per runner: ok at the tested version, warn at another or an unread one, not run when absent. */
export function runnerLines(rows: readonly RunnerRow[], workspace: string, probe: RunnerProbe = probeRunner): DoctorLine[] {
  return rows.map((r) => {
    const f = probe(r, workspace);
    const item = `runner ${r.id}`;
    if (!f.present) return { item, status: "not run", detail: `${r.label} not found (${r.licence}, process); install: ${r.install}` };
    if (f.version === undefined) return { item, status: "warn", detail: `${r.label} at ${f.at ?? "?"}, version not read` };
    if (r.tested === null) return { item, status: "warn", detail: `${r.label} ${f.version} at ${f.at ?? "?"}; no version measured on record` };
    if (r.tested.version !== f.version) return { item, status: "warn", detail: `${r.label} ${f.version} at ${f.at ?? "?"}; measured ${r.tested.version} on ${r.tested.on}` };
    return { item, status: "ok", detail: `${r.label} ${f.version} (measured ${r.tested.on})` };
  });
}
