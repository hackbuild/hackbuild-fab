// Shared pieces of the non-TUMBLER derive() ports: the flat param list a
// def declares, the strict schema built from it, and the DerivedValue
// makers. Every value derive() returns names its unit, its equation and
// its qualifier (D-007).

import { z } from "zod";
import { qualify, qualifyRow, type DerivedValue, type SchemaLike, type Tier } from "@hackbuild/spec";

/** One numeric param: unit, a one-line doc naming where its default comes from, and the default. */
export interface InputParam {
  readonly key: string;
  readonly unit: string;
  readonly doc: string;
  readonly default: number;
}

export type Values = Readonly<Record<string, number>>;

/** A strict schema over the params, each a finite number defaulting to the original's value. */
export function inputSchema(params: readonly InputParam[]): SchemaLike<unknown, Values> {
  const shape = Object.fromEntries(params.map((f) => [f.key, z.number().finite().default(f.default)]));
  return z.object(shape).strict() as unknown as SchemaLike<unknown, Values>;
}

/** The defaults as values. */
export const defaultsOf = (params: readonly InputParam[]): Values => Object.fromEntries(params.map((p) => [p.key, p.default]));

/** A number an equation produced from params and the named profile rows' tiers. */
export const computed = (value: number, unit: string, equation: string, tiers: readonly Tier[] = []): DerivedValue =>
  ({ value, unit, equation, ...qualify([...tiers]) });

/** A value read straight from a profile row. */
export const fromRow = (value: number, unit: string, equation: string, tier: Tier): DerivedValue => ({ value, unit, equation, ...qualifyRow(tier) });

/** Standard gravity, m/s2, exact by definition (CGPM 1901). */
export const STANDARD_GRAVITY = 9.80665;
