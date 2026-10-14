// The GLB reader of the imported route (M04-T14 step 3, D-160). No original
// in knowledge/designs reads a GLB into a solid (LUG and GROMMET parse one
// with three.js GLTFLoader for display only, lug.md "GLB placement" row),
// so the reader follows the Khronos glTF 2.0 specification by section name:
// the GLB file format (12 byte header, a JSON chunk, then a BIN chunk),
// nodes and hierarchy with their transformations, accessors, and meshes
// with their primitives. It keeps triangle primitives of every mesh node in the
// default scene, applies each node's world transform, and hands the soup to
// importSoup, so the weld, signed volume and winding rules equal the STL
// reader's.
//
// What the reader adds to the format: glTF is +Y up and the kernel is +Z
// up (the bed normal), so +Y maps to +Z by a proper rotation about +X, (x,
// y, z) to (x, -z, y), which keeps winding and volume. A node whose world
// transform has a negative determinant reverses its triangles, as the glTF
// meshes section requires of a renderer. A primitive mode other than triangles (4), a
// sparse or normalized position accessor, a buffer outside the BIN chunk,
// or a required extension (Draco and meshopt compression) is E_KERNEL
// naming the file and the node.

import { importSoup, type ImportedBody, type SoupPart } from "./imported.js";
import { meshError } from "./prism.js";

const GLB_MAGIC = 0x46546c67; // "glTF"
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;
const MODE_TRIANGLES = 4;
const FLOAT = 5126;
/** Index component types glTF allows: unsigned byte, short and int, with their byte sizes. */
const INDEX_BYTES: Readonly<Record<number, number>> = { 5121: 1, 5123: 2, 5125: 4 };

interface GltfAccessor {
  readonly bufferView?: number;
  readonly byteOffset?: number;
  readonly componentType: number;
  readonly normalized?: boolean;
  readonly count: number;
  readonly type: string;
  readonly sparse?: unknown;
}
interface GltfBufferView { readonly buffer: number; readonly byteOffset?: number; readonly byteLength: number; readonly byteStride?: number }
interface GltfPrimitive { readonly attributes: Readonly<Record<string, number>>; readonly indices?: number; readonly mode?: number }
interface GltfNode {
  readonly name?: string;
  readonly mesh?: number;
  readonly children?: readonly number[];
  readonly matrix?: readonly number[];
  readonly translation?: readonly number[];
  readonly rotation?: readonly number[];
  readonly scale?: readonly number[];
}
interface Gltf {
  readonly asset?: { readonly version?: string };
  readonly scene?: number;
  readonly scenes?: readonly { readonly nodes?: readonly number[] }[];
  readonly nodes?: readonly GltfNode[];
  readonly meshes?: readonly { readonly primitives: readonly GltfPrimitive[] }[];
  readonly accessors?: readonly GltfAccessor[];
  readonly bufferViews?: readonly GltfBufferView[];
  readonly buffers?: readonly { readonly uri?: string; readonly byteLength: number }[];
  readonly extensionsRequired?: readonly string[];
}

/** A column-major 4x4 matrix, glTF's layout. */
type Mat4 = readonly number[];

/** +Y up to +Z up: (x, y, z) to (x, -z, y), column-major. */
const Y_UP_TO_Z_UP: Mat4 = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1];

function mul(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16).fill(0);
  for (let c = 0; c < 4; c += 1) {
    for (let r = 0; r < 4; r += 1) {
      let s = 0;
      for (let k = 0; k < 4; k += 1) s += a[k * 4 + r]! * b[c * 4 + k]!;
      out[c * 4 + r] = s;
    }
  }
  return out;
}

/** T x R x S of a node (glTF transformations), or its matrix. */
function localOf(n: GltfNode): Mat4 {
  if (n.matrix !== undefined) return n.matrix;
  const [tx, ty, tz] = n.translation ?? [0, 0, 0];
  const [qx, qy, qz, qw] = n.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = n.scale ?? [1, 1, 1];
  const x = qx!, y = qy!, z = qz!, w = qw!;
  const r = [
    1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w),
    2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w),
    2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y),
  ];
  return [
    r[0]! * sx!, r[1]! * sx!, r[2]! * sx!, 0,
    r[3]! * sy!, r[4]! * sy!, r[5]! * sy!, 0,
    r[6]! * sz!, r[7]! * sz!, r[8]! * sz!, 0,
    tx!, ty!, tz!, 1,
  ];
}

const det3 = (m: Mat4): number =>
  m[0]! * (m[5]! * m[10]! - m[9]! * m[6]!) - m[4]! * (m[1]! * m[10]! - m[9]! * m[2]!) + m[8]! * (m[1]! * m[6]! - m[5]! * m[2]!);

/** UTF-8 to a string; mesh runs where no TextDecoder type is in scope. A malformed sequence throws. */
function utf8(b: Uint8Array): string {
  const cps: number[] = [];
  for (let i = 0; i < b.length;) {
    const c = b[i]!;
    const n = c < 0x80 ? 0 : c >= 0xf0 ? 3 : c >= 0xe0 ? 2 : c >= 0xc0 ? 1 : -1;
    if (n < 0 || i + n >= b.length + (n === 0 ? 1 : 0)) throw new RangeError("utf-8");
    let cp = n === 0 ? c : c & (0x3f >> n);
    for (let k = 1; k <= n; k += 1) {
      const d = b[i + k]!;
      if ((d & 0xc0) !== 0x80) throw new RangeError("utf-8");
      cp = (cp << 6) | (d & 0x3f);
    }
    cps.push(cp);
    i += n + 1;
  }
  let s = "";
  for (let i = 0; i < cps.length; i += 8192) s += String.fromCodePoint(...cps.slice(i, i + 8192));
  return s;
}

/** The JSON and BIN chunks of a GLB; E_KERNEL naming the file when the container is not glTF 2.0 binary. */
export function readGlbChunks(bytes: Uint8Array, file: string): { readonly json: Gltf; readonly bin: Uint8Array | undefined } {
  const refuse = (got: unknown, expected: string): never => {
    throw meshError({ code: "E_KERNEL", path: file, got, expected, hint: `${file} is not a glTF 2.0 binary; export it again as glb`, record: "mesh-kernel" });
  };
  if (bytes.byteLength < 20) refuse(bytes.byteLength, "a 12 byte header and a JSON chunk");
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (dv.getUint32(0, true) !== GLB_MAGIC) refuse(dv.getUint32(0, true), "magic 0x46546c67 (glTF)");
  if (dv.getUint32(4, true) !== 2) refuse(dv.getUint32(4, true), "container version 2");
  const total = dv.getUint32(8, true);
  if (total > bytes.byteLength) refuse(bytes.byteLength, `${total} bytes as the header states`);
  let json: Gltf | undefined;
  let bin: Uint8Array | undefined;
  for (let o = 12; o + 8 <= total;) {
    const len = dv.getUint32(o, true);
    const type = dv.getUint32(o + 4, true);
    const body = bytes.subarray(o + 8, o + 8 + len);
    if (body.byteLength !== len) refuse(body.byteLength, `a chunk of ${len} bytes`);
    if (type === CHUNK_JSON && json === undefined) {
      try {
        json = JSON.parse(utf8(body)) as Gltf;
      } catch {
        refuse("a JSON chunk that does not parse", "UTF-8 JSON");
      }
    } else if (type === CHUNK_BIN && bin === undefined) bin = body;
    o += 8 + len;
  }
  if (json === undefined) return refuse("no JSON chunk", "a JSON chunk first");
  if (!String(json.asset?.version ?? "").startsWith("2.")) refuse(json.asset?.version, "asset.version 2.x");
  return { json, bin };
}

/**
 * Triangle soup in file units, +Z up, nine values per triangle, in scene
 * order: nodes depth first from the default scene's roots, primitives in
 * mesh order. parts names the triangles of each mesh node, the file's own
 * part structure (one mesh placed by two nodes is two parts).
 */
export function readGlb(bytes: Uint8Array, file: string): { readonly soup: Float64Array; readonly parts: readonly SoupPart[] } {
  const { json, bin } = readGlbChunks(bytes, file);
  const nodes = json.nodes ?? [];
  const kernel = (at: string, got: unknown, expected: string, hint: string): never => {
    throw meshError({ code: "E_KERNEL", path: `${file}${at}`, got, expected, hint, record: "mesh-kernel" });
  };
  const required = json.extensionsRequired ?? [];
  if (required.length > 0) kernel("/extensionsRequired", required.join(", "), "no required extension", `${file} needs ${required.join(", ")}; export it again without mesh compression`);

  const view = (index: number | undefined, at: string): { readonly bytes: Uint8Array; readonly stride: number | undefined } => {
    const bv = index === undefined ? undefined : json.bufferViews?.[index];
    if (bv === undefined) return kernel(at, index, "a bufferView", `${file} names a bufferView it does not hold`);
    const buf = json.buffers?.[bv.buffer];
    if (bv.buffer !== 0 || buf === undefined || buf.uri !== undefined || bin === undefined) {
      return kernel(at, bv.buffer, "buffer 0, the BIN chunk", `${file} keeps geometry outside its BIN chunk; export it again as a self-contained glb`);
    }
    const start = bv.byteOffset ?? 0;
    if (start + bv.byteLength > bin.byteLength) kernel(at, start + bv.byteLength, `at most ${bin.byteLength} bytes`, `${file} has a bufferView past its BIN chunk`);
    return { bytes: bin.subarray(start, start + bv.byteLength), stride: bv.byteStride };
  };

  const positions = (index: number, at: string): Float64Array => {
    const a = json.accessors?.[index];
    if (a === undefined) return kernel(at, index, "an accessor", `${file} names an accessor it does not hold`);
    if (a.sparse !== undefined || a.componentType !== FLOAT || a.type !== "VEC3" || a.normalized === true) {
      kernel(at, `${a.type} ${a.componentType}${a.sparse === undefined ? "" : " sparse"}`, "VEC3 float 5126, dense", `${file} stores positions in a form this reader does not take; export float positions`);
    }
    const v = view(a.bufferView, `${at}/bufferView`);
    const stride = v.stride ?? 12;
    const off = a.byteOffset ?? 0;
    if (a.count > 0 && off + (a.count - 1) * stride + 12 > v.bytes.byteLength) kernel(at, a.count, `at most ${v.bytes.byteLength} bytes of positions`, `${file} has a position accessor past its bufferView`);
    const dv = new DataView(v.bytes.buffer, v.bytes.byteOffset, v.bytes.byteLength);
    const out = new Float64Array(a.count * 3);
    for (let i = 0; i < a.count; i += 1) {
      for (let k = 0; k < 3; k += 1) out[i * 3 + k] = dv.getFloat32(off + i * stride + k * 4, true);
    }
    return out;
  };

  const indices = (index: number | undefined, vertices: number, at: string): Uint32Array => {
    if (index === undefined) {
      const seq = new Uint32Array(vertices);
      for (let i = 0; i < vertices; i += 1) seq[i] = i;
      return seq;
    }
    const a = json.accessors?.[index];
    const size = a === undefined ? undefined : INDEX_BYTES[a.componentType];
    if (a === undefined || size === undefined || a.type !== "SCALAR" || a.sparse !== undefined) {
      return kernel(at, a === undefined ? index : `${a.type} ${a.componentType}`, "SCALAR indices of type 5121, 5123 or 5125", `${file} stores indices in a form glTF does not allow`);
    }
    const v = view(a.bufferView, `${at}/bufferView`);
    const off = a.byteOffset ?? 0;
    if (off + a.count * size > v.bytes.byteLength) kernel(at, a.count, `at most ${v.bytes.byteLength} bytes of indices`, `${file} has an index accessor past its bufferView`);
    const dv = new DataView(v.bytes.buffer, v.bytes.byteOffset, v.bytes.byteLength);
    const out = new Uint32Array(a.count);
    for (let i = 0; i < a.count; i += 1) {
      const o = off + i * size;
      const ix = size === 1 ? dv.getUint8(o) : size === 2 ? dv.getUint16(o, true) : dv.getUint32(o, true);
      if (ix >= vertices) kernel(at, ix, `an index below ${vertices}`, `${file} has an index past its positions`);
      out[i] = ix;
    }
    return out;
  };

  const soup: number[] = [];
  const parts: SoupPart[] = [];
  const visit = (ni: number, parent: Mat4, seen: ReadonlySet<number>): void => {
    const n = nodes[ni];
    if (n === undefined || seen.has(ni)) kernel(`/nodes/${ni}`, ni, "a node the file holds, visited once", `${file} has a node cycle or a missing node`);
    const world = mul(parent, localOf(n!));
    const name = n!.name ?? `node ${ni}`;
    if (n!.mesh !== undefined) {
      const mesh = json.meshes?.[n!.mesh];
      if (mesh === undefined) kernel(`/nodes/${ni}/mesh`, n!.mesh, "a mesh the file holds", `${file} node ${name} names a missing mesh`);
      const flip = det3(world) < 0;
      const start = soup.length / 9;
      mesh!.primitives.forEach((p, pi) => {
        const at = `/meshes/${n!.mesh}/primitives/${pi}`;
        const mode = p.mode ?? MODE_TRIANGLES;
        if (mode !== MODE_TRIANGLES) {
          kernel(at, mode, "mode 4 (triangles)", `${file} node ${name} holds a primitive of mode ${mode}; only triangles have a volume`);
        }
        const pos = p.attributes["POSITION"];
        if (pos === undefined) kernel(`${at}/attributes`, "no POSITION", "a POSITION accessor", `${file} node ${name} has a primitive without positions`);
        const xyz = positions(pos!, `${at}/attributes/POSITION`);
        const idx = indices(p.indices, xyz.length / 3, `${at}/indices`);
        if (idx.length % 3 !== 0) kernel(`${at}/indices`, idx.length, "a multiple of 3", `${file} node ${name} has a partial triangle`);
        for (let t = 0; t < idx.length; t += 3) {
          const corners = flip ? [idx[t]!, idx[t + 2]!, idx[t + 1]!] : [idx[t]!, idx[t + 1]!, idx[t + 2]!];
          for (const c of corners) {
            const x = xyz[c * 3]!, y = xyz[c * 3 + 1]!, z = xyz[c * 3 + 2]!;
            soup.push(
              world[0]! * x + world[4]! * y + world[8]! * z + world[12]!,
              world[1]! * x + world[5]! * y + world[9]! * z + world[13]!,
              world[2]! * x + world[6]! * y + world[10]! * z + world[14]!,
            );
          }
        }
      });
      parts.push({ name, start, count: soup.length / 9 - start });
    }
    const next = new Set(seen).add(ni);
    for (const c of n!.children ?? []) visit(c, world, next);
  };

  const scene = json.scenes?.[json.scene ?? 0];
  const children = new Set(nodes.flatMap((n) => n.children ?? []));
  const roots = scene?.nodes ?? nodes.map((_, i) => i).filter((i) => !children.has(i));
  for (const r of roots) visit(r, Y_UP_TO_Z_UP, new Set());
  return { soup: Float64Array.from(soup), parts };
}

/**
 * Read a GLB into a welded, hashed body, lengths scaled by mmPerUnit (glTF
 * states lengths in metres, so ImportSpec defaults GLB to m, 1000). Refusals as
 * importSoup, plus the container and primitive refusals of readGlb.
 */
export function importGlb(bytes: Uint8Array, file: string, mmPerUnit = 1): ImportedBody {
  const { soup, parts } = readGlb(bytes, file);
  return importSoup(mmPerUnit === 1 ? soup : soup.map((v) => v * mmPerUnit), file, "glb", parts);
}
