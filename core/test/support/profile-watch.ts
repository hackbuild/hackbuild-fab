// Every number any ProfileLookup method returns while a check runs, so a
// constraint may print a profile value the check read (M04-T05). A file
// installs it with
//   vi.mock("@hackbuild/profile", async (o) => (await import("./support/profile-watch.js")).watchProfile(await o()));
// This module imports nothing from @hackbuild/profile, so the mock factory
// can load it without a cycle; core and packages/checks build their
// lookups from the mocked module.

type ProfileModule = typeof import("@hackbuild/profile");

/** The numbers seen since a caller last emptied nums. */
export const profileSeen = { nums: [] as number[] };

function collect(x: unknown): void {
  if (typeof x === "number" && Number.isFinite(x)) profileSeen.nums.push(x);
  else if (Array.isArray(x)) x.forEach(collect);
  else if (typeof x === "object" && x !== null) Object.values(x).forEach(collect);
}

function watch<T extends object>(p: T): T {
  return new Proxy(p, {
    get(t, k, r) {
      const v = Reflect.get(t, k, r) as unknown;
      // reads() and warnings() report what was read; only values handed to a caller count.
      if (typeof v !== "function" || k === "reads" || k === "warnings") return v;
      return (...args: unknown[]) => {
        const out = (v as (...a: unknown[]) => unknown).apply(t, args);
        collect(out);
        return out;
      };
    },
  });
}

/** The profile module with createProfileLookup watched. */
export function watchProfile(m: ProfileModule): ProfileModule {
  return { ...m, createProfileLookup: (...a: Parameters<ProfileModule["createProfileLookup"]>) => watch(m.createProfileLookup(...a)) };
}
