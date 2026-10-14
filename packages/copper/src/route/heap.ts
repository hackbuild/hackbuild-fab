// Binary min heap on typed arrays, ported from PIP's router (pip-controller
// src/router.js lines 9 to 30 at b137deb, lineage router/pip-controller-b137deb).
// Ties pop in the order this sift leaves them, which decides between equal
// cost paths, so the sift is kept line for line for route parity.

/** Min heap of (key, state) pairs; keys Float64, states Int32, doubling from the initial capacity. */
export class Heap {
  private k: Float64Array;
  private v: Int32Array;
  n = 0;

  constructor(cap: number) {
    this.k = new Float64Array(cap);
    this.v = new Int32Array(cap);
  }

  clear(): void {
    this.n = 0;
  }

  push(key: number, val: number): void {
    if (this.n >= this.k.length) {
      const k = new Float64Array(this.k.length * 2); k.set(this.k); this.k = k;
      const v = new Int32Array(this.v.length * 2); v.set(this.v); this.v = v;
    }
    let i = this.n++;
    const K = this.k, V = this.v;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (K[p]! <= key) break;
      K[i] = K[p]!; V[i] = V[p]!; i = p;
    }
    K[i] = key; V[i] = val;
  }

  pop(): number {
    const K = this.k, V = this.v, top = V[0]!, last = --this.n, lk = K[last]!, lv = V[last]!;
    let i = 0;
    for (;;) {
      let c = 2 * i + 1;
      if (c >= last) break;
      if (c + 1 < last && K[c + 1]! < K[c]!) c++;
      if (K[c]! >= lk) break;
      K[i] = K[c]!; V[i] = V[c]!; i = c;
    }
    K[i] = lk; V[i] = lv;
    return top;
  }
}
