// knurl.html links six Google families (line 9) and rasters its calligraphy
// with them, so the offline build falls back to other faces and the mesh moves
// (97,820 tris against 98,288 in shot k01, measured). The stored zip keeps the
// stylesheet and every woff2 it names, at the paths the two URL prefixes map to,
// with each family's licence. Served from it, the build gives 98,288 (README).

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const LEGACY = fileURLToPath(new URL("../legacy/", import.meta.url));
const ZIP = "google-fonts-20261018.zip";
const CSS = "fonts.googleapis.com/css2";
const WOFF2 = Buffer.from("wOF2", "latin1");

const { readStored } = (await import(new URL("../../../tools/legacy/stored-zip.mjs", import.meta.url).href)) as {
  readStored: (b: Uint8Array) => Map<string, Uint8Array>;
};

const members = (): Map<string, Uint8Array> => {
  const p = LEGACY + ZIP;
  if (!existsSync(p)) throw new Error(`designs/knurl/legacy/${ZIP} missing: the Google fonts are not vendored`);
  return readStored(readFileSync(p));
};

/** Family names of the page's Google fonts link, in link order. */
function linkedFamilies(): string[] {
  const html = readFileSync(LEGACY + "knurl.html", "utf8");
  const href = /<link href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)" rel="stylesheet">/.exec(html)?.[1];
  if (href === undefined) throw new Error("knurl.html has no Google fonts link");
  return new URL(href).searchParams.getAll("family").map((f) => f.split(":")[0]!);
}

// The zip and the page are legacy copies kept out of git (D-286): where they
// are absent, as on hosted runners, this suite is skipped and reports not run.
const present = existsSync(LEGACY + ZIP) && existsSync(LEGACY + "knurl.html");

describe.skipIf(!present)("knurl google fonts kept for offline parity", () => {
  test("the page links the six families the record names", () => {
    expect(linkedFamilies()).toEqual(["Amiri", "IBM Plex Mono", "Permanent Marker", "VT323", "Noto Naskh Arabic", "Scheherazade New"]);
  });

  test("the zip stylesheet declares a face for every linked family", () => {
    const css = Buffer.from(members().get(CSS) ?? new Uint8Array()).toString("utf8");
    const declared = new Set([...css.matchAll(/font-family: '([^']+)'/g)].map((m) => m[1]));
    for (const f of linkedFamilies()) expect(declared.has(f), `no @font-face for ${f}`).toBe(true);
  });

  test("every woff2 the stylesheet names is a woff2 member at its URL path", () => {
    const m = members();
    const css = Buffer.from(m.get(CSS) ?? new Uint8Array()).toString("utf8");
    const urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+/g) ?? [])];
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) {
      const data = m.get(u.slice("https://".length));
      expect(data, `${u} is not in the zip`).toBeDefined();
      expect(Buffer.from(data!).subarray(0, 4).equals(WOFF2), `${u} is not woff2`).toBe(true);
    }
  });

  test("each family ships its licence", () => {
    const names = [...members().keys()].filter((n) => n.startsWith("LICENSES/"));
    for (const f of linkedFamilies()) {
      const id = f.toLowerCase().replace(/ /g, "");
      expect(names.some((n) => n.startsWith(`LICENSES/${id}-`)), `no licence for ${f}`).toBe(true);
    }
  });

  test("SHA256SUMS lists the zip with its hash", () => {
    const want = createHash("sha256").update(readFileSync(LEGACY + ZIP)).digest("hex");
    expect(readFileSync(LEGACY + "SHA256SUMS", "utf8")).toContain(`${want}  ${ZIP}\n`);
  });
});
