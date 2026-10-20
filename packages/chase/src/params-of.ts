// ParamsOf (M10-T02 step 2): the params a build function reads, typed from
// the chase. Field ids flatten across groups; mm, deg, int, ratio and
// number map to number, bool to boolean, enum to the union of its option
// values, text to string, list to an array of its item record, and derived
// is omitted, so a param typo or a read of a derived field fails tsc. The
// type lives in spec/chase.ts beside defineBuild, which binds it.

import type { Chase, ParamsOf } from "@hackbuild/spec";

export type { ParamsOf } from "@hackbuild/spec";

/** The field ids a chase's build function may read. */
export type ParamIdOf<C extends Chase> = keyof ParamsOf<C> & string;
