// Static file server for the fixture pages (node built-ins only). Serves the
// repository root over http on 127.0.0.1, GET and HEAD only, no directory
// listing. Import-map targets must be absolute http paths, because relative
// targets fail from file:// (plan v10 3.4, measured).
// Run: node tools/fixtures/serve.mjs [port]

import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".wasm": "application/wasm", ".woff2": "font/woff2", ".svg": "image/svg+xml",
};
const HIDDEN = [`${sep}.git${sep}`, `${sep}.hbf${sep}`];

export function serve(port) {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const file = normalize(join(ROOT, decodeURIComponent(url.pathname)));
    let ok = req.method === "GET" || req.method === "HEAD";
    ok = ok && file.startsWith(ROOT) && !HIDDEN.some((h) => file.includes(h));
    let stat;
    try { stat = ok ? statSync(file) : null; } catch { stat = null; }
    if (stat === null || !stat.isFile()) {
      res.writeHead(404, { "content-type": "text/plain" }).end("not found");
      return;
    }
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "content-length": stat.size, "cache-control": "no-store" });
    if (req.method === "HEAD") res.end();
    else createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] ?? 4173);
  await serve(port);
  console.log(`serving ${ROOT} on http://127.0.0.1:${port}`);
}
