// The TANG R6 archetype ports (M06-T09): the membrane slider on the neck
// wall and the printed rotary pot, from originals/tang-r6 (D-222). The 2D
// primitives stay module-local; their names would shadow the PIP ones.

export { TANG_SC, TANG_SLOTS, TangEmit, tangSnap, type TangSlot } from "./common.js";
export * from "./neck.js";
export * from "./pot.js";
