// Shard 2 of 4 of check.run over every reference (support/message-numbers.ts,
// R1-speed-01). Builds are read from the run's build store.

import { vi } from "vitest";
import { referenceChecks } from "./support/message-numbers.js";

vi.mock("@hackbuild/profile", async (importOriginal) => (await import("./support/profile-watch.js")).watchProfile(await importOriginal()));
vi.mock("../src/commands/build.js", async (importOriginal) => (await import("./support/build-cache.js")).withBuildCache(await importOriginal()));

referenceChecks(import.meta.url);
