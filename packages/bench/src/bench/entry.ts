/// <reference lib="dom" />
// The bench entry (M09-T07, M09-T13). createBench binds a chase through
// bench-core bindChase (M10-T06), mirrors its core into the Pinia shell
// store and returns a controller; mount puts ChaseBench in an element. A
// host app calls createBench with the page effects it wants (hook,
// globals, hash, dataset). mountBench is the baked page's call: a design's
// bench entry file calls it with its chase and bench, the bake bundles that
// file into one module script, and it turns every effect on, boots the
// manifold kernel from the classic scripts the bake wrote, and mounts on #app.
//
// The geometry build is injected (M09-T03). A fab bake carries the library
// build as a classic script (packages/pipeline createPageBuild, D-264);
// the design's bench entry hands it in through pageBench as `opts.build`
// and `opts.writers`. A page without one keeps an empty stage and the
// status names why; nothing outside the page stands in for the build.

import { createApp, type App } from "vue";
import { createPinia, type Pinia } from "pinia";
import { draftName, type Bench, type BuildWarning, type Chase, type CheckResult, type ContactFn, type Metric, type Part } from "@hackbuild/spec";
import {
  adoptBootedManifold, artSurfaces, bindChase, blockedLine, blockingChecks, bootManifold, NO_BUILD, NOT_IN_BAKE, openShare, setStorageLog, type BenchCore, type BootedManifold, type BuildOutput, type BuildResult, type ChaseBinding,
} from "@hackbuild/bench-core";
import { HB_VIEWER_TAG, type HbViewer, type ViewMesh, type ViewPart } from "@hackbuild/viewer";
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
  /** An hbf draft page: downloads take DRAFT_ and the bench shows the draft banner. */
  readonly draft?: boolean;
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
export function pageBench(page: PageBuildLike | undefined): Pick<MountOptions, "build" | "writers" | "draft"> {
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
  const file = (n: string): string => (page.draft === true ? draftName(n) : n);
  return {
    build,
    writers: {
      "3mf": writer("3mf", file(`${name}.3mf`), "model/3mf"),
      stl: writer("stl", file(`${name}-stl.zip`), "application/zip"),
      card: writer("card", file(`${name}-card.txt`), "text/plain"),
    },
    ...(page.draft === true ? { draft: true } : {}),
  };
}

/** What every bench needs, whether a host app or a baked page mounts it. */
export interface BenchOptions {
  readonly chase: Chase;
  readonly bench: Bench;
  /** The library build (pageBench); without one the stage stays empty and the status reads NO_BUILD. */
  readonly build?: BenchBuild;
  /** Export writers by kind beside json (pageBench); a declared kind with none refuses with NOT_IN_BAKE. */
  readonly writers?: Readonly<Record<string, BenchWriter>>;
  /** Mount the WebGL stage; default true. */
  readonly stage?: boolean;
  /** The ContactFn the bench's DriveDecl.contact names, from the design's build.ts; none leaves the pad unable to drive. */
  readonly contact?: ContactFn;
  /** An hbf draft page (pageBench sets it from the page build): the status strip shows the draft banner. */
  readonly draft?: boolean;
  /** The draft's one inline widget (widget.ts), drawn beside the banner; only a draft page carries one. */
  readonly widget?: DraftWidget;
}

/**
 * createBench options. Every effect on the page outside the mount element is
 * an opt-in and defaults off, so a host app can hold several benches.
 */
export interface CreateBenchOptions extends BenchOptions {
  /**
   * The Pinia the shell store mirrors the core into. A host app passes the
   * one it installs so the bench's store sits beside its own; default, the
   * controller makes its own. Two controllers that share one Pinia share
   * the shell store, so give each its own.
   */
  readonly pinia?: Pinia;
  /** Define `BENCH` on globalThis (BenchHook); default false. */
  readonly hook?: boolean;
  /**
   * Boot the manifold kernel from the classic scripts a bake wrote (the
   * manifold factory, its base64 wasm and JSZip on globalThis); default false.
   * Without it the caller passes `manifold`, or an instance already adopted
   * through adoptManifold in @hackbuild/geom is used.
   */
  readonly globals?: boolean;
  /** A manifold module the caller booted (setup() called); adopted before the first build. Ignored when `globals` is set. */
  readonly manifold?: BootedManifold;
  /** Open a share link from location.hash after boot; default false. */
  readonly hash?: boolean;
  /** Write the kernel status to html data-kernel after a kernel boot; default false. */
  readonly dataset?: boolean;
}

/** createBench options plus the page mount point, for a baked bench. */
export interface MountOptions extends BenchOptions {
  /** Mount point; default #app. */
  readonly el?: HTMLElement | null;
  /** Boot the inlined manifold kernel and set html data-kernel; default true. */
  readonly kernel?: boolean;
  /** Answer `BENCH` on globalThis; default true. The kit mounts several shells and sets it false. */
  readonly hook?: boolean;
}

/**
 * The inline widget a draft may carry (plan v9 3.2: it graduates to a
 * registered kind through hbf adopt). Framework free: model reads the
 * bench state and the last build's metrics, render draws that model into
 * the element the banner gives it and returns nothing.
 */
export interface DraftWidget {
  readonly id: string;
  model(state: Values, metrics: readonly Metric[]): Readonly<Record<string, number | string>>;
  render(el: HTMLElement, model: Readonly<Record<string, number | string>>): void;
}

export interface MountedBench {
  readonly core: BenchCore<Values, ViewPart, BenchReport>;
  readonly binding: ChaseBinding<BenchReport>;
  unmount(): void;
}

/** What BenchView hands the shell component: the options createBench read for the view. */
export interface BenchViewOptions {
  readonly stage: boolean;
  readonly draft: boolean;
  readonly widget: DraftWidget | null;
}

/** What createBench returns: the headless parts at once, the Vue shell on mount or in a BenchView. */
export interface BenchController {
  readonly core: BenchCore<Values, ViewPart, BenchReport>;
  readonly binding: ChaseBinding<BenchReport>;
  /** The Pinia the shell store mirrors the core into: the one passed to createBench or the controller's own. */
  readonly pinia: Pinia;
  /** What BenchView passes to the shell component. */
  readonly view: BenchViewOptions;
  /** Mounts the shell into `el`. Call once. */
  mount(el: HTMLElement): void;
  /**
   * Names the element that holds the shell, so an export can pause the stage
   * viewer inside it (G-46). mount(el) does this itself; BenchView calls it
   * with null on unmount.
   */
  attach(el: HTMLElement | null): void;
  /** Unmounts the shell if mounted and disposes the core; the controller is spent after it. */
  unmount(): void;
}

/** Thrown by createBench for a chase whose kind has no region map. */
export class BenchRefusal extends Error {}

/**
 * Builds a bench and returns its controller. It binds the chase and starts
 * the first build at once; nothing touches the page until mount, and the
 * hook, globals, hash and dataset effects run only when their option is set.
 */
export function createBench(opts: CreateBenchOptions): BenchController {
  const { chase, bench } = opts;
  const refused = kindError(chase.meta.kind);
  if (refused !== null) throw new BenchRefusal(refused);

  const pinia = opts.pinia ?? createPinia();
  const shell = useShell(pinia);
  let host: HTMLElement | null = null;
  let app: App | null = null;

  /** Pauses the stage's viewer for an export (G-46) and returns the resume. */
  const pause = (): (() => void) => {
    const v = host?.querySelector(HB_VIEWER_TAG) as HbViewer | null | undefined;
    if (v === null || v === undefined) return () => undefined;
    const was = v.paused;
    v.paused = true;
    return () => {
      v.paused = was;
    };
  };

  const binding: ChaseBinding<BenchReport> = bindChase<BenchReport>({
    artSurfaces,
    chase, bench, pause,
    ...(opts.build === undefined ? {} : { build: opts.build }),
    ...(opts.writers === undefined ? {} : { writers: opts.writers }),
    contact: opts.contact ?? null,
    install: opts.hook === true,
    onChange: (e) => {
      if (e === "held") shell.held = [...binding.pad.held];
      else shell.mirror(binding.core);
    },
    boot: async (b) => {
      if (opts.globals === true) {
        let status = "ready";
        try {
          if (typeof (globalThis as Record<string, unknown>)["JSZip"] !== "function") throw new Error("jszip missing from the page");
          await bootManifold(MANIFOLD_GLOBALS);
        } catch (e) {
          status = "failed";
          b.core.appendLog(`kernel failed: ${e instanceof Error ? e.message : String(e)}. reload the page.`);
        }
        if (opts.dataset === true) document.documentElement.dataset["kernel"] = status;
      } else if (opts.manifold !== undefined) {
        let status = "ready";
        try {
          adoptBootedManifold(opts.manifold);
        } catch (e) {
          status = "failed";
          b.core.appendLog(`kernel failed: ${e instanceof Error ? e.message : String(e)}. reload the page.`);
        }
        if (opts.dataset === true) document.documentElement.dataset["kernel"] = status;
      }
      if (opts.hash === true) await openShare(b.core, location.hash, b.admit);
    },
  });
  const core = binding.core;
  setStorageLog((line) => core.appendLog(line));
  void binding.whenReady.then(() => shell.mirror(core));

  const view: BenchViewOptions = {
    stage: opts.stage !== false,
    draft: opts.draft === true,
    widget: opts.draft === true && opts.widget !== undefined ? opts.widget : null,
  };

  return {
    core,
    binding,
    pinia,
    view,
    mount(el: HTMLElement): void {
      if (app !== null) throw new Error("bench is already mounted");
      host = el;
      app = createApp(ChaseBench, {
        binding, stage: view.stage, draft: view.draft,
        ...(view.widget === null ? {} : { widget: view.widget }),
      });
      app.use(pinia);
      app.mount(el);
    },
    attach(el: HTMLElement | null): void {
      if (app !== null) return;
      host = el;
    },
    unmount(): void {
      app?.unmount();
      app = null;
      host = null;
      core.dispose();
    },
  };
}

/**
 * Mounts a baked bench on the page: createBench with the hook, the manifold
 * globals, the share hash and data-kernel on, mounted on #app. Logs the
 * refusal and returns null for a kind without a region map or a missing
 * mount point.
 */
export function mountBench(opts: MountOptions): MountedBench | null {
  const refused = kindError(opts.chase.meta.kind);
  if (refused !== null) {
    console.error(refused);
    return null;
  }
  const el = opts.el === undefined ? document.getElementById("app") : opts.el;
  if (el === null) {
    console.error("bench mount point #app is missing from the page");
    return null;
  }
  const { el: _el, kernel, hook, ...rest } = opts;
  const bench = createBench({ ...rest, hook: hook !== false, globals: kernel !== false, hash: true, dataset: true });
  bench.mount(el);
  return { core: bench.core, binding: bench.binding, unmount: bench.unmount };
}
