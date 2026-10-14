// The kinematics the sim scene modules read, bound once for the tests that
// import those modules directly (sim takes place(pose), D-139). A test calls
// the scene's bindKinematics with it before it places a body; the CLI binds
// the same object through SceneDeps.kinematics (core/src/commands/sim.run.ts).

import { fileURLToPath } from "node:url";
import { sceneKinematics } from "../src/kinematics.js";

export const kinematics = sceneKinematics(fileURLToPath(new URL("../../", import.meta.url)));
