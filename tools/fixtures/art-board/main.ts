/// <reference lib="dom" />
// The art board fixture entry the bake bundles (bake.json `entry`): the
// chase and bench beside it, mounted by the ui bench shell with no page
// build, so the stage stays empty and the rail, the art board, undo and the
// BENCH hook run.

import { mountBench } from "@hackbuild/bench/entry";
import { bench } from "./bench";
import { chase } from "./chase";

mountBench({ chase, bench });
