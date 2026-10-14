// tilt-stick's params and dispatch over its two sources (M06-T09 step 4):
// the PIP preset (src/pip/stick.ts, the default when no preset is named)
// and the TOGGLE presets solo4, solo8 and blocks8 (./toggle.ts). A TOGGLE
// preset name fills the preset's patch under the params given, as the
// original's T.preset patches blankState (part2a.js lines 46 to 51).

import { z } from "zod";
import type { ApplyIn, ApplyOut, DerivedValue, ProfileLookup, SchemaLike } from "@hackbuild/spec";
import { stickApply, stickDerive, stickParams, type StickParams } from "../pip/stick.js";
import { TOGGLE_PRESETS, toggleApply, toggleDerive, toggleParams, type ToggleParams } from "./toggle.js";

export const TILT_STICK_PRESETS = ["pip", "solo4", "solo8", "blocks8"] as const;

const pipBranch = stickParams.extend({ preset: z.literal("pip").default("pip") });
const toggleBranch = toggleParams.extend({ preset: z.enum(["solo4", "solo8", "blocks8"]) });

const tiltStickParams = z.preprocess((v) => {
  if (typeof v !== "object" || v === null) return v;
  const p = (v as { preset?: unknown }).preset;
  return typeof p === "string" && p in TOGGLE_PRESETS ? { ...TOGGLE_PRESETS[p as keyof typeof TOGGLE_PRESETS], ...v } : v;
}, z.union([pipBranch, toggleBranch]));

export type TiltStickParams = (StickParams & { readonly preset: "pip" }) | (ToggleParams & { readonly preset: "solo4" | "solo8" | "blocks8" });
export const TILT_STICK_PARAMS = tiltStickParams as unknown as SchemaLike<unknown, TiltStickParams>;

const isToggle = (p: TiltStickParams): p is ToggleParams & { readonly preset: "solo4" | "solo8" | "blocks8" } => p.preset !== "pip";

export function tiltStickDerive(p: TiltStickParams, profile: ProfileLookup): Record<string, DerivedValue> {
  if (isToggle(p)) { const { preset: _, ...t } = p; return toggleDerive(t, profile); }
  const { preset: _, ...s } = p;
  return stickDerive(s, profile);
}

export function tiltStickApply(input: ApplyIn<TiltStickParams>, id: string): ApplyOut {
  const p = input.params;
  if (isToggle(p)) { const { preset: _, ...t } = p; return toggleApply({ ...input, params: t }, id); }
  const { preset: _, ...s } = p;
  return stickApply({ ...input, params: s }, id);
}
