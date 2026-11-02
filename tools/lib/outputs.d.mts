export interface LibPackage {
  readonly short: string;
  readonly name: string;
  readonly dir: string;
  readonly entry: string;
  readonly global: string;
  readonly peers: readonly string[];
  /** Peers the iife form bundles instead of reading from a global. */
  readonly iifeInline?: readonly string[];
  /** Packages loaded by dynamic import on paths a page never runs; left as imports. */
  readonly lazy?: readonly string[];
  readonly vue: boolean;
  readonly attwSkip?: readonly string[];
}
export const ROOT: string;
export const TARGET: string;
export const PEER_GLOBALS: Readonly<Record<string, string>>;
export const PACKAGES: readonly LibPackage[];
export const VENDOR_THREE: string;
export const PEER_FILES: Readonly<Record<string, string>>;
export const BUDGET_FILE: string;
export function externalsOf(pkg: LibPackage, format?: "es" | "iife"): string[];
export function globalsOf(pkg: LibPackage): Record<string, string>;
export function matches(id: string, names: readonly string[]): boolean;
