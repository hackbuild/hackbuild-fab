// The 3MF writer, validator mirror and artifact hash live once, in
// hackbuild-3mf (D-027, R1-engine-03). This workspace re-exports the build
// vendored at tools/vendor/hackbuild-3mf-0.1.0-<sha7>.tgz, so the importers
// of @hackbuild/3mf keep their name. A change to the writer lands in
// hackbuild-3mf, is packed into tools/vendor with its sha256 in SHA256SUMS,
// and this package.json points at the new file.

export * from "hackbuild-3mf";
