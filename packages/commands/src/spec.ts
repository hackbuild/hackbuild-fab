// A command's definition without its run body (PLAN.md 4, boundaries.md 2
// problem 1): name, group, description, input and output schemas, examples
// and the CLI form row. A host binds run bodies to these with bind(); a
// spec with no run body, or a run body with no spec, stops the load with
// E_KERNEL, so the two lists cannot drift apart.

import { COMMAND_NAMES, commandError } from "@hackbuild/spec";
import type { AnyCommandDef, CommandDef, CommandName } from "@hackbuild/spec";

/** How one flag reads its value. */
/**
 * "edit" flags build one chase.patch edit together: --anchor with
 * --replace, or --pointer with --set (json when it parses, else a string),
 * appended to the field after any --edits list.
 */
export type FlagKind = "string" | "json" | "list" | "switch" | "size" | "facts" | "import" | "gap" | "pairs" | "edit";

export interface CliForm {
  /** Input field the positional target fills. */
  readonly target: string;
  /** Flag name to input field and reading. */
  readonly flags: Readonly<Record<string, { readonly field: string; readonly kind: FlagKind }>>;
  /** Transport flags: not inputs. */
  readonly transport: readonly ("artifact" | "out")[];
  /** True when the target may be absent (check.run with --artifact). */
  readonly targetOptional?: boolean;
  /** List flags that may repeat; each value appends (constraints.query --param). */
  readonly repeat?: readonly string[];
  /** Flags the form does not name, each --name <number>, gathered into this field by name (motion.run program args). */
  readonly rest?: string;
}

/** Lists only the host can read, for the specs whose schema text names them (motion.run program ids). */
export interface HostLists {
  readonly programIds: readonly string[];
}

/** One command's definition with no run body; input may read host lists. */
export interface CommandSpec<N extends CommandName = CommandName> extends Omit<CommandDef<N>, "run" | "input"> {
  readonly input: CommandDef<N>["input"] | ((host: HostLists) => CommandDef<N>["input"]);
  readonly cli: CliForm;
}

export type AnySpec = { [N in CommandName]: CommandSpec<N> }[CommandName];

/** Run bodies by command name, as a host supplies them to bind(). */
export type Runs = { readonly [N in CommandName]?: CommandDef<N>["run"] };

const order = (n: string): number => (COMMAND_NAMES as readonly string[]).indexOf(n);

/** Join specs and run bodies into CommandDefs in COMMAND_NAMES order; a spec with no run, a run with no spec or a repeated name is E_KERNEL. */
export function bind(specs: readonly AnySpec[], runs: Runs, host: HostLists): readonly AnyCommandDef[] {
  const names = specs.map((s) => s.name as string);
  const ran = Object.keys(runs);
  const repeated = names.filter((n, i) => names.indexOf(n) !== i);
  const noRun = names.filter((n) => typeof (runs as Record<string, unknown>)[n] !== "function");
  const noSpec = ran.filter((n) => !names.includes(n));
  const problems = [
    ...repeated.map((n) => `${n} has two specs`),
    ...noRun.map((n) => `${n} has a spec and no run body`),
    ...noSpec.map((n) => `${n} has a run body and no spec`),
  ];
  if (problems.length > 0) {
    throw commandError({
      code: "E_KERNEL", path: "/commands", got: problems.join("; "), expected: "one spec and one run body per command",
      hint: "add the spec under packages/commands/src/defs and rerun node tools/gen-commands.mjs, or add the run body to RUNS in core/src/registry.ts",
    });
  }
  return [...specs].sort((a, b) => order(a.name) - order(b.name)).map((s) => {
    const { cli: _cli, input, ...rest } = s;
    // The one correlated cast: s and its run body share the name N, which the mapped Runs type cannot carry through the map.
    return { ...rest, input: typeof input === "function" ? input(host) : input, run: runs[s.name] } as unknown as AnyCommandDef;
  });
}
