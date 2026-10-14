// The intake stage (M03-T02 step 6): a photo stack or a model-returned plate
// becomes one flat RGBA source before quantize. Warp, stack, knockout and
// trim follow badge-replicator src/lib/composite.ts runComposite and
// src/stores/extract.ts refine (lineage inlay.intake-compose/badge-replicator,
// inlay.intake-trim/badge-replicator). The first marked shot sets the output
// size, as src/stores/capture.ts suggestOutputSize does.

import { commandError } from "@hackbuild/spec";
import { suggestSize, warpToRect } from "./homography.js";
import { checkImage, checkSide, row, type KnockoutOptions, type Point, type RgbaImage, type StackOptions } from "./image.js";
import { applyKnockout, contentBounds, cropTo, defaultKnockout } from "./knockout.js";
import { createReducer, defaultStack, stackLayers, STACK_METHOD_LABELS } from "./stack.js";

export * from "./image.js";
export * from "./homography.js";
export * from "./stack.js";
export * from "./knockout.js";

export type IntakeStepName = "warp" | "stack" | "knockout" | "trim";

export interface IntakeStep {
  readonly step: IntakeStepName;
  readonly ran: boolean;
  /** One lowercase line saying what the step did or why it did not run. */
  readonly detail: string;
}

export interface IntakeOptions {
  /** Output rectangle in pixels. Absent: the first shot with four corners sets it by suggestSize, else the first shot's size. */
  readonly width?: number;
  readonly height?: number;
  /** Glare rejection across two or more shots. Absent: defaultStack(). null skips, legal for one shot only. */
  readonly stack?: StackOptions | null;
  /** Background cut. Absent: defaultKnockout(). null or mode none skips the cut and the trim. */
  readonly knockout?: KnockoutOptions | null;
  readonly onProgress?: (phase: "warp" | "stack", value: number) => void;
}

export interface IntakeResult {
  readonly image: RgbaImage;
  /** warp, stack, knockout, trim, in that order, each with ran and detail. */
  readonly steps: readonly IntakeStep[];
}

export async function intake(
  shots: readonly RgbaImage[],
  corners: readonly (readonly Point[] | null)[] | null,
  opts: IntakeOptions = {},
): Promise<IntakeResult> {
  if (shots.length === 0) {
    throw commandError({ code: "E_SCHEMA", path: "/shots", got: 0, expected: "at least 1 shot", hint: "load at least one shot; there is nothing to composite" });
  }
  if (corners !== null && corners.length !== shots.length) {
    throw commandError({ code: "E_SCHEMA", path: "/corners", got: corners.length, expected: `${shots.length} entries, one per shot (null for a pre-aligned shot)`, hint: "give one corner set or null per shot" });
  }
  shots.forEach((shot, i) => checkImage(shot, `/shots/${i}`));
  const marked = (i: number): readonly Point[] | null => {
    const c = corners === null ? null : row(corners, i);
    return c !== null && c.length === 4 ? c : null;
  };

  const first = shots.findIndex((_, i) => marked(i) !== null);
  const firstMarked = first < 0 ? null : marked(first);
  const fallback = firstMarked === null ? row(shots, 0) : suggestSize(firstMarked);
  const width = opts.width ?? fallback.width;
  const height = opts.height ?? fallback.height;
  checkSide(width, height, "/size");

  const steps: IntakeStep[] = [];
  const layers: Uint8ClampedArray[] = [];
  let warped = 0;
  for (let i = 0; i < shots.length; i++) {
    const shot = row(shots, i);
    const c = marked(i);
    if (c !== null) {
      layers.push(warpToRect(shot, c, width, height));
      warped++;
    } else if (shot.width === width && shot.height === height) {
      layers.push(shot.data);
    } else {
      // Resampling an unmarked shot to the output size is a canvas job (D-045); the caller's Surface does it.
      throw commandError({
        code: "E_SCHEMA",
        path: `/shots/${i}`,
        got: `${shot.width} x ${shot.height}`,
        expected: `${width} x ${height}, or four corners in /corners/${i}`,
        hint: "mark the four card corners on this shot, or resample it to the output size first",
      });
    }
    opts.onProgress?.("warp", (i + 1) / shots.length);
  }
  steps.push(warped > 0
    ? { step: "warp", ran: true, detail: `warped ${warped} of ${shots.length} shots to ${width} x ${height}` }
    : { step: "warp", ran: false, detail: "no shot has four corners; shots used as given" });

  const stackOpts = opts.stack === undefined ? defaultStack() : opts.stack;
  let image: RgbaImage;
  if (layers.length > 1) {
    if (stackOpts === null) {
      throw commandError({ code: "E_SCHEMA", path: "/stack", got: null, expected: "stack options when 2 or more shots are given", hint: "pick a stack method, or pass one shot" });
    }
    const data = await stackLayers(layers, width, height, createReducer(stackOpts), (v) => opts.onProgress?.("stack", v));
    image = { width, height, data };
    steps.push({ step: "stack", ran: true, detail: `${STACK_METHOD_LABELS[stackOpts.method]} of ${layers.length} shots` });
  } else {
    image = { width, height, data: row(layers, 0) };
    steps.push({ step: "stack", ran: false, detail: "one shot; nothing to reject" });
  }

  const ko = opts.knockout === undefined ? defaultKnockout() : opts.knockout;
  if (ko === null || ko.mode === "none") {
    steps.push({ step: "knockout", ran: false, detail: "knockout off" });
    steps.push({ step: "trim", ran: false, detail: "trim follows the knockout; knockout off" });
    return { image, steps };
  }
  image = applyKnockout(image, ko);
  steps.push({ step: "knockout", ran: true, detail: ko.mode === "key" ? `key [${ko.key.join(", ")}] tolerance ${ko.tolerance} softness ${ko.softness}` : `edges from the border colour, tolerance ${ko.tolerance} softness ${ko.softness}` });

  if (!ko.trim) {
    steps.push({ step: "trim", ran: false, detail: "trim off" });
    return { image, steps };
  }
  const bounds = contentBounds(image);
  if (bounds === null) {
    steps.push({ step: "trim", ran: false, detail: "nothing at alpha 8 or above is left; kept uncropped" });
  } else if (bounds.width < image.width || bounds.height < image.height) {
    image = cropTo(image, bounds);
    steps.push({ step: "trim", ran: true, detail: `cropped to ${bounds.width} x ${bounds.height} at ${bounds.x}, ${bounds.y}` });
  } else {
    steps.push({ step: "trim", ran: false, detail: "content fills the frame; nothing to crop" });
  }
  return { image, steps };
}
