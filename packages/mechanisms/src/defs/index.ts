// Every def file in this directory, in file name order, then the originals
// canon additions of originals/ (M06-T14). load.test.ts fails
// when this list and the directory disagree.

import type { MechanismDef } from "@hackbuild/spec";
import { aileronDifferential } from "./aileron-differential.js";
import { capsulePocketRotor } from "./capsule-pocket-rotor.js";
import { coandaGate } from "./coanda-gate.js";
import { coincidenceAnd } from "./coincidence-and.js";
import { countWheelDetent } from "./count-wheel-detent.js";
import { counterbalanceBand } from "./counterbalance-band.js";
import { crankYoke } from "./crank-yoke.js";
import { detentLatch } from "./detent-latch.js";
import { differentialXor } from "./differential-xor.js";
import { displacementCoincidenceLatch } from "./displacement-coincidence-latch.js";
import { fingerJoint } from "./finger-joint.js";
import { genevaExternal } from "./geneva-external.js";
import { inhibit } from "./inhibit.js";
import { integerMeteringRatio } from "./integer-metering-ratio.js";
import { livingHinge } from "./living-hinge.js";
import { membraneValve } from "./membrane-valve.js";
import { pinFreeBalanceBeam } from "./pin-free-balance-beam.js";
import { ratchetPawl } from "./ratchet-pawl.js";
import { shiftDrum } from "./shift-drum.js";
import { slewRingJoint } from "./slew-ring-joint.js";
import { snapCSocketLip } from "./snap-c-socket-lip.js";
import { snapFingerCollar } from "./snap-finger-collar.js";
import { snapFlexure } from "./snap-flexure.js";
import { snapHolsterTab } from "./snap-holster-tab.js";
import { snapPressPlugRibs } from "./snap-press-plug-ribs.js";
import { snapTongueRelief } from "./snap-tongue-relief.js";
import { spurPair } from "./spur-pair.js";
import { teeterNot } from "./teeter-not.js";
import { teslaValve } from "./tesla-valve.js";
import { tumblerCodedAnd } from "./tumbler-coded-and.js";
import { wedgeOr } from "./wedge-or.js";
import { whiffletreeDac } from "./whiffletree-dac.js";
import { ORIGINAL_MECHANISM_DEFS } from "./originals/index.js";

export const MECHANISM_DEFS: readonly MechanismDef[] = [
  aileronDifferential,
  capsulePocketRotor,
  coandaGate,
  coincidenceAnd,
  countWheelDetent,
  counterbalanceBand,
  crankYoke,
  detentLatch,
  differentialXor,
  displacementCoincidenceLatch,
  fingerJoint,
  genevaExternal,
  inhibit,
  integerMeteringRatio,
  livingHinge,
  membraneValve,
  pinFreeBalanceBeam,
  ratchetPawl,
  shiftDrum,
  slewRingJoint,
  snapCSocketLip,
  snapFingerCollar,
  snapFlexure,
  snapHolsterTab,
  snapPressPlugRibs,
  snapTongueRelief,
  spurPair,
  teeterNot,
  teslaValve,
  tumblerCodedAnd,
  wedgeOr,
  whiffletreeDac,
  // The originals canon additions (M06-T14, D-222).
  ...ORIGINAL_MECHANISM_DEFS,
];
