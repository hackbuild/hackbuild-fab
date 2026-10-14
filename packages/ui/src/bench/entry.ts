/// <reference lib="dom" />
// The ui bench entry (M09-T07, M09-T13). A design's bench entry file calls
// mountBench with its chase and bench; the bake bundles that file into one
// module script. mountBench boots the manifold kernel from the classic
// scripts the bake wrote, creates the ui-core bench core, mirrors it into
// the Pinia shell store, mounts BenchShell and answers `BENCH`.
//
// The geometry build is injected (M09-T03). A bake carries none until the
// library build runs in a page; a smoke injects the node build host as
// `globalThis.hbfHostBuild` (tools/smoke/flex-pair-host.mjs). Without one
// the stage stays empty and the status names why.

import { createApp } from "vue";
import { createPinia } from "pinia";
import type { Bench, Chase, ContactFn, DriveReadoutRecord, DriveStimulus } from "@hackbuild/spec";
import {
  admitDesign, bootManifold, createBenchCore, createHook, createPad, createWelcome, currentOnly, FREE_EXPORTS, HB_VIEWER_TAG,
  installHook, openShare, setStorageLog,
  type AdmitOptions, type BenchCore, type BuildOutput, type HbViewer, type HookExport, type ViewPart,
} from "@hackbuild/ui-core";
import BenchShell from "./BenchShell.vue";
import { kindError } from "./kinds.js";
import { defaultsOf } from "../rail/model.js";
import { useShell, type BenchReport, type Values } from "../stores/shell.js";
import { padOf } from "../stage/pad.js";

/** Names the bake manifest gives the classic manifold factory and its wasm. */
export const MANIFOLD_GLOBALS = { factory: "ManifoldModule", wasm: "MANIFOLD_WASM_B64" } as const;

export type BenchBuild = (state: Values) => Promise<BuildOutput<ViewPart, BenchReport>>;

/** The status line while a page has no geometry build. */
export const NO_BUILD = "this bake carries no geometry build yet. the rail, undo and design files work; the stage stays empty.";

export interface MountOptions {
  readonly chase: Chase;
  readonly bench: Bench;
  /** The library build; default the host build a smoke injects, else none. */
  readonly build?: BenchBuild;
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
  unmount(): void;
}

function injected(): BenchBuild | undefined {
  const f = (globalThis as Record<string, unknown>)["hbfHostBuild"];
  return typeof f === "function" ? (f as BenchBuild) : undefined;
}

const noBuild: BenchBuild = async () => {
  throw new Error(NO_BUILD);
};

/** Export kinds this page writes, and the writer of each. The others the chase declares refuse with NOT_IN_BAKE. */
type Writers = Readonly<Record<string, (core: BenchCore<Values, ViewPart, BenchReport>) => string>>;
const WRITERS: Writers = { json: (core) => core.designJson() };
const MEDIA: Readonly<Record<string, string>> = { json: "application/json" };
export const NOT_IN_BAKE = (kind: string): string => `${kind} export is not in this bake yet`;

function download(name: string, b64: string, media: string): void {
  const a = document.createElement("a");
  a.href = `data:${media};base64,${b64}`;
  a.download = name;
  a.click();
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

  const defaults = defaultsOf(chase.params);
  const pinia = createPinia();
  const shell = useShell(pinia);
  const core = createBenchCore<Values, ViewPart, BenchReport>({
    app: chase.meta.id,
    v: chase.meta.chase,
    blank: () => structuredClone(defaults),
    build: opts.build ?? injected() ?? noBuild,
    ...(bench.build === undefined ? {} : { slowMs: bench.build.slowMs }),
    onChange: () => shell.mirror(core),
  });
  setStorageLog((line) => core.appendLog(line));
  const welcome = createWelcome(chase.meta.id, (open) => {
    shell.welcomeOpen = open;
  });
  shell.welcomeOpen = welcome.open;
  shell.mirror(core);
  const contact = opts.contact ?? null;
  const pad = createPad(() => {
    shell.held = [...pad.held];
  });

  const admit: AdmitOptions = {
    migrate: currentOnly(chase.meta.chase),
    validate: (d) => (d !== null && typeof d === "object" && "state" in d ? null : "no state"),
  };

  function open(text: string): void {
    const got = admitDesign(text, admit);
    if (!got.ok) {
      core.appendLog(`design file not opened: ${got.error.record ?? "design"}, ${got.error.hint}`);
      return;
    }
    core.loadDesign(JSON.stringify(got.design));
  }

  function start(id: string): void {
    const preset = chase.presets?.find((p) => p.id === id);
    if (preset === undefined) core.reset();
    else core.loadPreset((fresh) => ({ ...fresh, ...structuredClone(preset.params) }));
  }

  // One export path: the export button and BENCH.exportBytes both run the hook's gate.
  const exports: HookExport<ViewPart, BenchReport>[] = chase.exports.map((x) => {
    const writer = WRITERS[x.kind];
    return {
      kind: x.kind,
      fabrication: !FREE_EXPORTS.includes(x.kind),
      write: () => {
        if (writer === undefined) throw new Error(NOT_IN_BAKE(x.kind));
        return writer(core);
      },
    };
  });
  const writable = chase.exports.map((x) => x.kind).filter((k) => WRITERS[k] !== undefined);
  const fabrication = exports.filter((x) => x.fabrication).map((x) => x.kind);

  function exportKind(kind: string): void {
    hooked.hook.exportBytes(kind).then(
      (b64) => download(`${chase.meta.id}.${kind}`, b64, MEDIA[kind] ?? "application/octet-stream"),
      (e: unknown) => core.appendLog(e instanceof Error ? e.message : String(e)),
    );
  }

  const app = createApp(BenchShell, {
    chase, bench, core, welcome, contact, pad, writable, fabrication, stage: opts.stage !== false, onOpen: open, onStart: start, onExport: exportKind,
  });
  app.use(pinia);
  app.mount(el);

  /**
   * Holds or releases a drive target and resolves with its read on the
   * current build (spec/hook.ts drive): the same pad model and held set
   * the overlay shows. Rejects for a target the build lacks or cannot read.
   */
  const drive = async (target: string, value: DriveStimulus): Promise<DriveReadoutRecord> => {
    await core.ensureMesh();
    const model = padOf(chase, bench, contact, { part: core.result?.part ?? null, report: core.result?.report ?? {} });
    if (model === null) throw new Error("this bench declares no drive pad");
    if (model.problem !== null) throw new Error(model.problem);
    const t = model.targets.find((x) => x.target === target);
    if (t === undefined) throw new Error(`no drive target ${target}; targets are ${model.targets.map((x) => x.target).join(", ")}`);
    if (t.read === null) throw new Error(t.missing ?? `${target} has no read`);
    pad.drive(target, value);
    const { waitFrom: _from, ...record } = t.read;
    return record;
  };

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

  /** BENCH.model: the built part and meshes (PIP `MODEL`), with the build's metrics on top, where drive targets are read, and its check results (G-18 reads CHK-PRT-16 there). */
  const models = new WeakMap<object, unknown>();
  const model = (r: { readonly part: ViewPart; readonly report: BenchReport }): unknown => {
    let m = models.get(r);
    if (m === undefined) {
      m = { ...r.part, metrics: r.report.metrics ?? [], report: { results: r.report.results ?? [] } };
      models.set(r, m);
    }
    return m;
  };

  const hookOptions = {
    exports,
    params: chase.params,
    checks: (r: { readonly report: BenchReport }) => r.report.results ?? [],
    model,
    drive,
    release: async (target?: string): Promise<void> => pad.release(target),
    pause,
    boot: boot(),
  };
  // The kit mounts several shells; each keeps a hook off globalThis.
  const hooked = opts.hook === false ? createHook(core, hookOptions) : installHook(core, hookOptions);
  void hooked.whenReady.then(() => shell.mirror(core));

  async function boot(): Promise<void> {
    if (opts.kernel !== false) {
      let status = "ready";
      try {
        if (typeof (globalThis as Record<string, unknown>)["JSZip"] !== "function") throw new Error("jszip missing from the page");
        await bootManifold(MANIFOLD_GLOBALS);
      } catch (e) {
        status = "failed";
        core.appendLog(`kernel failed: ${e instanceof Error ? e.message : String(e)}. reload the page.`);
      }
      document.documentElement.dataset["kernel"] = status;
    }
    await openShare(core, location.hash, admit);
  }

  return {
    core,
    unmount(): void {
      app.unmount();
      core.dispose();
    },
  };
}
