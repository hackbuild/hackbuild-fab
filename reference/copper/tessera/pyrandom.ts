// Python's random.Random for an int seed, as far as TESSERA draws from it
// (M05-T15 step 2): the Mersenne Twister MT19937 seeded by init_by_array
// with the seed's 32 bit words (CPython Modules/_randommodule.c,
// random_seed and init_by_array), random() as 53 bits from two draws
// ((a >> 5) x 2^26 + (b >> 6)) / 2^53, and uniform(a, b) = a + (b - a) x
// random() (Lib/random.py). gen_tessera.py lines 110 to 120 draw
// uniform(-jx, jx) then uniform(-jy, jy) per seed, column by column.
//
// It lives beside the board because build.ts may import only
// @hackbuild/spec and files inside its own directory (D-178); TESSERA is
// the only board of the family that draws.

const N = 624;
const M = 397;

export class PyRandom {
  private readonly mt = new Uint32Array(N);
  private mti = N + 1;

  constructor(seed: number) {
    if (!Number.isSafeInteger(seed)) throw new Error(`PyRandom takes an int seed, got ${seed}`);
    let n = Math.abs(seed);
    const key: number[] = [];
    do {
      key.push(n % 0x100000000);
      n = Math.floor(n / 0x100000000);
    } while (n > 0);
    this.initByArray(key);
  }

  private initGenrand(s: number): void {
    const mt = this.mt;
    mt[0] = s >>> 0;
    for (let i = 1; i < N; i++) {
      const prev = mt[i - 1]! ^ (mt[i - 1]! >>> 30);
      mt[i] = (Math.imul(1812433253, prev) + i) >>> 0;
    }
    this.mti = N;
  }

  private initByArray(key: readonly number[]): void {
    const mt = this.mt;
    this.initGenrand(19650218);
    let i = 1, j = 0;
    for (let k = Math.max(N, key.length); k > 0; k--) {
      const prev = mt[i - 1]! ^ (mt[i - 1]! >>> 30);
      mt[i] = ((mt[i]! ^ Math.imul(prev, 1664525)) + key[j]! + j) >>> 0;
      i++;
      j++;
      if (i >= N) {
        mt[0] = mt[N - 1]!;
        i = 1;
      }
      if (j >= key.length) j = 0;
    }
    for (let k = N - 1; k > 0; k--) {
      const prev = mt[i - 1]! ^ (mt[i - 1]! >>> 30);
      mt[i] = ((mt[i]! ^ Math.imul(prev, 1566083941)) - i) >>> 0;
      i++;
      if (i >= N) {
        mt[0] = mt[N - 1]!;
        i = 1;
      }
    }
    mt[0] = 0x80000000;
  }

  /** genrand_uint32. */
  private next(): number {
    const mt = this.mt;
    if (this.mti >= N) {
      for (let k = 0; k < N; k++) {
        const y = (mt[k]! & 0x80000000) | (mt[(k + 1) % N]! & 0x7fffffff);
        mt[k] = mt[(k + M) % N]! ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      }
      this.mti = 0;
    }
    let y = mt[this.mti++]!;
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }

  /** random(): a float in [0, 1) with 53 bits. */
  random(): number {
    const a = this.next() >>> 5, b = this.next() >>> 6;
    return (a * 67108864 + b) / 9007199254740992;
  }

  uniform(a: number, b: number): number {
    return a + (b - a) * this.random();
  }
}
