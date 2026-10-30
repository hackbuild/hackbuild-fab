// The export self-check refuses a 3MF with a repeated object id, p:UUID or
// object name, or a mesh that is not a closed manifold, and names the rule.
// Packages are built here with JSZip so the reader sees deflated members.

import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { assertExportable, ExportSelfCheckError, selfCheck3mf } from "../../src/export/selfcheck.js";

const V = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
const T = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]];

function mesh(tris: number[][] = T): string {
  const vs = V.map(([x, y, z]) => `<vertex x="${x}" y="${y}" z="${z}"/>`).join("");
  const ts = tris.map(([a, b, c]) => `<triangle v1="${a}" v2="${b}" v3="${c}"/>`).join("");
  return `<mesh><vertices>${vs}</vertices><triangles>${ts}</triangles></mesh>`;
}

interface Opts { uuids?: [string, string]; ids?: [number, number]; names?: [string, string]; tris?: number[][] }

async function pack(o: Opts = {}): Promise<Uint8Array> {
  const [u1, u2] = o.uuids ?? ["aaaaaaaa-0000-4000-8000-000000000001", "aaaaaaaa-0000-4000-8000-000000000002"];
  const [i1, i2] = o.ids ?? [1, 2];
  const [n1, n2] = o.names ?? ["left", "right"];
  const model = `<?xml version="1.0"?><model xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06"><resources>`
    + `<object id="${i1}" p:UUID="${u1}" type="model">${mesh(o.tris)}</object>`
    + `<object id="${i2}" p:UUID="${u2}" type="model">${mesh()}</object></resources>`
    + `<build><item objectid="${i1}"/><item objectid="${i2}"/></build></model>`;
  const settings = `<config><object id="${i1}"><metadata key="name" value="${n1}"/></object><object id="${i2}"><metadata key="name" value="${n2}"/></object></config>`;
  const z = new JSZip();
  z.file("3D/3dmodel.model", model);
  z.file("Metadata/model_settings.config", settings);
  return z.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

const rules = async (o?: Opts): Promise<string[]> => (await selfCheck3mf(await pack(o))).map((f) => f.rule);

describe("the export self-check", () => {
  it("passes a package of two closed cubes with unique ids, UUIDs and names", async () => {
    expect(await selfCheck3mf(await pack())).toEqual([]);
    await expect(assertExportable("3mf", await pack())).resolves.toBeUndefined();
  });

  it("refuses a duplicate UUID and names the rule", async () => {
    const same = "aaaaaaaa-0000-4000-8000-000000000001";
    const bytes = await pack({ uuids: [same, same] });
    const found = await selfCheck3mf(bytes);
    expect(found.map((f) => f.rule)).toEqual(["3mf-uuid"]);
    expect(found[0]!.line).toContain(`p:UUID ${same} appears 2 times, legal exactly 1`);
    const err = await assertExportable("3mf", bytes).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ExportSelfCheckError);
    expect((err as Error).message).toContain("3mf-uuid");
  });

  it("refuses a repeated object id", async () => {
    expect(await rules({ ids: [1, 1] })).toContain("3mf-id");
  });

  it("refuses repeated and empty object names", async () => {
    expect(await rules({ names: ["part", "part"] })).toEqual(["3mf-name"]);
    expect(await rules({ names: ["part", " "] })).toEqual(["3mf-name"]);
    expect(await rules({ names: ["part", "undefined"] })).toEqual(["3mf-name"]);
  });

  it("refuses an open mesh, an inverted mesh and a bad index", async () => {
    expect(await rules({ tris: T.slice(0, 11) })).toEqual(["3mf-manifold"]);
    expect(await rules({ tris: T.map(([a, b, c]) => [a!, c!, b!]) })).toEqual(["3mf-manifold"]);
    expect(await rules({ tris: [...T.slice(0, 11), [0, 1, 99]] })).toEqual(["3mf-manifold"]);
  });

  it("reports bytes that are not a zip as the package rule, and passes other kinds", async () => {
    expect((await selfCheck3mf(new Uint8Array([1, 2, 3]))).map((f) => f.rule)).toEqual(["3mf-zip"]);
    await expect(assertExportable("stl", new Uint8Array([1]))).resolves.toBeUndefined();
  });
});
