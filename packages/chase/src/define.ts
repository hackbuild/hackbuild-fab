// defineChase and defineBuild (D-131, M10-T02 step 2). Both are identities
// at runtime: the chase is data the source reader parses without running it
// (D-178), and defineChase only keeps literal types so ParamsOf sees ids and
// option values. spec/chase.ts holds the one implementation, with the
// CheckedChase type checks; this module is the package's surface for it,
// and @hackbuild/kernel/author re-exports it.

export { defineBuild, defineChase, type CheckedChase } from "@hackbuild/spec";
export type { BuildFn } from "@hackbuild/spec";
