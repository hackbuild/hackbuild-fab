// JSON the engine reads through package exports. The owning projects do not
// list these files in their tsconfig include, so the shapes are declared here
// and the bundler resolves the files.

declare module "@hackbuild/checks/seed/checks.seed.json" {
  const seed: unknown;
  export default seed;
}

declare module "@hackbuild/profile/seed/profile.seed.json" {
  const seed: unknown;
  export default seed;
}

declare module "@hackbuild/kernel/package.json" {
  const meta: { readonly version: string };
  export default meta;
}

declare module "@hackbuild/geom/package.json" {
  const meta: { readonly dependencies: Readonly<Record<string, string>> };
  export default meta;
}
