// SPRUE S.fromPolygon verbatim, sprue.html lines 337 to 360 (lineage
// sprue.bench/sprue-html, sha256
// a1acb293ad96c7dd5062a9e65741a7f27959584dfb10e64decb41468c59e4fe7). Kept as
// source text so the test runs the shipped code; fill.test.ts compares it with
// the file when the file is on this machine.

export const SPRUE_PATH = "/Users/obsidian/Projects/hackbuild/fab-knowledge/originals/sprue/files/sprue.html";
export const FROM_POLYGON_FIRST_LINE = 337;

export const FROM_POLYGON_LINES: readonly string[] = [
  "  S.fromPolygon = function (w, h, ppm, poly) {",
  "    const o = S.mask(w, h);",
  "    const cx = w / 2, cy = h / 2;",
  "    // scanline fill with even-odd",
  "    const n = poly.length;",
  "    for (let py = 0; py < h; py++) {",
  "      const ymm = (cy - (py + 0.5)) / ppm;",
  "      const xs = [];",
  "      for (let i = 0; i < n; i++) {",
  "        const a = poly[i], b = poly[(i + 1) % n];",
  "        if ((a[1] <= ymm && b[1] > ymm) || (b[1] <= ymm && a[1] > ymm)) {",
  "          const t = (ymm - a[1]) / (b[1] - a[1]);",
  "          xs.push(a[0] + t * (b[0] - a[0]));",
  "        }",
  "      }",
  "      xs.sort((p, q) => p - q);",
  "      for (let k = 0; k + 1 < xs.length; k += 2) {",
  "        const x0 = Math.max(0, Math.ceil(xs[k] * ppm + cx - 0.5));",
  "        const x1 = Math.min(w - 1, Math.floor(xs[k + 1] * ppm + cx - 0.5));",
  "        for (let x = x0; x <= x1; x++) o.d[py * w + x] = 1;",
  "      }",
  "    }",
  "    return o;",
  "  };"
];
