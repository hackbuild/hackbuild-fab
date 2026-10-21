// designs/pip/migrate/legacy.ts
// A PIP legacy save into a design document (D-167; M10-T03 step 5). The
// legacy bench writes `{app: "pip-bench", v: 1, state}` (pip-controller
// bench/part2.js line 187, lineage pip.example-design/pip-controller-b137deb)
// and its loadDesign reads `o.state || o` (line 190), so a bare state
// object is a save too. A share link with no `#d=<version>.` prefix routes
// here. The state keeps the legacy keys: the PIP chase (M10-T13) merges
// them onto its defaults through packages/chase normalise, which drops a
// retired key and lists it, as part2.js lines 192 to 194 do.

/** The design document a legacy save becomes. */
export interface PipLegacyDocument {
  readonly app: "pip";
  /** Where the save came from: the legacy app name and its save version. */
  readonly legacy: { readonly app: string; readonly v: number };
  readonly state: Readonly<Record<string, unknown>>;
}

const LEGACY_APP = "pip-bench";

type Obj = Record<string, unknown>;
const isPlain = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** Read a PIP legacy save; throws when the payload is not one. */
export function legacy(doc: unknown): PipLegacyDocument {
  if (!isPlain(doc)) throw new Error("a pip save is a json object");
  const app = doc["app"];
  if (app !== undefined && app !== LEGACY_APP) throw new Error(`not a pip save: app is ${String(app)}`);
  const state = isPlain(doc["state"]) ? doc["state"] : doc;
  const v = typeof doc["v"] === "number" ? doc["v"] : 1;
  if (v !== 1) throw new Error(`pip save version ${v}; the legacy bench wrote version 1`);
  const rest: Obj = {};
  for (const k of Object.keys(state)) if (k !== "app" && k !== "v") rest[k] = state[k];
  return { app: "pip", legacy: { app: LEGACY_APP, v }, state: rest };
}

// The legacy keys onto the chase (designs/pip/chase.ts). Every leaf key of
// a save takes one route: a chase field, a profile or catalog row the chase
// reads instead of a bench value (M10-T13 step 2: "drops phys.* with a
// logged line naming the profile row used"), the chase materials or
// hookup, the machine profile, or an archetype default with no bench row.
// A key with no route is unknown, and a test holds both example saves to
// none.

/** Where one legacy key goes. */
export type PipLegacyRoute =
  | { readonly from: string; readonly kind: "field"; readonly field: string }
  | { readonly from: string; readonly kind: "profile" | "catalog" | "machine" | "materials" | "hookup" | "archetype"; readonly row: string };

const FIELDS: Readonly<Record<string, string>> = {
  "shape.style": "shape", "shape.W": "W", "shape.H": "H", "shape.corner": "corner", "shape.drop": "drop",
  "shape.bezelChamfer": "bezelChamfer", "stack.bezel": "bezel",
  "flex.face": "flexFace", "flex.Hs": "flexHs", "flex.alpha": "flexAlpha", "flex.wall": "flexWall", "flex.hole": "flexHole",
  "flex.cap": "flexCap", "flex.gapPct": "flexGapPct", "flex.colGap": "flexSplit", "flex.faceT": "flexFaceT", "flex.protrude": "flexProtrude",
  "clicky.l": "clickSpan", "clicky.t": "clickBeam", "clicky.Q": "clickRise", "clicky.w": "clickWidth", "clicky.g": "clickGap",
  "clicky.cap": "clickCap", "clicky.protrude": "clickProtrude", "clicky.capMat": "clickCapMat", "clicky.eb": "clickEnd",
  "clicky.sw": "clickShuttle", "clicky.tip": "clickTip", "clicky.flange": "clickFlange", "clicky.flangeT": "clickFlangeT",
  "clicky.slotClr": "clickSlotClr", "clicky.relief": "clickRelief", "clicky.rib": "clickRib",
  "touch.d": "touchD", "touch.finger": "touchFinger", "touch.gap": "touchGap", "touch.spine": "touchSpine", "touch.rim": "touchRim",
  "stick.top": "stickTop", "stick.tilt": "stickTilt", "stick.over": "stickOver", "stick.bandR": "stickBandR", "stick.bandH": "stickBandH",
  "stick.neckD": "stickNeckD", "stick.neckH": "stickNeckH", "stick.stemD": "stickStemD", "stick.capD": "stickCapD",
  "stick.capH": "stickCapH", "stick.capDish": "stickDish", "stick.padGap": "stickPadGap",
  "board.mode": "mode", "board.contact": "contact", "board.press": "press", "board.bumpH": "bumpH", "board.bumpW": "bumpW",
  "board.clr": "pocketClr", "board.sockOD": "sockOD", "board.sockBore": "sockBore", "board.pinLen": "pinLen",
  "board.headerT": "headerT", "board.datum": "datum", "board.window": "window",
  "cups.od": "cupOd", "cups.bore": "cupBore", "cups.h": "cupH", "cups.pitch": "cupPitch", "cups.perRow": "cupPerRow",
  "bezel.labels": "labels", "bezel.mark": "mark", "bezel.lip": "lip", "bezel.pry": "pry", "bezel.pins": "pegs",
  "bezel.lipD": "lipD", "bezel.lipT": "lipT", "bezel.lipInset": "lipInset", "bezel.lipFit": "lipFit", "bezel.labelH": "labelH",
  "route.clr": "routeClr", "route.grid": "routeGrid", "route.via": "routeVia", "route.margin": "routeMargin", "route.iters": "iters",
  "seg": "seg",
};

/** Keys the chase reads from a row instead of a bench value, with the row. */
type RowKind = Exclude<PipLegacyRoute, { kind: "field" }>["kind"];
const ROWS: Readonly<Record<string, readonly [RowKind, string]>> = {
  "stack.layer": ["machine", "ffc5p preset layer"], "stack.skin": ["profile", "stack.skin"], "stack.trace": ["profile", "stack.trace"],
  "stack.iso": ["profile", "stack.iso"], "stack.pad": ["profile", "stack.overL2 less stack.iso"],
  "route.w": ["profile", "stack.traceWidth"], "route.bleed": ["profile", "bleed table (D-084)"],
  "route.post": ["archetype", "post radius of the key archetypes"],
  "clicky.E": ["profile", "petg modulusMPa"], "clicky.endClr": ["archetype", "click-spring-key endClr"],
  "stick.capRings": ["archetype", "tilt-stick capRings"],
  "phys.rhoC": ["profile", "cpla.pip.along"], "phys.rhoCz": ["profile", "cpla.pip.through"], "phys.rhoT": ["profile", "ctpu.pip.bulk"],
  "phys.cpin": ["catalog", "mcu-pins rp2040 inputCap"], "phys.leak": ["catalog", "mcu-pins rp2040 leakage"],
  "phys.waitMech": ["hookup", "key waitUs 3500, waitSource default (D-079)"],
  "phys.waitTouch": ["hookup", "touch waitUs 1500, waitSource default (D-079)"],
  "board.L": ["catalog", "rp2040-zero-seat L"], "board.W": ["catalog", "rp2040-zero-seat W"], "board.T": ["catalog", "rp2040-zero-seat T"],
  "board.pitch": ["catalog", "rp2040-zero-seat pitch"], "board.inset": ["catalog", "rp2040-zero-seat inset"],
  "board.usbH": ["catalog", "rp2040-zero-seat usbH"], "board.usbOver": ["catalog", "rp2040-zero-seat usbOver"],
  "board.grip": ["archetype", "rp2040-zero-seat grip"],
  "bezel.on": ["archetype", "bezel always built"], "bezel.pryR": ["archetype", "bezel pry notch radius"],
  "bezel.pryD": ["archetype", "bezel pry notch depth"],
  "print.printer": ["machine", "ffc5p preset slicer printer"], "print.process": ["machine", "ffc5p preset slicer process"],
  "print.pattern": ["machine", "ffc5p preset slicer filament"], "print.writeFilaments": ["machine", "ffc5p 3mf exporter"],
  "print.bedW": ["machine", "ffc5p bed"], "print.bedD": ["machine", "ffc5p bed"],
};

/** The legacy groups and the item keys each carries; a group key becomes `<group><Key>`. */
const GROUP_KEYS: Readonly<Record<string, readonly string[]>> = {
  left: ["on", "kind", "type", "x", "y", "pitch"],
  face: ["on", "type", "x", "y", "pitch"],
  menu: ["on", "type", "x", "y", "pitch"],
  shoulder: ["on", "type", "x", "y"],
};

/** A legacy save as chase params, every key's route, and the keys with none. */
export interface PipLegacyParams {
  /** Partial params; packages/chase normaliseParams fills the rest from the chase defaults. */
  readonly params: Readonly<Record<string, unknown>>;
  readonly routes: readonly PipLegacyRoute[];
  /** Dotted legacy paths with no route. */
  readonly unknown: readonly string[];
}

/** Map a legacy save (or its document) onto PIP chase params. */
export function legacyParams(doc: unknown): PipLegacyParams {
  const { state } = legacy(doc);
  const params: Obj = {};
  const routes: PipLegacyRoute[] = [];
  const unknown: string[] = [];
  const leaf = (from: string, v: unknown): void => {
    const field = FIELDS[from];
    if (field !== undefined) {
      params[field] = field === "routeGrid" && typeof v === "number" ? String(v) : v;
      routes.push({ from, kind: "field", field });
      return;
    }
    const row = ROWS[from];
    if (row === undefined) unknown.push(from);
    else routes.push({ from, kind: row[0], row: row[1] });
  };
  for (const [k, v] of Object.entries(state)) {
    if (k === "groups" && isPlain(v)) {
      for (const [name, g] of Object.entries(v)) {
        const keys = GROUP_KEYS[name];
        if (keys === undefined || !isPlain(g)) {
          unknown.push(`groups.${name}`);
          continue;
        }
        for (const [gk, gv] of Object.entries(g)) {
          const field = `${name}${gk.charAt(0).toUpperCase()}${gk.slice(1)}`;
          if (keys.includes(gk)) {
            params[field] = gv;
            routes.push({ from: `groups.${name}.${gk}`, kind: "field", field });
          } else unknown.push(`groups.${name}.${gk}`);
        }
      }
    } else if (k === "slots" && Array.isArray(v)) {
      routes.push({ from: "slots", kind: "materials", row: "chase materials, slots 1 to 4" });
    } else if (k === "pins" && isPlain(v)) {
      for (const p of Object.keys(v)) routes.push({ from: `pins.${p}`, kind: "hookup", row: `port.${p}` });
    } else if (isPlain(v)) {
      for (const [ck, cv] of Object.entries(v)) {
        if (isPlain(cv) || Array.isArray(cv)) unknown.push(`${k}.${ck}`);
        else leaf(`${k}.${ck}`, cv);
      }
    } else leaf(k, v);
  }
  return { params, routes, unknown };
}
