// reference/exports/orca-3mf-roundtrip/build.ts
// The COLLAR build on this reference's chase, at layer 0.24 mm. build.ts
// runs in the build sandbox, which admits relative imports inside this
// directory only (D-178), so collar-build.ts is a byte copy of
// designs/collar/build.ts; core/test/build-sandbox.test.ts fails when the
// two differ. Its `./chase` import resolves to the chase beside it.
// masks() hands the raster route its label grids by uri.

export { build, masks } from "./collar-build";
