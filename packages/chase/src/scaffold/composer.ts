// The composer kind's minimal chase (M10-T05 step 1): the single template
// with kind composer. The rail ends in print as the card asks; a kit that
// needs make adds its own step. The build returns one part until the
// kernel builds an AssemblyDraft (no build path reads one yet).

import { minimalScaffold, type ScaffoldFiles } from "./single.js";

/** chase.scaffold --kind composer without from. */
export const composerScaffold = (name: string): ScaffoldFiles => minimalScaffold("composer", name);
