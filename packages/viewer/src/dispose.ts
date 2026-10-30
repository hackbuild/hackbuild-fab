// Ownership of three objects (D-055): every geometry, material and texture
// the viewer creates is registered with one owner scope and freed by it. The
// live count is what the viewer smoke reads; after any number of rebuilds it
// returns to the count the first build left.

/** Anything three frees with dispose(): BufferGeometry, Material, Texture. */
export interface Disposable {
  dispose(): void;
}

export interface Owner {
  /** Objects created and not yet freed, count. */
  readonly live: number;
  /** Registers `o` and returns it. Registering twice counts once. */
  track<T extends Disposable>(o: T): T;
  /** Frees `o` when this owner holds it; a second release is a no-op. */
  release(o: Disposable): void;
  /** Frees everything still held. */
  releaseAll(): void;
}

export function createOwner(): Owner {
  const held = new Set<Disposable>();
  return {
    get live() {
      return held.size;
    },
    track(o) {
      held.add(o);
      return o;
    },
    release(o) {
      if (!held.delete(o)) return;
      o.dispose();
    },
    releaseAll() {
      for (const o of [...held]) {
        held.delete(o);
        o.dispose();
      }
    },
  };
}
