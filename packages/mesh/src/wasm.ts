// wasm ownership for the mesh kernel (D-055), ported from COTTER `GEO.scope`
// with its POOL (cotter-src/src/geo.js lines 7 to 24) and PIP's patched
// prototypes and live count (pip-controller/src/geom.js lines 8 to 64).
//
// Every Manifold, CrossSection and ExecutionContext the kernel hands out,
// from a constructor, a static or a method, joins the pool and is owned by
// the innermost open frame. Closing a frame frees what it owns, newest
// first. This file is the only place in mesh and 3mf that calls `.delete()`.

import { loadManifold as loadSharedManifold } from "@hackbuild/geom";
import type { ErrorStatus, ExecutionContext, Manifold, ManifoldToplevel } from "manifold-3d";
import type { AbortSignalLike } from "@hackbuild/spec";
import { meshError } from "./routes/prism.js";

/** Anything backed by wasm memory that must be freed by hand. */
export interface Deletable {
  delete(): void;
}

interface Handle extends Deletable {
  isDeleted(): boolean;
}

/** One ownership level: a scope, a build, or the root for objects made outside both. */
class Frame {
  readonly owned: Handle[] = [];
  readonly parent: Frame | undefined;
  closed = false;
  constructor(parent: Frame | undefined) {
    this.parent = parent;
  }
}

const root = new Frame(undefined);
let current: Frame = root;
const pool = new Map<Handle, Frame>();

let loading: Promise<ManifoldToplevel> | undefined;
let loaded: ManifoldToplevel | undefined;
let classes: readonly (abstract new (...args: never[]) => unknown)[] = [];

function isHandle(r: unknown): r is Handle {
  return classes.some((C) => r instanceof C);
}

function adopt(obj: Handle, frame: Frame): void {
  const from = pool.get(obj);
  if (from === frame) return;
  if (from !== undefined) {
    const i = from.owned.lastIndexOf(obj);
    if (i >= 0) from.owned.splice(i, 1);
  }
  frame.owned.push(obj);
  pool.set(obj, frame);
}

/** Put a kernel result (or each element of an array result) in the current frame. */
function track<T>(r: T): T {
  if (Array.isArray(r)) {
    for (const x of r) track(x);
  } else if (isHandle(r) && !pool.has(r)) {
    adopt(r, current);
  }
  return r;
}

function release(obj: Handle): void {
  pool.delete(obj);
  if (!obj.isDeleted()) obj.delete();
}

function closeFrame(frame: Frame): void {
  for (let obj = frame.owned.pop(); obj !== undefined; obj = frame.owned.pop()) release(obj);
  frame.closed = true;
}

const SKIP = new Set(["constructor", "delete", "isDeleted", "deleteLater", "isAliasOf"]);
const STATIC_SKIP = new Set(["length", "name", "prototype", "arguments", "caller", "argCount", "reserveIDs"]);
const WRAPPED = Symbol("hbf.wrapped");

type AnyFn = ((...args: unknown[]) => unknown) & { [WRAPPED]?: true };

function wrapped(f: AnyFn): AnyFn {
  const w: AnyFn = function (this: unknown, ...args: unknown[]) {
    return track(f.apply(this, args));
  };
  w[WRAPPED] = true;
  return w;
}

// Methods starting with "_" are the embind entry points the public methods
// call; wrapping only the public names counts each result once.
function wrapPrototype(C: { prototype: object }): void {
  for (let P: object | null = C.prototype; P !== null && P !== Object.prototype; P = Object.getPrototypeOf(P) as object | null) {
    for (const k of Object.getOwnPropertyNames(P)) {
      if (SKIP.has(k) || k.startsWith("_")) continue;
      const d = Object.getOwnPropertyDescriptor(P, k);
      if (d === undefined || typeof d.value !== "function" || (d.value as AnyFn)[WRAPPED]) continue;
      (P as Record<string, unknown>)[k] = wrapped(d.value as AnyFn);
    }
  }
}

// geom shares this instance and frees its own CrossSections by hand; a handle
// deleted outside release() must leave the pool or liveCount never returns to zero.
function unpoolOnDelete(C: { prototype: object }): void {
  let P: object | null = C.prototype;
  while (P !== null && !Object.prototype.hasOwnProperty.call(P, "delete")) P = Object.getPrototypeOf(P) as object | null;
  if (P === null) return;
  const del = (P as Record<string, unknown>)["delete"] as (this: Handle) => void;
  if ((del as AnyFn)[WRAPPED]) return;
  const w: AnyFn = function (this: Handle) {
    const frame = pool.get(this);
    if (frame !== undefined) {
      const i = frame.owned.lastIndexOf(this);
      if (i >= 0) frame.owned.splice(i, 1);
      pool.delete(this);
    }
    del.call(this);
  };
  w[WRAPPED] = true;
  (P as Record<string, unknown>)["delete"] = w;
}

function wrapStatics(C: object): void {
  for (const k of Object.getOwnPropertyNames(C)) {
    if (STATIC_SKIP.has(k) || k.startsWith("_")) continue;
    const f = (C as Record<string, unknown>)[k];
    if (typeof f !== "function" || (f as AnyFn)[WRAPPED]) continue;
    (C as Record<string, unknown>)[k] = wrapped(f as AnyFn);
  }
}

/** A constructor that tracks what `new` returns; statics and instanceof pass through to the class. */
function trackingConstructor<C extends abstract new (...args: never[]) => unknown>(C: C): C {
  return new Proxy(C, {
    construct(target, args) {
      return track(Reflect.construct(target, args) as object);
    },
  });
}

interface ContextCtor {
  new (): ExecutionContext;
  prototype: ExecutionContext;
}

function install(wasm: ManifoldToplevel): void {
  const ctx = (wasm as unknown as { ExecutionContext: ContextCtor }).ExecutionContext;
  classes = [wasm.Manifold, wasm.CrossSection, ctx];
  for (const C of [wasm.Manifold, wasm.CrossSection, ctx]) {
    wrapPrototype(C);
    unpoolOnDelete(C);
    wrapStatics(C);
  }
  wasm.Manifold = trackingConstructor(wasm.Manifold);
  wasm.CrossSection = trackingConstructor(wasm.CrossSection);
  (wasm as unknown as { ExecutionContext: ContextCtor }).ExecutionContext = trackingConstructor(ctx);
}

/** Load manifold-3d once per process and patch it so every kernel object joins the pool. */
export function loadManifold(): Promise<ManifoldToplevel> {
  loading ??= loadSharedManifold().then((wasm) => {
    install(wasm);
    loaded = wasm;
    return wasm;
  });
  return loading;
}

/** The loaded kernel; throws E_KERNEL before loadManifold() has resolved. */
export function kernel(): ManifoldToplevel {
  if (loaded === undefined) {
    throw meshError({ code: "E_KERNEL", hint: "await loadManifold() before building", record: "mesh-kernel" });
  }
  return loaded;
}

/** Owned wasm objects not yet freed, process wide, count. Zero after every build. */
export function liveCount(): number {
  return pool.size;
}

function refuseHandle(value: unknown, frame: Frame): void {
  if (isHandle(value) && pool.get(value) === frame) {
    throw meshError({
      code: "E_KERNEL",
      got: "a kernel object",
      expected: "plain data, or an object passed through keep()",
      hint: "return plain data from the scope, or keep() the object it hands out",
      record: "mesh-kernel",
    });
  }
}

/**
 * Run fn, keep only the plain data it returns, and free every kernel object
 * created inside, also on throw. fn is synchronous, so nothing interleaves
 * between open and close.
 */
export function scope<T>(fn: () => T): T {
  const frame = new Frame(current);
  current = frame;
  let value: T;
  try {
    value = fn();
    refuseHandle(value, frame);
  } finally {
    current = frame.parent ?? root;
    closeFrame(frame);
  }
  return value;
}

/** Hand one object out of the innermost frame to its parent; at the outermost scope it waits for free(). */
export function keep<T extends Deletable>(obj: T): T {
  if (!isHandle(obj)) return obj;
  const owner = pool.get(obj) ?? current;
  adopt(obj, owner.parent ?? root);
  return obj;
}

/** Free one object now, wherever it is owned. */
export function free(obj: Deletable): void {
  if (!isHandle(obj)) return;
  const owner = pool.get(obj);
  if (owner !== undefined) {
    const i = owner.owned.lastIndexOf(obj);
    if (i >= 0) owner.owned.splice(i, 1);
  }
  release(obj);
}

/**
 * Handle form of a frame, for code that passes ownership explicitly
 * (the M-S routes). own() moves an object into this scope.
 */
const frames = new WeakMap<Scope, Frame>();

function frameOf(s: Scope): Frame {
  const f = frames.get(s);
  if (f === undefined) throw meshError({ code: "E_KERNEL", hint: "open scopes with withScope(); a Scope made by hand owns nothing", record: "mesh-kernel" });
  return f;
}

export class Scope {
  /** Take ownership of a kernel object; it is freed when the scope closes. */
  own<T extends Deletable>(obj: T): T {
    const frame = frameOf(this);
    if (frame.closed) {
      if (isHandle(obj)) free(obj);
      throw meshError({ code: "E_KERNEL", hint: "open a new scope for this build; this one is closed", record: "mesh-kernel" });
    }
    if (isHandle(obj)) adopt(obj, frame);
    return obj;
  }

  /** Free every owned object, newest first. */
  close(): void {
    closeFrame(frameOf(this));
  }
}

/** scope() with the frame passed in as a Scope handle. */
export function withScope<T>(fn: (scope: Scope) => T): T {
  const frame = new Frame(current);
  current = frame;
  let value: T;
  try {
    const handle = new Scope();
    frames.set(handle, frame);
    value = fn(handle);
    refuseHandle(value, frame);
  } finally {
    current = frame.parent ?? root;
    closeFrame(frame);
  }
  return value;
}

/** How a build ended. A cancelled build returns no value and owns nothing. */
export type BuildOutcome<T> = { readonly status: "done"; readonly value: T } | { readonly status: "cancelled" };

/** What a running build sees. Kernel work happens inside step(). */
export interface BuildHandle {
  /** The manifold ExecutionContext this build carries (C-11). */
  readonly ctx: ExecutionContext;
  /** True once a newer build or the signal cancelled this one. */
  readonly cancelled: boolean;
  /** Run fn synchronously with this build as the owner of what it creates; stops when cancelled. */
  step<R>(fn: () => R): R;
  /** Evaluate a deferred CSG tree under the context; stops when cancelled. */
  evaluate(solid: Manifold): ErrorStatus;
}

const CANCELLED = Symbol("hbf.cancelled");

/**
 * One build at a time per runner: starting a build cancels the one before
 * it, which resolves as cancelled. Every object either build created is
 * freed when it settles, so the live count returns to its value before.
 */
export class BuildRunner {
  #running: ExecutionContext | undefined;

  /** Cancel the running build, if any. */
  cancel(): void {
    this.#running?.cancel();
  }

  async run<T>(fn: (build: BuildHandle) => Promise<T> | T, opts: { readonly signal?: AbortSignalLike } = {}): Promise<BuildOutcome<T>> {
    const wasm = await loadManifold();
    this.cancel();
    const frame = new Frame(root);
    const prev = current;
    current = frame;
    let ctx: ExecutionContext;
    try {
      ctx = new (wasm as unknown as { ExecutionContext: ContextCtor }).ExecutionContext();
    } finally {
      current = prev;
    }
    this.#running = ctx;
    const stopped = (): boolean => ctx.cancelled() || opts.signal?.aborted === true;
    const halt = (): void => {
      if (opts.signal?.aborted === true) ctx.cancel();
      if (ctx.cancelled()) throw CANCELLED;
    };
    const handle: BuildHandle = {
      ctx,
      get cancelled() {
        return stopped();
      },
      step<R>(stepFn: () => R): R {
        halt();
        const outer = current;
        current = frame;
        try {
          return stepFn();
        } finally {
          current = outer;
        }
      },
      evaluate(solid: Manifold): ErrorStatus {
        if (opts.signal?.aborted === true) ctx.cancel();
        // No halt() first: the context reports a cancel through status() itself.
        const outer = current;
        current = frame;
        let status: ErrorStatus;
        try {
          status = solid.withContext(ctx).status();
        } finally {
          current = outer;
        }
        if (status === "Cancelled") throw CANCELLED;
        halt();
        return status;
      },
    };
    try {
      const value = await fn(handle);
      if (stopped()) return { status: "cancelled" };
      refuseHandle(value, frame);
      return { status: "done", value };
    } catch (e) {
      if (e === CANCELLED || stopped()) return { status: "cancelled" };
      throw e;
    } finally {
      if (this.#running === ctx) this.#running = undefined;
      closeFrame(frame);
    }
  }
}
