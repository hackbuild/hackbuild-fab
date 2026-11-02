# @hackbuild/engine

The build half of a bench, for a page that loads it from a CDN or inlines it
(plan v11.2 3.7). A page writes a chase and a build function, then:

    const page = createPageBuild({ chase, module: { build }, facts: factsFor(chase, source) });
    createBench({ chase, bench, ...pageBench(page), hook: true });

`createPageBuild` is packages/pipeline's. `factsFor(chase, source)` computes in
the page what tools/bake/design-facts.mjs computes in node. Every field but
defHash is equal to the bake's for a design without draft kinds
(`test/facts.test.ts`). defHash covers the chase and the sha256 of the source
text the page passes, where the bake hashes the design's files, so a page's
buildHash differs from the golden of the same design while its mesh hashes and
volumes are equal (`test/build.test.ts`).

The package inlines the private packages the pipeline imports (geom, mesh,
inlay, checks, profile data, the registry loader, the 3MF writer). manifold-3d
is a peer of the npm and cdn forms; the iife form carries its glue and takes
the wasm through `configureManifold`.

geom keeps the manifold options and the load in flight on one page-wide object
beside the instance slot, so the copy of geom in this library and the copy in
bench-core act on one instance (`test/instance.test.ts`).

Tier 2 (tools/tiers.json): no DOM, no Vue.
