// core/test/fixtures/sandbox/ok/build.ts: a plate; a type-only import of a package outside the allowlist is erased and allowed, and the environment is empty.

import { defineBuild } from "@hackbuild/spec";
import type { MeshData } from "@hackbuild/mesh";
import { chase } from "./chase";

export type Unused = MeshData;

/** macOS adds this one to every process it starts, env {} included; it carries a uid and a text encoding. */
const OS_SET = new Set(["__CF_USER_TEXT_ENCODING"]);

export const build = defineBuild(chase, async (p, k) => {
  const keys = Object.keys(process.env).filter((key) => !OS_SET.has(key));
  if (keys.length > 0) throw new Error(`environment holds ${keys.join(", ")}`);
  return k.part({
    id: "plate", name: "PLATE", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: true, carriesOffset: false, pose: "print" },
    bodies: [k.body("plate", { role: "body", slot: 1, base: { route: "prism", outline: [k.ring.roundRect(p.w, p.w, 2)], z: [0, 2] } })],
    features: [],
  });
});
