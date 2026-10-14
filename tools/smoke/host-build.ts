// Puts the node flex-pair build host (flex-pair-host.mjs) behind a page as
// `hbfHostBuild`, the build the ui bench entry takes when a page carries
// none (packages/ui/src/bench/entry.ts). The host runs the library build
// and every check per commit, so a smoke drives real Part IR and meshes.

import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

interface Mesh { positions: number[]; triangles: number[] }
interface Reply { id: number; ok: boolean; error?: string; part?: { metrics?: unknown[] }; meshes?: Record<string, Mesh>; results?: unknown[]; buildHash?: string }

export interface Host {
  build(state: unknown): Promise<unknown>;
  close(): void;
}

export async function startHost(): Promise<Host> {
  const child: ChildProcess = spawn(process.execPath, [path.join(ROOT, "tools/smoke/flex-pair-host.mjs")], { cwd: ROOT, stdio: ["pipe", "pipe", "inherit"] });
  const rl = readline.createInterface({ input: child.stdout! });
  const waiting = new Map<number, (r: Reply) => void>();
  let ready: () => void = () => undefined;
  const up = new Promise<void>((r) => (ready = r));
  rl.on("line", (line) => {
    const msg = JSON.parse(line) as Reply & { ready?: boolean };
    if (msg.ready === true) return ready();
    waiting.get(msg.id)?.(msg);
    waiting.delete(msg.id);
  });
  await up;
  let id = 0;
  const ask = (req: Record<string, unknown>): Promise<Reply> => {
    id += 1;
    const n = id;
    return new Promise((r) => {
      waiting.set(n, r);
      child.stdin!.write(`${JSON.stringify({ id: n, ...req })}\n`);
    });
  };
  return {
    async build(state) {
      const r = await ask({ params: state, checks: true });
      if (!r.ok) throw new Error(r.error ?? "host build failed");
      const meshes = r.meshes ?? {};
      let tris = 0;
      const lo = [Infinity, Infinity, Infinity];
      const hi = [-Infinity, -Infinity, -Infinity];
      for (const m of Object.values(meshes)) {
        tris += m.triangles.length / 3;
        for (let i = 0; i < m.positions.length; i += 1) {
          const a = i % 3;
          const v = m.positions[i] as number;
          if (v < (lo[a] as number)) lo[a] = v;
          if (v > (hi[a] as number)) hi[a] = v;
        }
      }
      const dims = tris === 0 ? null : lo.map((v, a) => (hi[a] as number) - v);
      return {
        part: { part: r.part, meshes },
        report: { results: r.results ?? [], metrics: r.part?.metrics ?? [], envelope: null, tris, dims, fitsBed: null },
        buildHash: r.buildHash,
      };
    },
    close() {
      child.kill();
    },
  };
}

/** Exposes the host build before the page's scripts run. */
export async function useHostBuild(page: Page, host: Host): Promise<void> {
  await page.exposeFunction("hbfHostBuild", (state: unknown) => host.build(state));
}
