// What core passes every command beyond CommandCtx. Run bodies, exporters
// and the transports import it from here, so none of them reads the
// registry to learn its context.

import type { CommandCtx, Hash } from "@hackbuild/spec";
import type { GateStreams, HostGate } from "./tty-gate.js";
import type { Store } from "./store.js";

/** What core passes every command beyond CommandCtx. */
export interface CoreCtx extends CommandCtx {
  /** Directory relative targets resolve against. */
  readonly cwd: string;
  readonly store: Store;
  readonly inputsHash: Hash;
  readonly gate: GateStreams;
  /** Set by a transport that asks through its host (MCP elicitation); absent on the CLI, which asks on the terminal. */
  readonly hostGate?: HostGate;
  /** CLI transport flags that are not command inputs. */
  readonly cli: { readonly artifact?: string; readonly out?: string };
}
