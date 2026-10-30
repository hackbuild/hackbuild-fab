/// <reference lib="dom" />
// The welcome fixture (M09-T04): bench-core's bench core, storage, welcome
// memory and share link on a stand-in design, bundled into one file and
// opened at file:// by tools/smoke/welcome.spec.ts. It answers the slice of
// BenchHook the spec reads (ready, designJson, loadDesign, log) and carries
// the data-hb hooks the flex-pair bake renders: welcome, welcome-start,
// welcome-dismiss, guide. The stand-in build hashes the state text; the
// real build is the host's (M09-T07, M09-T13).

import { createBenchCore } from "../../src/bench/core.js";
import { currentOnly, openShare } from "../../src/bench/share.js";
import { setStorageLog } from "../../src/bench/storage.js";
import { createWelcome, welcomeStarts } from "../../src/bench/welcome.js";

const DESIGN = "welcome-fixture";
const CHASE = 2;

interface FixtureState {
  size: { w: number; h: number };
  label: string;
}

const blank = (): FixtureState => ({ size: { w: 1, h: 1 }, label: "" });
const presets = [{ id: "wide", label: "wide", apply: (s: FixtureState): FixtureState => ({ ...s, size: { w: 2, h: 1 } }) }];

const core = createBenchCore<FixtureState, string, null>({
  app: DESIGN,
  v: 1,
  blank,
  build: async (s) => ({ part: JSON.stringify(s), report: null, buildHash: String(JSON.stringify(s).length) }),
});
setStorageLog((line) => core.appendLog(line));

const $ = (sel: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(sel);
  if (el === null) throw new Error(`fixture is missing ${sel}`);
  return el;
};

const card = $('[data-hb="welcome"]');
const starts = $('[data-hb="welcome-starts"]');
const out = $("#state");

const welcome = createWelcome(DESIGN, () => paint());

function paint(): void {
  card.hidden = !welcome.open;
  out.textContent = core.designJson();
}

for (const s of welcomeStarts(presets)) {
  const b = document.createElement("button");
  b.type = "button";
  b.dataset["hb"] = "welcome-start";
  b.dataset["start"] = s.id;
  b.className = s.primary ? "primary" : "";
  b.textContent = s.label;
  b.addEventListener("click", () => {
    const p = presets.find((x) => x.id === s.id);
    core.reset(p?.apply);
    welcome.dismiss();
  });
  starts.append(b);
}
$('[data-hb="welcome-dismiss"]').addEventListener("click", () => welcome.dismiss());
$('[data-hb="guide"]').addEventListener("click", () => welcome.reopen());

let ready = false;
const hook = {
  get ready() {
    return ready;
  },
  get log() {
    return [...core.log];
  },
  designJson: () => core.designJson(),
  loadDesign: (j: string) => void core.loadDesign(j),
  ensureMesh: async () => void (await core.ensureMesh()),
};
(globalThis as unknown as { BENCH: typeof hook }).BENCH = hook;

async function boot(): Promise<void> {
  paint();
  await openShare(core, location.hash, {
    migrate: currentOnly(CHASE),
    validate: (d) => (d !== null && typeof d === "object" && "state" in d ? null : "no state"),
  });
  await core.ensureMesh();
  paint();
  ready = true;
}
void boot();
