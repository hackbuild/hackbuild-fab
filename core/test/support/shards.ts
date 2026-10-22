// Corpus shards (R1-speed-01). A corpus file that ran every reference in
// one worker is split into thin files named
// <family>.shard-<i>-of-<n>.test.ts, each running slice(list, i, n), so
// vitest spreads them over its workers. The file name is the declaration:
// shards.test.ts reads core/test for every shard file and proves the
// shards of a family cover its list exactly once.

import path from "node:path";
import { fileURLToPath } from "node:url";

/** A shard file name: family, shard number from 1, shard count. */
export const SHARD_FILE = /^(.+)\.shard-(\d+)-of-(\d+)\.test\.ts$/;

/** The shard a file is, from its path or file: url. */
export function shardOf(file: string): { readonly family: string; readonly i: number; readonly n: number } {
  const name = path.basename(file.startsWith("file:") ? fileURLToPath(file) : file);
  const m = SHARD_FILE.exec(name);
  if (m === null) throw new Error(`${name} is not named <family>.shard-<i>-of-<n>.test.ts`);
  const i = Number(m[2]);
  const n = Number(m[3]);
  if (!(n >= 1 && i >= 1 && i <= n)) throw new Error(`${name}: shard ${i} of ${n} is out of range`);
  return { family: m[1]!, i, n };
}

/** Shard i of n, round robin over the sorted list, so the long items of one area spread across shards. */
export function slice<T>(list: readonly T[], i: number, n: number): T[] {
  return list.filter((_, k) => k % n === i - 1);
}
