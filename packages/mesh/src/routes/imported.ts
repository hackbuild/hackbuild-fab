// The imported route (D-053): a legacy or bought mesh enters the kernel as a
// hashed, winding-checked body (D-053, D-102). The STL reader is a port of
// PLINTH parseSTL (plinth/files/plinth.html lines 1908 to 1931, lineage row
// mesh.imported/plinth-html): binary when the header count gives the byte
// length exactly, ASCII otherwise, every coordinate kept as float32 the way
// the binary format stores it. The port adds what PLINTH left to the caller:
// the D-054 weld, the signed volume, the refusal of an inverted body, and a
// refusal of a file that holds no whole triangle.
//
// Guarantees, recorded in IMPORTED_ROUTE: watertight is not assumed (the
// stage runner refuses a shell manifold rejects); winding is checked by the
// sign of the volume; the meshHash runs over the welded vertices and the
// sorted triangles (hash.ts canonical()). An imported body is placeable and
// checkable, never parametrised.

import type { MeshHash, MeshRouteDef } from "@hackbuild/spec";
import { meshHash, signedVolume, snapWeld, type MeshData } from "../hash.js";
import { joinMeshes, meshError } from "./prism.js";

/** The route entry with what it promises (D-053) and what it checks on read (D-102). */
export const IMPORTED_ROUTE = {
  route: "imported",
  guarantees: { manifold: false, exactZ: false, perSlotDisjoint: false },
  lazy: false,
  watertight: "not assumed",
  winding: "checked: a body with signed volume at or below 0 mm3 is E_KERNEL naming the file",
  meshHash: "over the vertices welded on the 1/1024 mm grid and the sorted triangles",
} as const satisfies MeshRouteDef & Record<string, unknown>;

/** STL layout read: PLINTH's rule picks binary when 84 + 50 n equals the byte length. */
export type StlEncoding = "binary" | "ascii";

/** How the bytes were read: an STL layout, or a glTF 2.0 binary (imported-glb.ts). */
export type ImportEncoding = StlEncoding | "glb";

/** One imported body after the weld. */
export interface ImportedBody {
  /** The file or uri the bytes came from; errors name it. */
  readonly file: string;
  readonly encoding: ImportEncoding;
  /** Triangles in the file, before the weld drops the ones that collapse. */
  readonly trianglesRead: number;
  /** Welded on the D-054 grid, outward winding as checked. */
  readonly mesh: MeshData;
  readonly meshHash: MeshHash;
  /** Signed volume of the welded mesh, mm3 (computed); positive by the time it is returned. */
  readonly volumeMm3: number;
  /**
   * The file's own parts, each welded alone: one for an STL, one per mesh
   * node for a GLB. mesh is their concatenation with no vertex shared
   * across parts, so two parts that touch stay two closed shells.
   */
  readonly parts: readonly ImportedPart[];
}

/** One part of an imported file after its own weld. */
export interface ImportedPart {
  readonly name: string;
  readonly mesh: MeshData;
}

/** A run of triangles in a soup that the file names as one part. */
export interface SoupPart {
  readonly name: string;
  /** First triangle of the part. */
  readonly start: number;
  readonly count: number;
}


const BINARY_HEADER = 84;
const BINARY_FACET = 50;
const basename = (file: string): string => file.slice(file.lastIndexOf("/") + 1);
const ASCII_VERTEX = /vertex\s+(-?[\d.eE+-]+)\s+(-?[\d.eE+-]+)\s+(-?[\d.eE+-]+)/g;

/** Which layout PLINTH's rule reads these bytes as. */
export function stlEncoding(bytes: Uint8Array): StlEncoding {
  if (bytes.byteLength <= BINARY_HEADER) return "ascii";
  const n = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(80, true);
  return BINARY_HEADER + n * BINARY_FACET === bytes.byteLength ? "binary" : "ascii";
}

/** Triangle soup, nine float32 values per triangle, in file order. */
export function readStl(bytes: Uint8Array): { readonly encoding: StlEncoding; readonly soup: Float32Array } {
  const encoding = stlEncoding(bytes);
  if (encoding === "binary") {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const n = dv.getUint32(80, true);
    const soup = new Float32Array(n * 9);
    let o = BINARY_HEADER, k = 0;
    for (let i = 0; i < n; i += 1) {
      o += 12; // facet normal, ignored: winding is read off the vertices
      for (let v = 0; v < 9; v += 1) {
        soup[k++] = dv.getFloat32(o, true);
        o += 4;
      }
      o += 2; // attribute byte count
    }
    return { encoding, soup };
  }
  // Byte to char code: the vertex lines are ASCII, and mesh runs where no TextDecoder type is in scope.
  let text = "";
  for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  const nums: number[] = [];
  for (const m of text.matchAll(ASCII_VERTEX)) nums.push(+m[1]!, +m[2]!, +m[3]!);
  return { encoding, soup: Float32Array.from(nums) };
}

/** Millimetres per file unit for ImportSpec.units (spec/commands.ts); absent units take the format default. */
export const MM_PER_UNIT = { mm: 1, cm: 10, m: 1000, in: 25.4 } as const;
export type FileUnit = keyof typeof MM_PER_UNIT;

/**
 * A triangle soup in mm into a welded, hashed body: the D-054 weld, the
 * signed volume and the refusals both readers share. E_KERNEL, naming the
 * file, when the soup holds no whole triangle, a coordinate is not finite,
 * the weld leaves no triangle, or the signed volume is not positive.
 */
export function importSoup(soup: ArrayLike<number>, file: string, encoding: ImportEncoding, groups?: readonly SoupPart[]): ImportedBody {
  const trianglesRead = soup.length / 9;
  if (soup.length === 0 || !Number.isInteger(trianglesRead)) {
    throw meshError({
      code: "E_KERNEL", path: file, got: soup.length, expected: `whole triangles (nine coordinates each) in a ${encoding} ${encoding === "glb" ? "file" : "stl"}`,
      hint: `${file} holds no whole triangle; export it again${encoding === "glb" ? "" : " as binary stl"}`, record: "mesh-kernel",
    });
  }
  const positions = Float64Array.from(soup);
  if (!positions.every(Number.isFinite)) {
    throw meshError({
      code: "E_KERNEL", path: file, got: "a coordinate that is not finite", expected: "finite coordinates in mm",
      hint: `${file} holds a nan or infinite coordinate; export it again`, record: "mesh-kernel",
    });
  }
  const runs = groups ?? [{ name: basename(file), start: 0, count: trianglesRead }];
  const parts: ImportedPart[] = [];
  for (const g of runs) {
    const triangles = new Uint32Array(g.count * 3);
    for (let i = 0; i < triangles.length; i += 1) triangles[i] = i;
    const welded = snapWeld({ positions: positions.subarray(g.start * 9, (g.start + g.count) * 9), triangles });
    if (welded.triangles.length > 0) parts.push({ name: g.name, mesh: welded });
  }
  const mesh = parts.length === 1 ? parts[0]!.mesh : joinMeshes(parts.map((x) => x.mesh));
  if (mesh.triangles.length === 0) {
    throw meshError({
      code: "E_KERNEL", path: file, got: 0, expected: "at least one triangle after the 1/1024 mm weld",
      hint: `${file} collapses on the 1/1024 mm grid; check its units`, record: "mesh-kernel",
    });
  }
  const volumeMm3 = signedVolume(mesh);
  if (!(volumeMm3 > 0)) {
    // The weld moves each vertex by at most sqrt(3)/2048 mm, so the volume as read can differ in the
    // first decimal; both are stated, since the file's own number is the one another tool reports.
    const seq = new Uint32Array(positions.length / 3);
    for (let i = 0; i < seq.length; i += 1) seq[i] = i;
    const asRead = signedVolume({ positions, triangles: seq });
    throw meshError({
      code: "E_KERNEL", path: file, got: volumeMm3, expected: "signed volume above 0 mm3 (outward winding)",
      hint: `${file} has inverted winding (signed volume ${volumeMm3.toFixed(1)} mm3 after the 1/1024 mm weld, ${asRead.toFixed(1)} mm3 as read, computed); flip its normals and export it again`,
      record: "mesh-kernel",
    });
  }
  return { file, encoding, trianglesRead, mesh, meshHash: meshHash(mesh), volumeMm3, parts };
}

/**
 * Read an STL into a welded, hashed body, its lengths scaled by mmPerUnit
 * (1 for an STL in mm). Refusals as importSoup; the rp2040 pizero standin
 * reads -6506 mm3 and is refused (D-102).
 */
export function importStl(bytes: Uint8Array, file: string, mmPerUnit = 1): ImportedBody {
  const { encoding, soup } = readStl(bytes);
  return importSoup(mmPerUnit === 1 ? soup : Float64Array.from(soup, (v) => v * mmPerUnit), file, encoding);
}
