// hbf doctor (utility verb, M00-T13 step 12): the toolchain a build and the
// validators need, each line ok, warn, fail or not run. Exit 0 with no
// fail. A check that could not run says so and never counts as ok (D-153).

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { sourceDateEpoch } from "../epoch.js";
import { oneLine } from "../text/safe.js";

export type DoctorStatus = "ok" | "warn" | "fail" | "not run";

export interface DoctorLine {
  readonly item: string;
  readonly status: DoctorStatus;
  readonly detail: string;
}

/** The uv install line of M-1-T01 step 0. */
export const UV_INSTALL = "brew install uv";

const readJson = (file: string): Record<string, unknown> => JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;

/** Whether a version satisfies `^a.b.c || >=x.y.z`, the only range forms the engines field uses. */
export function satisfies(version: string, range: string): boolean {
  const v = version.replace(/^v/, "").split(".").map(Number);
  const cmp = (w: number[]): number => {
    for (let i = 0; i < 3; i += 1) if ((v[i] ?? 0) !== (w[i] ?? 0)) return (v[i] ?? 0) - (w[i] ?? 0);
    return 0;
  };
  return range.split("||").map((r) => r.trim()).some((r) => {
    const w = r.replace(/^(\^|>=)/, "").split(".").map(Number);
    if (r.startsWith("^")) return v[0] === w[0] && cmp(w) >= 0;
    if (r.startsWith(">=")) return cmp(w) >= 0;
    return cmp(w) === 0;
  });
}

function run(cmd: string, args: readonly string[], cwd: string, timeout = 120_000): string | undefined {
  try {
    return execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout }).trim();
  } catch {
    return undefined;
  }
}

/** Python modules tools/py declares; lib3mf has no linux aarch64 wheel (D-153 marker). */
const PY_PROBE = [
  "import importlib.metadata as m, platform",
  "out = []",
  "for n in ['numpy', 'trimesh', 'shapely', 'manifold3d', 'pytest']:",
  "    out.append(n + ' ' + m.version(n))",
  "try:",
  "    import lib3mf",
  "    out.append('lib3mf ' + m.version('lib3mf'))",
  "except ImportError:",
  "    out.append('lib3mf absent on ' + platform.system().lower() + ' ' + platform.machine())",
  "print('; '.join(out))",
].join("\n");

export function doctor(workspace: string, board: BoardDoctor = boardDoctor(workspace)): DoctorLine[] {
  const lines: DoctorLine[] = [];
  const pj = readJson(path.join(workspace, "package.json"));
  const engines = ((pj["engines"] as Record<string, string> | undefined) ?? {})["node"] ?? "";
  const nvmrc = existsSync(path.join(workspace, ".nvmrc")) ? readFileSync(path.join(workspace, ".nvmrc"), "utf8").trim() : "";
  const node = process.versions.node;
  const inRange = engines !== "" && satisfies(node, engines);
  lines.push({
    item: "node", status: !inRange ? "fail" : nvmrc !== "" && nvmrc !== node ? "warn" : "ok",
    detail: `${node}, engines ${engines}, .nvmrc ${nvmrc === "" ? "absent" : nvmrc}`,
  });

  const meshPj = readJson(path.join(workspace, "packages", "mesh", "package.json"));
  const pin = ((meshPj["dependencies"] as Record<string, string> | undefined) ?? {})["manifold-3d"];
  const mf = path.join(workspace, "node_modules", "manifold-3d", "package.json");
  const installed = existsSync(mf) ? String(readJson(mf)["version"]) : undefined;
  lines.push({
    item: "manifold-3d", status: installed === undefined ? "fail" : installed === pin ? "ok" : "fail",
    detail: installed === undefined ? `not installed; run npm ci (pin ${pin ?? "unknown"})` : `${installed}, pin ${pin ?? "unknown"}`,
  });

  const uv = run("uv", ["--version"], workspace, 10_000);
  lines.push({ item: "uv", status: uv === undefined ? "fail" : "ok", detail: uv ?? `not on PATH; install it with ${UV_INSTALL}` });
  if (uv === undefined) {
    lines.push({ item: "python modules", status: "not run", detail: "uv is absent" });
  } else {
    const py = run("uv", ["run", "--project", "tools/py", "python", "-c", PY_PROBE], workspace);
    const lib3mfAbsent = py?.includes("lib3mf absent") ?? false;
    const aarch64Linux = py?.includes("lib3mf absent on linux aarch64") ?? false;
    lines.push({
      item: "python modules", status: py === undefined ? "fail" : lib3mfAbsent && !aarch64Linux ? "fail" : "ok",
      detail: py === undefined ? "uv run --project tools/py failed; run uv sync --project tools/py" : py,
    });
    if (aarch64Linux) lines.push({ item: "lib3mf", status: "not run", detail: "2.5.0 ships no linux aarch64 wheel; the validator reports its lib3mf rule not run" });
  }

  try {
    const e = sourceDateEpoch(workspace);
    lines.push({ item: "SOURCE_DATE_EPOCH", status: "ok", detail: `${e.value} s from ${e.source}` });
  } catch (err) {
    lines.push({ item: "SOURCE_DATE_EPOCH", status: "fail", detail: err instanceof Error ? err.message : String(err) });
  }

  const probe = path.join(workspace, ".hbf", `doctor-${process.pid}.probe`);
  try {
    mkdirSync(path.dirname(probe), { recursive: true });
    writeFileSync(probe, "");
    rmSync(probe);
    lines.push({ item: ".hbf", status: "ok", detail: `${path.join(workspace, ".hbf")} writable` });
  } catch {
    lines.push({ item: ".hbf", status: "fail", detail: `${path.join(workspace, ".hbf")} not writable` });
  }

  const hooks = run("git", ["config", "core.hooksPath"], workspace, 10_000);
  lines.push({
    item: "core.hooksPath", status: hooks === ".githooks" ? "ok" : "fail",
    detail: hooks === undefined ? "unset; run npm install, whose prepare script sets it" : hooks,
  });
  lines.push(...boardLines(board));
  return lines;
}

/** One board dependency pin (M08-T01 step 6): the exact pin, what node_modules holds, and why it is absent. */
export interface BoardPin {
  readonly name: string;
  readonly pin: string;
  readonly installed: string | null;
  /** Set when the pin is recorded and not installed; the reason comes from packages/board/package.json. */
  readonly blocked?: string;
}

/** The board section of hbf doctor --json, under result.board. */
export interface BoardDoctor {
  readonly pins: readonly BoardPin[];
  /** Root package.json overrides as "package > dependency version", the record of packages that declare no TypeScript 7 support. */
  readonly overrides: readonly string[];
  /** tools/py/pyproject.toml exact pins against the uv environment; null when uv did not run. */
  readonly python: readonly { readonly name: string; readonly pin: string; readonly installed: string | null }[] | null;
}

const EXACT = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?$/;

function installedVersion(workspace: string, name: string): string | null {
  for (const dir of [path.join(workspace, "packages", "board", "node_modules"), path.join(workspace, "node_modules")]) {
    const f = path.join(dir, name, "package.json");
    if (existsSync(f)) return String(readJson(f)["version"]);
  }
  return null;
}

/** The pins are read from packages/board/package.json: dependencies, and hbf.pinsBlocked for pins npm cannot install yet. */
export function boardDoctor(workspace: string): BoardDoctor {
  const pj = readJson(path.join(workspace, "packages", "board", "package.json"));
  const deps = (pj["dependencies"] as Record<string, string> | undefined) ?? {};
  const hbf = (pj["hbf"] as { pinsBlocked?: Record<string, string>; blockedBy?: string } | undefined) ?? {};
  const pins: BoardPin[] = [];
  for (const [name, pin] of Object.entries(deps)) {
    if (name.startsWith("@hackbuild/")) continue;
    pins.push({ name, pin, installed: installedVersion(workspace, name) });
  }
  for (const [name, pin] of Object.entries(hbf.pinsBlocked ?? {})) {
    pins.push({ name, pin, installed: installedVersion(workspace, name), blocked: hbf.blockedBy ?? "no reason recorded" });
  }
  pins.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const root = readJson(path.join(workspace, "package.json"));
  const overrides: string[] = [];
  for (const [pkg, v] of Object.entries((root["overrides"] as Record<string, unknown> | undefined) ?? {})) {
    if (typeof v === "string") overrides.push(`${pkg} ${v}`);
    else for (const [dep, ver] of Object.entries(v as Record<string, string>)) overrides.push(`${pkg} > ${dep} ${ver}`);
  }
  const pyproject = readFileSync(path.join(workspace, "tools", "py", "pyproject.toml"), "utf8");
  const declared = [...pyproject.matchAll(/^\s*"([A-Za-z0-9_.-]+)==([^";\s]+)/gm)].map((m) => ({ name: m[1] ?? "", pin: m[2] ?? "" }));
  const probe = ["import importlib.metadata as m, json, sys", "out = {}", "for n in sys.argv[1:]:", "    try: out[n] = m.version(n)", "    except m.PackageNotFoundError: out[n] = None", "print(json.dumps(out))"].join("\n");
  const raw = run("uv", ["run", "--project", "tools/py", "python", "-c", probe, ...declared.map((d) => d.name)], workspace);
  let python: BoardDoctor["python"] = null;
  if (raw !== undefined) {
    const got = JSON.parse(raw.split("\n").pop() ?? "{}") as Record<string, string | null>;
    python = declared.map((d) => ({ ...d, installed: got[d.name] ?? null }));
  }
  return { pins, overrides, python };
}

function boardLines(b: BoardDoctor): DoctorLine[] {
  const live = b.pins.filter((p) => p.blocked === undefined);
  const blocked = b.pins.filter((p) => p.blocked !== undefined);
  const bad = live.filter((p) => !EXACT.test(p.pin) || p.installed !== p.pin);
  const out: DoctorLine[] = [{
    item: "board pins", status: bad.length > 0 ? "fail" : "ok",
    detail: live.map((p) => `${p.name} ${p.installed ?? "absent"}${p.installed === p.pin ? "" : ` (pin ${p.pin})`}`).join("; "),
  }];
  if (blocked.length > 0) {
    out.push({ item: "board blocked", status: "warn", detail: `${blocked.map((p) => `${p.name} ${p.pin}`).join("; ")}: ${blocked[0]?.blocked ?? ""}` });
  }
  out.push({ item: "board overrides", status: "ok", detail: b.overrides.length === 0 ? "none" : b.overrides.join("; ") });
  if (b.python === null) out.push({ item: "python pins", status: "not run", detail: "uv run --project tools/py failed or uv is absent" });
  else {
    const off = b.python.filter((p) => p.installed !== p.pin);
    out.push({
      item: "python pins", status: off.length > 0 ? "fail" : "ok",
      detail: b.python.map((p) => `${p.name} ${p.installed ?? "absent"}${p.installed === p.pin ? "" : ` (pin ${p.pin})`}`).join("; "),
    });
  }
  return out;
}

export function renderDoctor(lines: readonly DoctorLine[]): string {
  return lines.map((l) => oneLine(`${l.status.padEnd(8)}${l.item.padEnd(19)}${l.detail}`)).join("\n");
}
