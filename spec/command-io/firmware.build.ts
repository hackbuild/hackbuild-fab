// command firmware.build, group make.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { Hash } from "../ids.js";

export interface FirmwareBuildIO {
  input: {
    /** A sketch folder (it holds <folder name>.ino), relative to the workspace or absolute. */
    sketch: string;
    /** Fully qualified board name for arduino-cli, for example rp2040:rp2040:rpipico; the core must be installed. */
    fqbn: string;
  };
  output: {
    status: "built" | "failed" | "not run";
    /** The compiler's first error line, or why it did not run. */
    reason: string;
    fqbn: string;
    /** arduino-cli and its version, from registry/runners.json detection. */
    runner: string;
    /** Temporary folder holding the build outputs; empty when not run. Nothing is flashed. */
    outDir: string;
    /** The images the build wrote (.uf2, .bin, .hex, .elf), each hashed. */
    images: readonly { readonly path: string; readonly bytes: number; readonly sha256: Hash }[];
    /** Section sizes as arduino-cli reports them, bytes (computed by the toolchain). */
    sections: readonly { readonly name: string; readonly size: number; readonly maxSize: number }[];
    /** Compiler warning lines. */
    warnings: readonly string[];
  };
}
