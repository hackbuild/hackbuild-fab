/// <reference lib="dom" />
// The ui bench entry (M09-T07, M09-T13). A design's bench entry file calls
// mountBench with its chase and bench; the bake bundles that file into one
// module script. mountBench binds the chase through ui-core bindChase
// (M10-T06), mirrors its core into the Pinia shell store, mounts it as
// ChaseBench, boots the manifold kernel from the classic scripts the bake
// wrote, and answers `BENCH`.
//
// The geometry build is injected (M09-T03). A fab bake carries the library
// build as a classic script (packages/pipeline createPageBuild, D-264);
// the design's bench entry hands it in through pageBench as `opts.build`
// and `opts.writers`. A page without one keeps an empty stage and the
// status names why; nothing outside the page stands in for the build.

import { createApp } from "vue";
import { createPinia } from "pinia";
import type { Bench, BuildWarning, Chase, CheckResult, ContactFn, Metric, Part } from "@hackbuild/spec";
import {
  bindChase, blockedLine, blockingChecks, bootManifold, HB_VIEWER_TAG, NO_BUILD, NOT_IN_BAKE, openShare, setStorageLog,
  type BenchCore, type BuildOutput, type BuildResult, type ChaseBinding, type HbViewer, type ViewMesh, type ViewPart,
} from "@hackbuild/ui-core";
import ChaseBench from "./ChaseBench.vue";
import { kindError } from "./kinds.js";
import { useShell, type BenchReport, type Values } from "../stores/shell.js";

export { NO_BUILD, NOT_IN_BAKE };

/** Names the bake manifest gives the classic manifold factory and its wasm. */
export const MANIFOLD_GLOBALS = { factory: "ManifoldModule", wasm: "MANIFOLD_WASM_B64" } as const;

export type BenchBuild = (state: Values) => Promise<BuildOutput<ViewPart, BenchReport>>;

/** One export a page writes from a build, beside the design json the bench writes itself. */
export interface BenchWriter {
  /** The file name a download takes. */
  readonly file: string;
  readonly media: string;
  /** The bytes, and the checks run on them; a blocking fail among them refuses the export. */
  write(result: BuildResult<ViewPart, BenchReport>): Promise<{ readonly bytes: Uint8Array | string; readonly results: readonly CheckResult[] }>;
}

/** What a page build gives a bench (packages/pipeline PageBuild, named by shape so ui imports no tier 2 build). */
export interface PageBuildLike {
  readonly facts: { readonly name: string };
  build(values: Values): Promise<{
    readonly buildHash: string; readonly part: Part; readonly meshes: Readonly<Record<string, ViewMesh>>;
    readonly metrics: readonly Metric[]; readonly results: readonly CheckResult[]; readonly warnings: readonly BuildWarning[];
  }>;
  exportFile(kind: "3mf" | "stl" | "card", buildHash: string): Promise<{ readonly name: string; readonly media: string; readonly bytes: Uint8Array | string; readonly results: readonly CheckResult[] }>;
}

/** Triangle count and bounding box size of a build's meshes, computed. */
function sizeOf(meshes: Readonly<Record<string, ViewMesh>>): { readonly tris: number; readonly dims: readonly [number, number, number] | null } {
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
  return { tris, dims: tris === 0 ? null : [(hi[0] as number) - (lo[0] as number), (hi[1] as number) - (lo[1] as number), (hi[2] as number) - (lo[2] as number)] };
}

/** The page build a bake wrote on `global` (bake.json `build.global`), or none. */
export function pageOf(global: string): PageBuildLike | undefined {
  const ns = (globalThis as Record<string, unknown>)[global] as { page?: PageBuildLike } | undefined;
  return ns?.page;
}

/**
 * The bench build and writers of a page build: each build is the library
 * build and every check, and 3mf, stl and card write from the build the
 * export runs on. A 3mf whose package checks hold a blocking fail is
 * refused with the export gate's line (D-264).
 */
export function pageBench(page: PageBuildLike | undefined): Pick<MountOptions, "build" | "writers"> {
  if (page === undefined) return {};
  const build: BenchBuild = async (state) => {
    const r = await page.build(state);
    return {
      part: { part: r.part, meshes: r.meshes },
      report: { results: r.results, metrics: r.metrics, envelope: null, ...sizeOf(r.meshes), fitsBed: null },
      buildHash: r.buildHash,
      warnings: r.warnings,
    };
  };
  const writer = (kind: "3mf" | "stl" | "card", file: string, media: string): BenchWriter => ({
    file, media,
    write: async (result) => {
      const out = await page.exportFile(kind, result.buildHash);
      const failing = blockingChecks(out.results);
      if (failing.length > 0) throw new Error(blockedLine(kind, failing));
      return out;
    },
  });
  const name = page.facts.name;
  return {
    build,
    writers: {
      "3mf": writer("3mf", `${name}.3mf`, "model/3mf"),
      stl: writer("stl", `${name}-stl.zip`, "application/zip"),
      card: writer("card", `${name}-card.txt`, "text/plain"),
    },
  };
}

export interface MountOptions {
  readonly chase: Chase;
  readonly bench: Bench;
  /** The library build (pageBench); without one the stage stays empty and the status reads NO_BUILD. */
  readonly build?: BenchBuild;
  /** Export writers by kind beside json (pageBench); a declared kind with none refuses with NOT_IN_BAKE. */
  readonly writers?: Readonly<Record<string, BenchWriter>>;
  /** Mount point; default #app. */
  readonly el?: HTMLElement | null;
  /** Boot the inlined manifold kernel and set html data-kernel; default true. */
  readonly kernel?: boolean;
  /** Mount the WebGL stage; default true. */
  readonly stage?: boolean;
  /** Answer `BENCH` on globalThis; default true. The kit mounts several shells and sets it false. */
  readonly hook?: boolean;
  /** The ContactFn the bench's DriveDecl.contact names, from the design's build.ts; none leaves the pad unable to drive. */
  readonly contact?: ContactFn;
}

export interface MountedBench {
  readonly core: BenchCore<Values, ViewPart, BenchReport>;
  readonly binding: ChaseBinding<BenchReport>;
  unmount(): void;
}

/** Mounts the bench, or logs the refusal and returns null for a kind without a region map. */
export function mountBench(opts: MountOptions): MountedBench | null {
  const { chase, bench } = opts;
  const refused = kindError(chase.meta.kind);
  if (refused !== null) {
    console.error(refused);
    return null;
  }
  const el = opts.el === undefined ? document.getElementById("app") : opts.el;
  if (el === null) {
    console.error("bench mount point #app is missing from the page");
    return null;
  }

  const pinia = createPinia();
  const shell = useShell(pinia);

  /** Pauses the stage's viewer for an export (G-46) and returns the resume. */
  const pause = (): (() => void) => {
    const v = el.querySelector(HB_VIEWER_TAG) as HbViewer | null;
    if (v === null) return () => undefined;
    const was = v.paused;
    v.paused = true;
    return () => {
      v.paused = was;
    };
  };

  const binding: ChaseBinding<BenchReport> = bindChase<BenchReport>({
    chase, bench, pause,
    ...(opts.build === undefined ? {} : { build: opts.build }),
    ...(opts.writers === undefined ? {} : { writers: opts.writers }),
    contact: opts.contact ?? null,
    // The kit mounts several shells; each keeps a hook off globalThis.
    install: opts.hook !== false,
    onChange: (e) => {
      if (e === "held") shell.held = [...binding.pad.held];
      else shell.mirror(binding.core);
    },
    boot: async (b) => {
      if (opts.kernel !== false) {
        let status = "ready";
        try {
          if (typeof (globalThis as Record<string, unknown>)["JSZip"] !== "function") throw new Error("jszip missing from the page");
          await bootManifold(MANIFOLD_GLOBALS);
        } catch (e) {
          status = "failed";
          b.core.appendLog(`kernel failed: ${e instanceof Error ? e.message : String(e)}. reload the page.`);
        }
        document.documentElement.dataset["kernel"] = status;
      }
      await openShare(b.core, location.hash, b.admit);
    },
  });
  const core = binding.core;
  setStorageLog((line) => core.appendLog(line));
  void binding.whenReady.then(() => shell.mirror(core));

  const app = createApp(ChaseBench, { binding, stage: opts.stage !== false });
  app.use(pinia);
  app.mount(el);

  return {
    core,
    binding,
    unmount(): void {
      app.unmount();
      core.dispose();
    },
  };
}
