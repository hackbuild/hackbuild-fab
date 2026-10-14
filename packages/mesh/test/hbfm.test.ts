// M00-T04 step 6: the .hbfm store format round trip and its refusals.

import { isThrownCommandError } from "@hackbuild/spec";
import { describe, expect, it } from "vitest";
import { decodeHbfm, encodeHbfm, hbfmLength, meshHash, snapMesh, type MeshData } from "../src/index.js";
import { cube, join } from "./fixtures.js";

function kernelError(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf.code;
    throw e;
  }
  return "no error";
}

describe("hbfm", () => {
  it("round trips a cube with equal counts, bit-equal float32 positions and equal indices", () => {
    const src = cube(10, [1.5, -2.25, 3]);
    const bytes = encodeHbfm(src);
    const back = decodeHbfm(bytes);
    expect(back.positions.length).toBe(src.positions.length);
    expect(back.triangles.length).toBe(src.triangles.length);
    expect(new Uint8Array(Float32Array.from(back.positions).buffer)).toEqual(new Uint8Array(Float32Array.from(src.positions).buffer));
    expect(Array.from(back.triangles)).toEqual(Array.from(src.triangles));
  });

  it("starts with HBFM, 1, 8, 12 and is 256 bytes (computed) for a cube", () => {
    const bytes = encodeHbfm(cube());
    const view = new DataView(bytes.buffer);
    expect(String.fromCharCode(...bytes.subarray(0, 4))).toBe("HBFM");
    expect([view.getUint32(4, true), view.getUint32(8, true), view.getUint32(12, true)]).toEqual([1, 8, 12]);
    expect(bytes.length).toBe(16 + 12 * 8 + 12 * 12);
    expect(bytes.length).toBe(256);
    expect(hbfmLength(8, 12)).toBe(256);
  });

  it("keeps meshHash for a mesh snapped to the 1/1024 mm grid within 16,384 mm", () => {
    // Coordinates up to 16,383.999 mm on the grid need 24 significand bits, which float32 has.
    const far: MeshData = snapMesh(join(cube(0.1, [16383.5, -16383.9, 0.001]), cube(7.3, [-12.34, 5.678, 9001.1])));
    const back = decodeHbfm(encodeHbfm(far));
    expect(Array.from(back.positions)).toEqual(Array.from(far.positions));
    expect(meshHash(back)).toBe(meshHash(far));
  });

  it("refuses a wrong magic, version 2, a truncated file and an out-of-range index with E_KERNEL", () => {
    const good = encodeHbfm(cube());

    const magic = good.slice();
    magic[0] = "X".charCodeAt(0);
    expect(kernelError(() => decodeHbfm(magic))).toBe("E_KERNEL");

    const version = good.slice();
    new DataView(version.buffer).setUint32(4, 2, true);
    expect(kernelError(() => decodeHbfm(version))).toBe("E_KERNEL");

    expect(kernelError(() => decodeHbfm(good.slice(0, good.length - 1)))).toBe("E_KERNEL");
    expect(kernelError(() => decodeHbfm(good.slice(0, 10)))).toBe("E_KERNEL");

    const index = good.slice();
    new DataView(index.buffer).setUint32(index.length - 4, 8, true);
    expect(kernelError(() => decodeHbfm(index))).toBe("E_KERNEL");

    expect(kernelError(() => decodeHbfm(good))).toBe("no error");
  });
});
