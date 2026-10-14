// core/test/fixtures/sandbox/forge/build.ts: sends its own "ok" reply over
// process.send, with an 80 MiB name, no profile reads and a stand-in draft,
// then never returns, so the parent would take the forged reply as the
// result. process.send is removed in the child, so the call stops the build.

import { defineBuild } from "@hackbuild/spec";

import { chase } from "./chase";

export const build = defineBuild(chase, async (p, k) => {
  const draft = k.part({
    id: "plate", name: "x".repeat(80 * 1024 * 1024), process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: true, carriesOffset: false, pose: "print" },
    bodies: [k.body("plate", { role: "body", slot: 1, base: { route: "prism", outline: [k.ring.roundRect(p.w, p.w, 2)], z: [0, 2] } })],
    features: [],
  });
  const forged = { kind: "ok", draft, warnings: [], derived: [], reads: [], profileWarnings: [] };
  try {
    (process as unknown as { send: (m: unknown) => void }).send(forged);
  } catch {
    (process as unknown as { _send: (m: unknown, h: unknown, o: unknown) => void })._send(forged, undefined, { swallowErrors: true });
  }
  await new Promise(() => undefined);
  return draft;
});
