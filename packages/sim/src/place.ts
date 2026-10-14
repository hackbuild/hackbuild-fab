// sim takes place(pose) (D-139, PACKAGES.md 5.8). Every pose of a moving
// part comes from the kinematics module in packages/motion, which sim may
// not import (tools/tiers.json); core binds it to the interface below and
// hands it over as SceneDeps.kinematics, and tests that sweep a placed
// machine run in core/test. sim applies the matrices it is given to proxy
// points and meshes; it computes none.

/** Row-major 4x4, 16 numbers, mm. */
export type Mat4 = readonly number[];

export function applyPoint(m: Mat4, p: readonly number[]): [number, number, number] {
  const x = p[0]!, y = p[1]!, z = p[2]!;
  return [m[0]! * x + m[1]! * y + m[2]! * z + m[3]!, m[4]! * x + m[5]! * y + m[6]! * z + m[7]!, m[8]! * x + m[9]! * y + m[10]! * z + m[11]!];
}

/** DAVIT joint angles in degrees: pitch, roll, elbow, wrist, grip. */
export interface DavitPose {
  readonly pitch: number;
  readonly roll: number;
  readonly elbow: number;
  readonly wrist: number;
  readonly grip: number;
}

/** One placed DAVIT body: name, arm ("" for the mount), world matrix. */
export interface DavitPlacedBody {
  readonly n: string;
  readonly side: "R" | "L" | "";
  readonly m: Mat4;
}

/** One placed OGEE16 part: name, STL base name, world matrix. */
export interface OgeePlacedPart {
  readonly name: string;
  readonly file: string;
  readonly at: Mat4;
}

/** The placements sim reads, bound by core to packages/motion's kinematics module. */
export interface SceneKinematics {
  readonly davit: {
    /** The mount, both bases and each arm's seven links and ten hardware pieces, in davit.html order. */
    place(model: "std" | "mini", pipe: "1in" | "125in" | "15in", pose: Readonly<Record<"R" | "L", DavitPose>>): readonly DavitPlacedBody[];
  };
  readonly ogee16: {
    /** The params.scad scalars the kinematics read (kin.load_params). */
    readonly params: ReadonlyMap<string, number>;
    /** audit_print.py build(zR, zC, lp): every part in its order. */
    place(state: { readonly zR: readonly number[]; readonly zC: readonly number[]; readonly lp: number }): readonly OgeePlacedPart[];
    /** check_sweep.py main(): a bar crank or the latch crank at stroke fraction u, 0 to 1. */
    crank(kind: "row" | "col" | "latch", index: number, u: number): Mat4;
    /** kin.crank_phi: the bar crank angle, deg, at a bar rise, mm. */
    crankPhi(rise: number): number;
    /** The latch crank angle, deg, at a plate slide, mm. */
    lCrankPhi(slide: number): number;
  };
}

/** A scene module that reads placements exports this; the scene loader calls it with SceneDeps.kinematics. */
export type BindKinematics = (k: SceneKinematics) => void;
