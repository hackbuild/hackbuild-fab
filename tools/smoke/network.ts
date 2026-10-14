// What a bench reaches for while it runs (M09-T14 step 4, D-129, G-57):
// requests whose URL is not file: or data:, Worker constructions recorded
// by an init script (a blob: URL or type "module" fails), and console
// errors plus page errors. One watcher per page, read at the end of a run.

import type { Page } from "@playwright/test";

export interface WorkerRecord {
  url: string;
  type: string;
}

export interface Watch {
  errors: string[];
  external: string[];
  /** Reads the Worker log from the page; call while the page is open. */
  workers(): Promise<WorkerRecord[]>;
}

/** Wraps Worker before any page script runs; the log lives on globalThis. */
const WORKER_LOG = `(() => {
  const log = [];
  Object.defineProperty(globalThis, "__hbfWorkers", { value: log, configurable: false });
  const W = globalThis.Worker;
  if (typeof W !== "function") return;
  globalThis.Worker = new Proxy(W, {
    construct(target, args) {
      const u = args[0];
      log.push({ url: String(u && u.href !== undefined ? u.href : u), type: String((args[1] && args[1].type) || "classic") });
      return Reflect.construct(target, args);
    },
  });
})();`;

export async function watch(page: Page): Promise<Watch> {
  const w = { errors: [] as string[], external: [] as string[] };
  page.on("console", (m) => {
    if (m.type() === "error") w.errors.push(m.text());
  });
  page.on("pageerror", (e) => w.errors.push(String(e)));
  page.on("request", (r) => {
    const u = r.url();
    if (!u.startsWith("file:") && !u.startsWith("data:")) w.external.push(u);
  });
  await page.addInitScript(WORKER_LOG);
  return {
    ...w,
    workers: () => page.evaluate(() => ((globalThis as unknown as { __hbfWorkers?: WorkerRecord[] }).__hbfWorkers ?? []).slice()),
  };
}

/** Workers D-129 refuses under file://. */
export const badWorkers = (list: readonly WorkerRecord[]): WorkerRecord[] =>
  list.filter((x) => x.url.startsWith("blob:") || x.type === "module");
