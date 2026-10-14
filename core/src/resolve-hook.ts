// Module resolve hook for the hbf CLI process. @hackbuild/spec ships as
// source with extensionless relative imports and the package builds keep
// that form, so Node's ESM resolver refuses them. This hook retries a failed
// relative specifier with .js, then .ts (Node 22.18 strips erasable types
// without a flag). It is needed while any package the parent loads keeps
// extensionless imports; the D-178 source reader and the build sandbox do
// not remove that need, and sandbox-child.ts registers its own copy. A
// relative .js that does not exist is retried as .ts: the sim scenes under
// packages/sim/scenes/ import their package's src by the .js names tsc
// writes (M02-T11).

interface ResolveContext { readonly parentURL?: string | undefined }
interface ResolveResult { readonly url: string; readonly format?: string | null | undefined; readonly shortCircuit?: boolean }
type NextResolve = (specifier: string, context: ResolveContext) => Promise<ResolveResult>;

const RELATIVE = /^\.{1,2}\//;
const HAS_EXTENSION = /\.[cm]?[jt]s$|\.json$/;

export async function resolve(specifier: string, context: ResolveContext, next: NextResolve): Promise<ResolveResult> {
  try {
    return await next(specifier, context);
  } catch (e) {
    if (RELATIVE.test(specifier) && specifier.endsWith(".js")) return next(`${specifier.slice(0, -3)}.ts`, context).catch(() => { throw e; });
    if (!RELATIVE.test(specifier) || HAS_EXTENSION.test(specifier)) throw e;
    for (const ext of [".js", ".ts", "/index.js", "/index.ts"]) {
      try {
        return await next(specifier + ext, context);
      } catch {
        // try the next extension
      }
    }
    throw e;
  }
}
