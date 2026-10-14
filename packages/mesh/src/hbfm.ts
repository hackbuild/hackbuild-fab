// The .hbfm store format behind hbf://mesh/<meshHash> (AGENT-SURFACE.md 7.1,
// M00-T04 step 6). Little-endian, no padding: ASCII "HBFM", uint32 version,
// uint32 vertexCount, uint32 triangleCount, float32 xyz per vertex, uint32
// a b c per triangle. The file is a transport copy; meshHash is computed
// from the kernel mesh, never from these bytes. float32 holds every
// coordinate on the 1/1024 mm grid within 16,384 mm exactly (24 bit
// significand), so a decoded snapped mesh hashes equal to its source.

import type { MeshData } from "./hash.js";
import { meshError } from "./routes/prism.js";

export const HBFM_MAGIC = "HBFM";
export const HBFM_VERSION = 1;
/** Magic, version, vertexCount, triangleCount, bytes. */
export const HBFM_HEADER_BYTES = 16;

/** File length for the counts, bytes: 16 + 12 per vertex + 12 per triangle. */
export function hbfmLength(vertexCount: number, triangleCount: number): number {
  return HBFM_HEADER_BYTES + 12 * vertexCount + 12 * triangleCount;
}

function refuse(got: unknown, expected: string, hint: string): never {
  throw meshError({ code: "E_KERNEL", got, expected, hint, record: "mesh-kernel" });
}

/** Write a mesh as .hbfm bytes. */
export function encodeHbfm(mesh: MeshData): Uint8Array {
  const vertexCount = mesh.positions.length / 3;
  const triangleCount = mesh.triangles.length / 3;
  if (!Number.isInteger(vertexCount) || !Number.isInteger(triangleCount)) {
    refuse({ positions: mesh.positions.length, triangles: mesh.triangles.length }, "array lengths divisible by 3", "pass xyz triples and index triples");
  }
  const bytes = new Uint8Array(hbfmLength(vertexCount, triangleCount));
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < 4; i += 1) bytes[i] = HBFM_MAGIC.charCodeAt(i);
  view.setUint32(4, HBFM_VERSION, true);
  view.setUint32(8, vertexCount, true);
  view.setUint32(12, triangleCount, true);
  let at = HBFM_HEADER_BYTES;
  for (const v of mesh.positions) {
    if (!Number.isFinite(v)) refuse(v, "finite coordinates", "rebuild the mesh; a coordinate is not finite");
    view.setFloat32(at, v, true);
    at += 4;
  }
  for (const i of mesh.triangles) {
    if (i >= vertexCount) refuse(i, `an index below ${vertexCount}`, "rebuild the mesh; a triangle names a missing vertex");
    view.setUint32(at, i, true);
    at += 4;
  }
  return bytes;
}

/** Read .hbfm bytes; refuses a wrong magic, an unknown version, a wrong length or an out-of-range index with E_KERNEL. */
export function decodeHbfm(bytes: Uint8Array): MeshData {
  if (bytes.length < HBFM_HEADER_BYTES) {
    refuse(bytes.length, `at least ${HBFM_HEADER_BYTES} bytes`, "the mesh file is truncated; rebuild to restore it");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!);
  if (magic !== HBFM_MAGIC) refuse(magic, `magic ${HBFM_MAGIC}`, "this file is not an hbfm mesh");
  const version = view.getUint32(4, true);
  if (version !== HBFM_VERSION) refuse(version, `version ${HBFM_VERSION}`, "this hbfm version is unknown; rebuild with this kernel");
  const vertexCount = view.getUint32(8, true);
  const triangleCount = view.getUint32(12, true);
  const want = hbfmLength(vertexCount, triangleCount);
  if (bytes.length !== want) {
    refuse(bytes.length, `${want} bytes for ${vertexCount} vertices and ${triangleCount} triangles`, "the mesh file length disagrees with its counts; rebuild to restore it");
  }
  const positions = new Float64Array(vertexCount * 3);
  let at = HBFM_HEADER_BYTES;
  for (let i = 0; i < positions.length; i += 1) {
    positions[i] = view.getFloat32(at, true);
    at += 4;
  }
  const triangles = new Uint32Array(triangleCount * 3);
  for (let i = 0; i < triangles.length; i += 1) {
    const idx = view.getUint32(at, true);
    if (idx >= vertexCount) refuse(idx, `an index below ${vertexCount}`, "the mesh file names a missing vertex; rebuild to restore it");
    triangles[i] = idx;
    at += 4;
  }
  return { positions, triangles };
}
