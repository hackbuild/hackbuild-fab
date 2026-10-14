# @hackbuild/pipeline

The build and check pipeline that `hbf part.build` and a baked bench page
share (D-264). A build function's draft goes in; Part IR, meshes, the
buildHash, every check result and the 3mf package come out. Tier 2: no
node API and no DOM. Core reads the workspace from disk and runs the build
function in its sandbox; a fab bake writes the same workspace data into the
page as PageFacts (tools/bake/design-facts.mjs) and runs the build function
in the page through `createPageBuild`.

For one set of values, PageFacts and SOURCE_DATE_EPOCH the two give one
buildHash and byte-equal 3mf files: `core/test/page-build.test.ts` in node,
`tools/smoke/page-build.spec.ts` from the baked page in system Chrome.

See PACKAGES.md 6.6.
