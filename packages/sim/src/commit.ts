// Commit at command time (M02-T11 step 8). The SLUG page advanced its motor
// by the frame's own dt inside requestAnimationFrame (designs/slug/legacy/
// slug.html lines 1206 to 1225, dt capped at 0.05 s), so what a vend did
// depended on which frames the host managed to draw; 03-diagnostics.md
// records the same fault as "nothing ever latches under headless"
// (swiftshader drew two frames in a 700 ms sweep). Here a command commits
// its target when it is issued (the page's btnVend, lines 965 to 969) and
// the physics steps its fixed dt until the target is reached, then holds
// for the command's window. A browser drive and the CLI call this one
// function; a frame hook only draws what a step left behind, so no frame
// schedule can move the outcome.

/** Called after every step with the step count from 1; a host draws or skips. It reads state and never changes it. */
export type FrameHook = (step: number) => void;

/** One command on a fixed-step simulation. */
export interface FixedStepCommand {
  /** Commits the command's target; runs once, before the first step. */
  commit(): void;
  /** One physics step of the scene's fixed dt. */
  step(): void;
  /** True while the committed target is not reached. */
  busy(): boolean;
  /** Steps run after the target is reached, count; the window in which the outcome is read. */
  readonly holdSteps: number;
}

export interface CommitRun {
  /** Steps run for the command, count. */
  readonly steps: number;
}

/** Commit the target, step to completion, hold; the frame hook sees every step and decides nothing. */
export function commitAtCommand(c: FixedStepCommand, frame?: FrameHook): CommitRun {
  c.commit();
  let steps = 0;
  const one = (): void => {
    c.step();
    steps += 1;
    frame?.(steps);
  };
  while (c.busy()) one();
  for (let i = 0; i < c.holdSteps; i += 1) one();
  return { steps };
}
