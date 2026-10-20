// readout.signal (plan v9 section 3.2: what the MCU reads): one hookup pin
// as its firmware sees it now, the pin, the level, the resistance behind
// it, the time the read takes and one message line. The widget's fn is the
// hookup port it reads. A charge-release pin reads through drive.touch's
// chargeReadNow (the CHK-NET-29 record and the drive pad's level
// equations); an adc pin reads through drive.fader's faderRead on the one
// finger pot of the build. The readout computes nothing of its own, so the
// control and the readout of one pin cannot disagree.

import type { Metric, PinState, WidgetDecl } from "@hackbuild/spec";
import { fmt } from "../bench/locate.js";
import { liveOutputs } from "./live.js";
import { chargeReadNow, touchLine } from "./touch.js";
import { FADER_ROWS, faderRead, faderRows, fingerPos } from "./fader.js";
import type { WidgetEntry, WidgetModel } from "./registry.js";

export interface SignalModel extends WidgetModel {
  /** The read model of the pin, or null when the widget refused. */
  readonly model: string | null;
}

function refusal(decl: WidgetDecl, problem: string): SignalModel {
  return { id: decl.id, kind: decl.kind, outputs: {}, problem, model: null };
}

/** The prefix of the one finger pot of a build, or why there is not one. */
export function fingerPrefix(metrics: readonly Metric[]): string {
  const tail = `.${FADER_ROWS.track}`;
  const found = [...new Set(metrics.filter((m) => m.id.endsWith(tail)).map((m) => m.id.slice(0, -tail.length)))];
  if (found.length === 1) return found[0]!;
  throw new Error(found.length === 0 ? "the build carries no finger pot rows for the adc pin" : `the build carries ${found.length} finger pots (${found.join(", ")}); read each through a drive.fader widget`);
}

const num = (m: readonly Metric[], id: string): number | null => {
  const v = m.find((x) => x.id === id)?.value;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
};

export const readoutSignal: WidgetEntry<SignalModel> = {
  model(decl, build) {
    const entry = build.hookup.find((h) => h.port === decl.fn);
    if (entry === undefined) return refusal(decl, `no hookup entry reads ${decl.fn}; name a hookup port as the widget fn`);
    if (entry.read.model === "charge-release") {
      const r = chargeReadNow(decl.fn, build.hookup, build.results, (build.closed ?? []).includes(decl.fn));
      if (typeof r === "string") return refusal(decl, r);
      const outputs: Record<string, unknown> = {
        pin: r.pin, model: entry.read.model, level: r.level, volts: r.volts,
        rOhm: r.closed ? r.rOhm : null, timingUs: r.waitUs, message: touchLine(r),
        qualifier: { level: r.qualifier, volts: r.qualifier, rOhm: r.qualifier, timingUs: r.waitQualifier },
      };
      return { id: decl.id, kind: decl.kind, outputs, problem: r.level === null ? `${r.mcu} has no pin thresholds in the catalog` : null, model: entry.read.model };
    }
    if (entry.read.model === "adc") {
      let prefix: string;
      try {
        prefix = fingerPrefix(build.metrics);
      } catch (e) {
        return refusal(decl, (e as Error).message);
      }
      const rows = faderRows(build.metrics, prefix);
      if (typeof rows === "string") return refusal(decl, rows);
      const r = faderRead(rows, [entry], fingerPos(prefix, build.positions, decl.inputs["pos"]));
      const srcOhm = num(build.metrics, `${prefix}.gib.Rsrc`);
      const settleS = num(build.metrics, `${prefix}.gib.settle`);
      const level: number | null = r.counts;
      const message = r.counts === null
        ? (r.problem ?? "no read")
        : `${entry.pin} reads ${r.counts} counts, ${fmt(r.volts as number)} V ${r.qualifier}${srcOhm === null ? "" : `, source ${fmt(srcOhm / 1e3)} kohm worst ${rows.qualifier}`}${settleS === null ? "" : `, settles in ${fmt(settleS * 1e6)} us ${rows.qualifier}`}`;
      const outputs: Record<string, unknown> = {
        pin: entry.pin, model: entry.read.model, level, volts: r.volts, rOhm: srcOhm,
        timingUs: settleS === null ? null : settleS * 1e6, message,
        qualifier: { level: r.qualifier, volts: r.qualifier, rOhm: rows.qualifier, timingUs: rows.qualifier },
      };
      return { id: decl.id, kind: decl.kind, outputs, problem: r.problem, model: entry.read.model };
    }
    return refusal(decl, `${entry.pin} reads by ${entry.read.model}; readout.signal reads charge-release and adc pins`);
  },
  liveness: liveOutputs,
};

/** The signal readout line. */
export function signalLine(m: SignalModel): string {
  const msg = m.outputs["message"];
  return typeof msg === "string" ? msg : (m.problem ?? "");
}

/** A digital level or a count, as the readout prints it. */
export function signalLevel(level: PinState | number | null): string {
  return level === null ? "unknown" : typeof level === "number" ? `${level} counts` : level.toLowerCase();
}
