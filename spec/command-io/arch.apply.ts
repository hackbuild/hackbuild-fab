// command arch.apply, group author.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { AppliedArchetype, MaterialSlot } from "../chase.js";
import type { FaceFrame, FaceRef } from "../ids.js";
import type { Params } from "./_shared.js";

export interface ArchApplyIO {
  /**
   * chase names the design directory the part comes from (M06-T12; the
   * card's acceptance line names none). face may also be a FaceFrame, as
   * the card's acceptance passes it; arch.apply turns it into a FaceRef on
   * the declared face whose plane and u it lies on, E_REF otherwise.
   */
  input: { chase?: string; part: string; face: FaceRef | FaceFrame; id: string; params?: Params };
  /**
   * face.ref must be a face id the part declares (Author.face), E_REF with
   * didYouMean over the declared ids otherwise (exit 2). When the part
   * declares no faces (an imported part, D-146), E_REF carries hint "this
   * part declares no faces; declare one with Author.face in build.ts" and
   * next [{command: "part.probe", args: {part, ray: {origin: [cx, cy,
   * zmax + 10], dir: [0, 0, -1]}}, why: "find the face point and normal
   * to declare"}, {command: "chase.patch", args: {file:
   * "<chase>/build.ts"}, why: "add k.face(...) with that frame"}], where
   * cx, cy and zmax come from the body's mesh bbox.
   * Writes the applied entry, plus any material slot the archetype needs
   * and chase.materials lacks, as one patch on hbf/<chase> (D-115, D-165).
   * emitted and ports are the ids the next part.build merge will produce.
   */
  output: {
    emitted: readonly string[];
    ports: readonly string[];
    applied: AppliedArchetype;
    slotsAdded: readonly MaterialSlot[];
    /**
     * Kernels the emitted feature kinds need that chase.meta.kernels lacks
     * (a conductor needs circuit); part of the same patch. Added at M06-T12.
     */
    kernelsAdded: readonly string[];
    /** hbf/<chase>, the branch the patch belongs on (D-115). Added at M06-T12. */
    branch: string;
    /**
     * True when chase.patch wrote the entry, slots and kernels to chase.ts
     * on hbf/<chase> (M10-T05 step 4, D-115). False for a chase outside
     * designs/<name> in a git work tree, or a patch the writer refused;
     * notWritten says why.
     */
    written: boolean;
    notWritten?: string;
  };
}
