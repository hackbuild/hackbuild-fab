// command project.graph, group look, cli only.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { ProjectGraph } from "../checks.js";

export interface ProjectGraphIO {
  input: { project?: string };
  output: ProjectGraph;
}
