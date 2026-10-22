// Shard 2 of 3 of the metric record builds (support/metric-record.ts,
// R1-speed-01). Builds are read from the run's build store.

import { vi } from "vitest";
import { metricShard } from "./support/metric-record.js";

vi.mock("../src/commands/build.js", async (importOriginal) => (await import("./support/build-cache.js")).withBuildCache(await importOriginal()));

metricShard(import.meta.url);
