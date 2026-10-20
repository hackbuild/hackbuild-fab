// spec/chase.ts
/**
 * Status: draft until M-S exit B. MILESTONES.md 1.5, D-179.
 * M-S runs this file first; exit B freezes the parts that table names, and
 * the rest stays draft until the milestone it names.
 */
// CHASE (working name): the typed design document. A chase holds
// declarations only; anything conditional lives in build.ts. A chase is a
// TypeScript module built with defineChase, type-checked against this file,
// with a zod schema derived for runtime and deep normalise on load (D-131).
// The chase is the design: meta, materials, params, presets, build, expect,
// waive, exports, assertions, applied, stack, motion and items. How a bench
// lays it out (shell, views, rail, welcome, status, slots) lives in
// bench.ts, so BuildInputs.defHash covers the chase and build.ts and never
// the layout (D-174).
// chase.ts is read as data and never executed: its source must be one
// `export const chase = defineChase({...})` over a literal object, which
// packages/chase reads without running code (CHASE_SOURCE_RULES, D-178).
// Version 4, 2026-10-04. Carries D-012, D-063, D-074, D-124, D-125, D-126,
// D-131, D-132, D-173, D-174, D-177, D-178.
// 2026-10-05: gold standard gaps P-01, P-02, P-03, P-12, P-14 to P-20,
// P-25, P-26 (synthesis/gold-standard.md section 12).

import type { FaceRef, Hash, IsoDate, KernelId, Micros, Mm, Ohm, Spdx } from "./ids";
import type { Assertion, BodyRole, StackDecl } from "./part-ir";
import type { BuildFn } from "./build";
import type { ConstraintDim } from "./constraints";
import type { ReadModel } from "./circuit";
import type { CheckId } from "./checks";

/**
 * Six fixed kinds (D-126). A seventh needs a measured layout sharing nothing
 * with these; bench slots are the valve. The kind stays on the chase: it
 * selects the build and export path (board backends, catalog items) and the
 * default bench chase.scaffold writes.
 */
export const CHASE_KINDS = ["single", "composer", "surface", "board", "machine", "catalog"] as const;
export type ChaseKind = (typeof CHASE_KINDS)[number];

/** Current chase schema version. migrate/1-to-2.ts upgrades version 1 on load. */
export const CHASE_SCHEMA_VERSION = 2;

export interface ChaseMeta {
  /**
   * Lowercase slug, CHASE_ID_PATTERN: `<id>` for designs/<id>/, `<area>-<id>` for
   * reference/<area>/<id>/ (reference/keys/flex-pair is "keys-flex-pair").
   * The source reader refuses any other id (CHASE_SOURCE_RULES "id").
   * Every command resolves a chase argument by meta.id or by path.
   */
  readonly id: string;
  readonly kind: ChaseKind;
  /** Display name in CAPS, for example "FLEX PAIR". */
  readonly name: string;
  /** Design version, integer count of releases. */
  readonly version: number;
  /** Schema version. */
  readonly chase: typeof CHASE_SCHEMA_VERSION;
  readonly kernels: readonly KernelId[];
  /** Machine profile ids, first is the default. */
  readonly machines: readonly string[];
  /** SPDX; printable designs default to "CC-BY-SA-4.0" (D-041). */
  readonly license: Spdx;
  readonly derivedFrom?: { readonly id: string; readonly buildHash: Hash };
  /** Old names, so registry and chat links keep resolving, for example ["haft"] on pip. */
  readonly aliases?: readonly string[];
}

export interface MaterialSlot {
  /** 1-based filament or sheet slot number. */
  readonly slot: number;
  /** Profile material id. Resistivity comes from profile. */
  readonly material: string;
  readonly role: BodyRole;
  /**
   * 1-based toolhead index on the target machine (spec/profile.ts Toolhead).
   * Absent: the slot prints on toolhead `slot`. Resolved at export into a
   * ToolheadAssignment that CHK-3MF-09 checks.
   */
  readonly toolhead?: number;
  readonly label?: string;
  /**
   * Slot colour as "#rrggbb" (P-20). The stage, the legend and the drive
   * pad draw the slot in it; a colour edit is a light commit and never
   * builds (G-05). Owner decision pending on P-20; the default, from five
   * of six gold benches (TOGGLE, TANG, COLLAR, COTTER, PIP), is that the 3MF
   * also writes it as the filament colour of the slot's extruder. Absent:
   * the stage takes the role colour and the 3MF writes no colour.
   */
  readonly preview?: string;
}

/** A value a ShowWhen compares; a number is in the other field's unit. */
export type Scalar = string | number | boolean;

/**
 * Show a field, row or group only while the design matches (P-01). Gold
 * hides rows on equality (PIP's corner row for the slab shape), on
 * not-equal (TOGGLE texture none hides depth and pitch), on a set and on
 * combinations (TOGGLE pin depth unless pads, BLOCKS brick rows when base
 * is blocks and pegs are on). `all` and `any` nest; every leaf names a
 * declared field id (CHASE_PARAM_RULES "show-when"). A hidden row's value
 * stays in the design and still feeds the build; liveness (G-41) checks
 * only visible rows.
 */
export type ShowWhen =
  | { readonly field: string; readonly equals: Scalar }
  | { readonly field: string; readonly notEquals: Scalar }
  | { readonly field: string; readonly in: readonly Scalar[] }
  | { readonly all: readonly ShowWhen[] }
  | { readonly any: readonly ShowWhen[] };

/** An enum option; options come from legal values where a constraint dim exists (D-125). */
export interface EnumOption {
  readonly value: string;
  readonly label: string;
}

/** Fields common to every ParamField (D-124, D-132, plan-deltas R34). */
export interface ParamFieldCommon {
  /** Param key; a JSON pointer segment in params. */
  readonly id: string;
  /** Short label, lowercase. */
  readonly label: string;
  /** One line, lowercase; tooltip and aria. Replaces rail .note paragraphs (PIP has 16 .note elements). */
  readonly help?: string;
  readonly showWhen?: ShowWhen;
  /**
   * Constraint dim this param sets, for example "contact.gap". constraints.query
   * in param form resolves the param's pointer through it, and the rail
   * draws its live range from the same answer.
   */
  readonly constraintDim?: ConstraintDim;
  /** touch: live preview; commit: rebuild; light: mass, colour or slot only (TENON commitLight). */
  readonly commit?: "touch" | "commit" | "light";
  /** Remember across sessions; never set on power, drive or transmit fields. */
  readonly remember?: boolean;
  /**
   * Quality only (P-18): the param changes mesh density and nothing else,
   * such as PIP seg or the COLLAR grid. Liveness (G-07) then requires a
   * tris change and no buildHash change in the geometry checks.
   */
  readonly quality?: true;
  /**
   * Check ids whose results bind to this row (P-25). The rail renders each
   * result's live text under the row in the ok, warn or fail class (COLLAR
   * `The flutes cut to r 19.50 but the rim only reaches in to r 21.20`).
   * Static help stays in `help`; the row never carries a free note.
   */
  readonly checks?: readonly CheckId[];
}

/**
 * Zero means auto (P-17): while the value equals `at`, the row shows the
 * value the named build function derives and `label` beside it (TOGGLE
 * body studs, 0 is auto).
 */
export interface AutoSpec {
  /** The value that means auto, in the field's unit; inside `range`. */
  readonly at: number;
  /** Word shown beside the derived value, lowercase, for example "auto". */
  readonly label: string;
  /** Author.derive id in build.ts that gives the value used while at `at`. */
  readonly fn: string;
}

/** A numeric range and default. */
interface NumericSpec {
  /** [min, max] in the field's unit. */
  readonly range: readonly [number, number];
  /** Slider step in the field's unit; the default lands on a step exactly (G-09). */
  readonly step?: number;
  /** Default in the field's unit. */
  readonly default: number;
  readonly auto?: AutoSpec;
}

/**
 * A derived readout's material or design limit (P-02). Past it the value
 * renders in the error colour, and `check` names the check that carries
 * the same limit so the rail and CHECKS agree (G-27, PIP strain at stop
 * red past 2.5 percent).
 */
export interface DerivedLimit {
  /** Upper limit in the field's unit. */
  readonly max?: number;
  /** Lower limit in the field's unit. */
  readonly min?: number;
  readonly check: CheckId;
}

/**
 * One verdict band (P-02): the word applies while the value is below
 * `below`, bands read in ascending order, and the last band takes a large
 * finite `below` (CHASE_SOURCE_RULES "finite"). BLOCKS lamp `visible` and `dim, use a 5 V
 * rail or a wider trace`; PIP spring `soft spring`, `clicks`, `latches`.
 */
export interface VerdictBand {
  /** Exclusive upper bound of the band, in the field's unit. */
  readonly below: number;
  /** Word or short sentence, lowercase, naming what the value means. */
  readonly word: string;
}

/**
 * Typed instances a person places on the stage (P-12): COTTER hooks and
 * shelves on a pegboard lattice, BLOCKS parts in a scene, COLLAR art
 * layers. Each instance stores `{ id, type, at?, face?, ...fields }`; the
 * rail renders an inspector for the selected one.
 */
export interface InstanceType {
  /** Short label, lowercase. */
  readonly label: string;
  /** One line, lowercase, shown in the add menu. */
  readonly blurb: string;
  readonly fields: readonly ParamField[];
  readonly presets?: readonly Preset[];
}

/** Where instances land on the stage (P-12). */
export interface InstancePlace {
  /**
   * The pointer ray meets the face plane, rounds to the lattice and clamps
   * to `extent` (COTTER). New instances land on the first free cell.
   */
  readonly lattice?: {
    /** Lattice pitch, mm. COTTER pegboard 25.4. */
    readonly pitchMm: Mm;
    /** Derived field id or metric id giving the lattice extent. */
    readonly extent: string;
    /** Faces with a lattice, count; 2 adds a mirrored back face with through-checks. */
    readonly faces?: 1 | 2;
    readonly mirror?: "x";
  };
  /** stack: a placed instance sits on whatever is under it (BLOCKS ghost at stack height). */
  readonly z?: "stack";
}

export type ParamFieldSpec =
  /** Length, mm. */
  | ({ readonly type: "mm" } & NumericSpec)
  /** Angle, degrees. */
  | ({ readonly type: "deg" } & NumericSpec)
  /** Integer count. */
  | ({ readonly type: "int" } & NumericSpec)
  /** Unitless ratio. */
  | ({ readonly type: "ratio" } & NumericSpec)
  /** Any other unit, named in `unit`; log for log-scale sliders. */
  | ({ readonly type: "number"; readonly unit: string; readonly log?: boolean } & NumericSpec)
  | { readonly type: "bool"; readonly default: boolean }
  | { readonly type: "enum"; readonly options: readonly EnumOption[]; readonly default: string }
  /** Text; max is a character count. */
  | { readonly type: "text"; readonly default: string; /** characters */ readonly max?: number }
  | { readonly type: "art"; readonly accepts: readonly ("svg" | "png" | "text")[] }
  /** A catalog part picker filtered by `catalog` (a catalog query). */
  | { readonly type: "part"; readonly catalog: string; readonly default?: string }
  /** Repeatable group: N instances with their own fields; min and max are counts. */
  | { readonly type: "list"; readonly item: readonly ParamField[]; /** count */ readonly min: number; /** count */ readonly max: number }
  /** Typed instances placed on the stage (P-12); min and max are counts across all types. */
  | {
      readonly type: "instances";
      readonly types: Readonly<Record<string, InstanceType>>;
      readonly place?: InstancePlace;
      /** count */ readonly min: number;
      /** count */ readonly max: number;
    }
  /**
   * A filament or sheet slot reference (P-19). Options follow the current
   * slot count and names; a slot count change remaps every reference to
   * the nearest slot with an allowed role and logs each remap. A slot edit
   * is a light commit (G-05).
   */
  | { readonly type: "slot"; readonly roles?: readonly BodyRole[]; /** 1-based slot */ readonly default: number }
  /**
   * Read-only, computed by a named function in build.ts (Author.derive id).
   * Never an expression, never an input (G-07 rule 7: where a person
   * expects an input, `help` says why it is computed). The rail renders the
   * value in VT323 with its unit, the verdict word, and the error class
   * past `limit` (P-02).
   */
  | {
      readonly type: "derived";
      readonly fn: string;
      readonly unit?: string;
      readonly limit?: DerivedLimit;
      /** Bands in ascending `below` order; chase.validate refuses another order. */
      readonly verdict?: readonly VerdictBand[];
      /** The step's focal value (COLLAR pause layer); a RailStep.focus may name it, and at 390 it stays visible (G-53). */
      readonly focal?: boolean;
    };

export type ParamField = ParamFieldSpec & ParamFieldCommon;
export type ParamType = ParamFieldSpec["type"];
/** A derived field, the only kind a group's readout grid holds. */
export type DerivedField = Extract<ParamField, { readonly type: "derived" }>;

/** A preset scoped to one group (P-16): PIP's Yousu and Protopasta filament chips. */
export interface GroupPreset {
  readonly id: string;
  /** Chip label, lowercase. */
  readonly label: string;
  /** Partial params; keys are field ids of the same group (CHASE_PARAM_RULES "preset-param"). */
  readonly params: Readonly<Record<string, unknown>>;
}

export interface ParamGroup {
  readonly id: string;
  /** Group head, CAPS. */
  readonly label: string;
  readonly fields: readonly ParamField[];
  /** touch: live 2D preview; commit: rebuild. Geometry groups default to commit. */
  readonly live?: "touch" | "commit";
  readonly showWhen?: ShowWhen;
  /**
   * The readout grid at the foot of the group, after the rows (P-03, G-25):
   * VT323 value, unit and verdict word, recomputed on every build. A
   * material edit rebuilds every dependent readout within the commit (G-30).
   * Readout ids share the field id namespace (CHASE_PARAM_RULES
   * "field-id-unique").
   */
  readonly readouts?: readonly DerivedField[];
  /**
   * The group's one note (G-42), one or two lines, lowercase. No other free
   * paragraph in the rail: per-row text is ParamField.help, live constraint
   * text is a check bound through ParamField.checks.
   */
  readonly note?: string;
  /** Rows folded under one disclosure inside the group (P-16, TOGGLE PHYSICS). Field ids of this group. */
  readonly fold?: { readonly label: string; readonly fields: readonly string[] };
  /** Group preset chips (P-16). */
  readonly presets?: readonly GroupPreset[];
}

/** An expected reading the smoke job checks for a preset (P-15). */
export interface PresetExpect {
  /** Drive target id, as BenchHook.drive takes it. */
  readonly drive: string;
  /** Stimulus: boolean for hold, a number in the target's unit for tilt or slide. */
  readonly value: number | boolean;
  /** Readout keys and the values expected, numbers in the key's suffix unit. */
  readonly reads: Readonly<Record<string, number | string>>;
  /** Relative tolerance on numeric reads, ratio; default 0.05 (inferred). */
  readonly tol?: number;
}

export interface Preset {
  readonly id: string;
  readonly label: string;
  /**
   * Partial params; deep-normalised against defaults on load: an object
   * merges key by key and a list replaces whole. Keys must be
   * declared field ids: defineChase checks this in the editor and
   * chase.validate at runtime (CHASE_PARAM_RULES "preset-param").
   * Applying a preset replaces the design and keeps the filament slots (G-12).
   */
  readonly params: Readonly<Record<string, unknown>>;
  /** One to three sentences on what the preset teaches, shown when it loads (P-15). */
  readonly note?: string;
  /** Readings the smoke job drives and checks; a miss fails the job (P-15). */
  readonly expect?: readonly PresetExpect[];
}

/** Print card sections (P-26, G-48). */
export const CARD_SECTIONS = [
  "layer", "breakers", "assembly", "pause", "pinout", "hookup", "grams", "checked", "fit-test",
] as const;
export type CardSection = (typeof CARD_SECTIONS)[number];

export interface ExportDecl {
  /** Exporter registry id: 3mf stl dxf svg cut gerbers kicad bom cpl png glb card ino wiring json coupon pinout. Gating comes from ExporterDef.fabrication. */
  readonly kind: string;
  readonly machine?: string;
  readonly pose?: "print" | "assembly";
  /** Sheet width and height, mm. */
  readonly sheet?: readonly [Mm, Mm];
  /** Kit bundle (P-26): the export kinds zipped into this one, for example ["3mf", "svg", "dxf", "card"] (COTTER MAKE). */
  readonly bundle?: readonly string[];
  /** xNN_: every file name starts with its quantity, x02_hook.stl (COTTER). */
  readonly naming?: "xNN_";
  /** FDM plate packing by the same planner the plate view uses (G-18). Bed width and depth, mm. */
  readonly plates?: { readonly pack: "fdm"; readonly bedMm: readonly [Mm, Mm] };
  /**
   * Print card content (G-48). Assembly lines come from a build function,
   * so the card follows the current mode (PIP pegs flaw).
   */
  readonly card?: {
    readonly sections: readonly CardSection[];
    /** Author.derive id or exported build.ts function name that returns the assembly lines. */
    readonly assembly?: string;
  };
  /** 3MF printer, process and filament preset names written into the project (TANG, COLLAR). */
  readonly presets?: { readonly printer: string; readonly process: string; readonly filament: string };
}

/**
 * Contact nets and printed wires on a composed scene (P-14, BLOCKS). nets
 * "contact": touching conductive studs and sockets join nets. A wire runs
 * port to port, is fitted to its route plus slack, exports as a part, and
 * a wire whose fitted length is short is a check result carrying the
 * length it needs.
 */
export interface SceneDecl {
  readonly nets: "contact";
  readonly wires?: {
    /** Slack added to the routed length, mm. */
    readonly fit: { readonly slackMm: Mm };
    readonly shapes: readonly ("straight" | "spiral" | "zigzag" | "s")[];
    readonly export: true;
  };
  /**
   * Scenes a legacy sim built, solved as their element lists (M05-T07,
   * D-077, D-087). circuit.solve reads these lists instead of extracting
   * nets from the Part IR; no geometry is checked on them. Only the BLOCKS
   * reproduction declares one.
   */
  readonly legacy?: LegacySceneDecl;
  /**
   * Declared series nets (M05-T12, the Capricate reproduction): each net
   * is a declared discrete resistor in series with centreline leads, read
   * from a sensing electrode. circuit.solve prices the leads from the
   * profile resistivity rows and adds the resistor; it extracts no nets
   * from the Part IR. build.ts builds the electrode and lead bodies from
   * this declaration, so the geometry and the solve read one source.
   */
  readonly series?: SeriesSceneDecl;
  /**
   * Declared key paths composed as PIP composes them (M05-T11, D-079):
   * per key, the read net's routed trace and its posts, the switch posts,
   * a declared contact resistance and the common return net. circuit.solve
   * prices the traces and posts from the profile resistivity rows, adds
   * the contact and reads each hookup port by charge-release; it extracts
   * no nets from the Part IR. Only the PIP drive reproduction declares one.
   */
  readonly drive?: DriveSceneDecl;
}

/**
 * The PIP key path (pip-controller src/model.js lines 393 to 416 at
 * b137deb): Rtrace(read net) + terminal posts + vias + switch posts +
 * contact + Rtrace(return net) + its terminal posts. Every length comes
 * from a route a generator recorded; the chase computes nothing.
 */
export interface DriveSceneDecl {
  /** Profile material of every trace and post; it must carry along and through resistivity rows. */
  readonly material: string;
  /** Trace cross section, mm: the routed width and the trace layer thickness. */
  readonly trace: { readonly widthMm: Mm; readonly tMm: Mm };
  /** A terminal post, mm: from the bottom of trace layer 1 to the pad floor, at the route's post radius. */
  readonly terminal: { readonly hMm: Mm; readonly rMm: Mm };
  /** A via, mm: from the bottom of layer 1 to the top of layer 2, at the via radius. */
  readonly via: { readonly hMm: Mm; readonly rMm: Mm };
  /** Where the lengths came from, one line: generator, fixture and route mode. */
  readonly route: string;
  readonly nets: readonly DriveNetDecl[];
  readonly keys: readonly DriveKeyDecl[];
  /**
   * The key wait a published firmware ships when it differs from the
   * emitted one (PIP: pip.ino KEY_WAIT_US 200, D-080); applied to the
   * reads of ports that are not touch ports.
   */
  readonly shipped?: { readonly keyWaitUs: Micros; readonly source: string };
}

/** One routed net: centreline length with the terminal stubs, mm, the terminal posts on its read path and its vias. */
export interface DriveNetDecl {
  readonly net: string;
  readonly lengthMm: Mm;
  /** Terminal posts the read path passes, count (PIP: 2, one at each end). */
  readonly terminalPosts: number;
  /** Vias on the net, count. */
  readonly vias: number;
  /** A common return net's rail: build.ts gives its port this type, and a press pulls the pin toward it. Absent on a key net. */
  readonly rail?: "gnd" | "power";
}

/** One key: the hookup port it is read at, its net, the return net and the switch between them. */
export interface DriveKeyDecl {
  /** Hookup and PortFeature id. */
  readonly port: string;
  /** Port interface registry id: "digital" for a key, "touch" for a touch pad. */
  readonly interface: string;
  /** The read net, a DriveNetDecl id. */
  readonly net: string;
  /** The common net a press returns through, a DriveNetDecl id (PIP: GND for keys, 3V3 for touch). */
  readonly return: string;
  /** Posts of the switch itself, each priced through at hMm over a disc of rMm, count times. */
  readonly posts: readonly { readonly id: string; readonly hMm: Mm; readonly rMm: Mm; readonly count: number }[];
  /** Declared contact resistance of the switch, ohm; 0 for none. */
  readonly contactOhm: Ohm;
  /**
   * Profile material whose bulk resistivity row contactOhm was computed
   * over; the contact takes that row's tier. Absent when contactOhm is 0.
   */
  readonly contactMaterial?: string;
  /** Where contactOhm comes from, one line: file and lines. */
  readonly contactSource: string;
}

/**
 * Electrodes, leads and the nets that join them through a declared
 * resistor. A resistor is wiring a mesh does not hold, so it is declared
 * here and never inferred from geometry.
 */
export interface SeriesSceneDecl {
  /** Profile material id of every electrode and lead; it must carry resistivity rows. */
  readonly material: string;
  /** Sensing surfaces: discs of diameterMm and tMm. A disc is not on the path. */
  readonly electrodes: readonly { readonly id: string; readonly diameterMm: Mm; readonly tMm: Mm }[];
  /** Straight centreline leads printed along their length, lengthMm by widthMm by tMm. */
  readonly leads: readonly { readonly id: string; readonly lengthMm: Mm; readonly widthMm: Mm; readonly tMm: Mm }[];
  readonly nets: readonly SeriesNetDecl[];
}

/** One declared series net: its port interface, the electrode it reads, the resistor and the leads on its path. */
export interface SeriesNetDecl {
  readonly net: string;
  /** Port interface registry id of the net's sensing port, for example "capacitive". */
  readonly interface: string;
  /** Electrode id the net reads, when the net has one. */
  readonly electrode?: string;
  /** Declared series resistor, ohm; 0 for none. */
  readonly resistorOhm: Ohm;
  /** Lead ids on the path, in path order; empty when the resistor sits on the electrode edge. */
  readonly leads: readonly string[];
}

/**
 * Where a legacy scene's element lists live and which pin they read. The
 * lists are written by a dump of the legacy source (BOSS:
 * tools/legacy/boss/dump-elements.cjs --table) and never edited by hand.
 */
export interface LegacySceneDecl {
  /** The legacy sim: "boss" is designs/blocks/legacy/boss-src. */
  readonly sim: "boss";
  /** Folder beside chase.ts holding one dumped scene JSON per scene, "./" relative. */
  readonly elements: `./${string}`;
  /** The board pin every scene reads, for example "IO2". */
  readonly pin: string;
  /** Catalog pin rows the pin is classified against when circuit.solve gets no mcu. */
  readonly mcus: readonly string[];
}

/** A persisted arch.apply result (D-014, D-132); Part IR is build output, so this is its home. */
/**
 * One arch.apply placement (D-165). `face` names a declared face and an
 * offset on it, never absolute coordinates, so the placement stays on the
 * face when a param moves the face (BOSS brickH 9.6 to 12 keeps a stud on
 * the top face). The kernel resolves it to a FaceFrame on every build.
 */
export interface AppliedArchetype {
  /** Archetype registry id. */
  readonly archetype: string;
  /** PartDraft id. */
  readonly part: string;
  readonly face: FaceRef;
  readonly params?: Readonly<Record<string, unknown>>;
}

/**
 * A declared deliberate violation (D-074). The check passes only when the
 * measured set equals the declared set (SHUNT G7: exactly 5 shorts and 5
 * floating nets).
 */
export interface ExpectDecl {
  readonly check: string;
  readonly target: string;
  readonly verdict: "fail" | "warn";
  /** Exact target ids expected to fail; omitted means the target alone. */
  readonly set?: readonly string[];
}

/**
 * A recorded waiver (D-173). A failing result whose check and target match
 * becomes verdict warn with `waived` set on the CheckResult; the CHECKS
 * panel and the print card list it with its reason. chase.validate refuses
 * a waiver with an empty reason (E_SCHEMA), one whose check is a
 * precondition check (CheckDef.precondition, D-067), and one whose check id is not registered (E_REF). After `until`
 * the waiver lapses and the result is fail again. A waiver that matched no
 * failing result in a build is reported as an unused-waiver warning.
 */
export interface WaiverDecl {
  /** Exact check id, for example "CHK-NET-05"; no globs. */
  readonly check: string;
  /** Exact target id the waiver covers (part, body, feature, net or artifact id); no globs. */
  readonly target: string;
  /** Why the failure is accepted, one line, non-empty. */
  readonly reason: string;
  /** Last day the waiver holds, inclusive. */
  readonly until?: IsoDate;
}

/**
 * How one port is wired and read (D-076, D-078, D-183). Hookup is a chase field so
 * the same printed part can be wired to an RP2040 or an ESP32-C3 without a
 * rebuild: changing an entry leaves the Part IR and buildHash unchanged.
 * circuit.solve classifies against `mcu`; the firmware emitter reads `read`.
 * Geometry checks never read hookup.
 */
export interface HookupDecl {
  /**
   * PortFeature id in the Part IR. A list param can change how many ports a
   * build emits, so an entry whose port is absent from the current build is
   * skipped with a BuildWarning; a misspelt id that no preset builds is E_REF
   * at chase.validate.
   */
  readonly port: string;
  /** McuPinSpec id of the receiving MCU in the catalog, for example "rp2040". */
  readonly mcu: string;
  /** Pin name on that MCU, for example "GP2", "IO2". */
  readonly pin: string;
  /** How the pin reads the port. */
  readonly read: ReadModel;
  /** Assembly instance holding the port; absent for a single part. */
  readonly instance?: string;
}

export interface Chase {
  readonly meta: ChaseMeta;
  readonly materials: readonly MaterialSlot[];
  readonly params: readonly ParamGroup[];
  readonly presets?: readonly Preset[];
  /**
   * Module path of build.ts and the exported function name. `module` is a
   * relative path starting "./", ending ".ts", with no ".." segment, so it
   * resolves inside the design directory (E_SCHEMA otherwise, rule
   * "build-path"). The module runs only in the build sandbox (spec/build.ts
   * BUILD_SANDBOX, D-178).
   */
  readonly build: { readonly module: string; readonly fn: string };
  // No check selector. The registry runs every check whose appliesTo
  // matches a level or feature kind present in the Part IR, always
  // (CHECKS.md section 4, D-173). A chase states deliberate violations in
  // expect and accepted failures in waive; it never chooses what runs.
  readonly expect?: readonly ExpectDecl[];
  readonly waive?: readonly WaiverDecl[];
  readonly exports: readonly ExportDecl[];
  readonly assertions: readonly Assertion[];
  readonly applied?: readonly AppliedArchetype[];
  /** Receiving MCU, pin and read model per port; wiring facts outside the Part IR. */
  readonly hookup?: readonly HookupDecl[];
  readonly stack?: StackDecl;
  /** Motion program registry id. */
  readonly motion?: string;
  /** catalog kind only: the chase ids this one lists. */
  readonly items?: readonly string[];
  /** Composed scenes with contact nets and printed wires (P-14, BLOCKS). */
  readonly scene?: SceneDecl;
  /** Coupon references only (D-177): what a person measures on the print and which profile rows it can write. */
  readonly coupon?: CouponDecl;
}

/**
 * A coupon is a reference under reference/coupons/<id>/ whose geometry is
 * ordinary features and whose chase declares what it measures (D-177). A
 * person enters the measured result; the coupon names the rows it may
 * write and never writes them itself (PROFILE.md, D-099).
 */
export interface CouponDecl {
  /** Profile row ids it measures: fit class ids, resistivity, kerf, bleed or strain rows. */
  readonly carries: readonly string[];
  /** Machine profile id the result is recorded against. */
  readonly machine: string;
  /** Profile material id, or the pair for a two-material coupon. */
  readonly material: string | readonly [string, string];
  /** Measurement method recorded in Provenance.method; always "coupon". */
  readonly method: "coupon";
}

// ParamsOf: params typed from the chase, so a param typo in build.ts fails
// tsc. mm, deg, int, ratio, number map to number; enum to the union of its
// option values; list to an array of its item record; instances to an
// array of tagged records, one shape per type; slot to its 1-based number;
// derived is omitted.

type ArtValue = { readonly uri: string; readonly kind: "svg" | "png" | "text" };

type FieldValue<F> =
  F extends { readonly type: "mm" | "deg" | "int" | "ratio" | "number" } ? number
  : F extends { readonly type: "bool" } ? boolean
  : F extends { readonly type: "enum"; readonly options: readonly (infer O)[] } ? (O extends { readonly value: infer V } ? V : never)
  : F extends { readonly type: "text" } ? string
  : F extends { readonly type: "art" } ? ArtValue | null
  : F extends { readonly type: "part" } ? string
  : F extends { readonly type: "list"; readonly item: readonly (infer I)[] } ? FieldsRecord<I>[]
  : F extends { readonly type: "instances"; readonly types: infer T } ? InstanceValue<T>[]
  : F extends { readonly type: "slot" } ? number
  : never;

/** One placed instance: id, type tag, lattice cell and face, then the type's fields. */
type InstanceValue<T> = {
  [K in keyof T & string]: {
    readonly id: string;
    readonly type: K;
    /** Lattice cell, count from the lattice origin. */
    readonly at?: readonly [number, number];
    readonly face?: 1 | 2;
  } & (T[K] extends { readonly fields: readonly (infer I)[] } ? FieldsRecord<I> : unknown);
}[keyof T & string];

type FieldsRecord<U> = {
  [F in U as F extends { readonly type: "derived" } ? never : F extends { readonly id: infer K extends string } ? K : never]: FieldValue<F>;
};

type Simplify<T> = { [K in keyof T]: T[K] } & {};

/** Build params typed from a chase's declared fields. */
export type ParamsOf<C extends Chase> = Simplify<FieldsRecord<C["params"][number]["fields"][number]>>;

// Source form (D-178). A chase.ts file is data written in TypeScript
// syntax, so tsc and ParamsOf check it in the editor, while every command
// that reads it (chase.validate, chase.diff, chase.patch, part.build,
// chase.bake, the FAB app) parses the literal and executes nothing. The
// reader lives in packages/chase/src/source.ts, has no dependency on the
// TypeScript compiler, and runs the same in node and in a bake.

/**
 * The rules a chase.ts source must meet. A source breaking one is refused
 * with E_SCHEMA; CommandError.record is "chase-source/<rule>" and
 * CommandError.path the JSON pointer of the offending value where one
 * exists.
 *
 * - imports: from "@hackbuild/kernel/author" only, importing the value
 *   defineChase and any names marked `type`; `import type` lines from that
 *   module or "@hackbuild/spec". No side-effect import, no other module.
 * - export: exactly one `export const chase = defineChase(<object>);`, an
 *   optional `export default chase;`, and any number of `type`,
 *   `export type` and `interface` declarations, which the reader skips as
 *   erased. No other statement.
 * - literal: every value is a string literal (single or double quotes, or a
 *   template with no substitution), a numeric literal with an optional
 *   leading minus, true, false, null, an array literal or an object literal.
 *   Comments, trailing commas and `as const` after a literal are allowed.
 * - no-identifier: no identifier as a value (undefined, NaN and Infinity
 *   included), no call, no new, no operator other than the leading minus.
 * - no-spread: no spread element or spread property.
 * - keys: object keys are identifiers or string literals; no computed,
 *   numeric, shorthand, getter, setter or method member; no repeated key.
 * - finite: every number is finite after parse.
 * - size: source at most 262144 bytes and nesting at most 32 deep (plan
 *   budgets, inferred).
 * - build-path: Chase.build.module as documented on that field.
 * - id: ChaseMeta.id is a lowercase slug, CHASE_ID_PATTERN; every printed
 *   and mirrored id stays one plain token (defence in depth beside the
 *   escaping core does).
 */
export const CHASE_SOURCE_RULES = [
  "imports", "export", "literal", "no-identifier", "no-spread", "keys", "finite", "size", "build-path", "id",
] as const;
/** ChaseMeta.id: lowercase letters and digits in runs joined by single hyphens. */
export const CHASE_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export type ChaseSourceRule = (typeof CHASE_SOURCE_RULES)[number];

/** Source budgets for CHASE_SOURCE_RULES "size" (inferred plan budgets, D-178). */
export const CHASE_SOURCE_LIMITS = {
  /** bytes */
  maxBytes: 262144,
  /** nesting depth, count */
  maxDepth: 32,
} as const;

/**
 * Where one value sits in the source: byte offsets [start, end) of its
 * literal text. chase.patch writes through spans: a pointer edit replaces
 * the span with the serialised literal; a pointer ending "-" inserts after
 * the last element of an array (or before "]" in an empty one) with the
 * indentation of its siblings; a remove deletes the span and one adjacent
 * comma. Bytes outside the edited spans never change, so comments and
 * layout survive. After writing, the reader parses the result again; a
 * value tree that differs from the expected one is E_STALE and nothing is
 * written.
 */
export interface ChaseSourceSpan {
  /** RFC 6901 JSON pointer into the chase, for example "/params/1/fields/0/default". */
  readonly pointer: string;
  /** Byte offset, inclusive. */
  readonly start: number;
  /** Byte offset, exclusive. */
  readonly end: number;
}

/** What the source reader returns: the chase as data plus spans for patching. */
export interface ChaseSourceRead {
  readonly chase: Chase;
  /** One span per value, in source order. */
  readonly spans: readonly ChaseSourceSpan[];
  /** sha256 of the source bytes. */
  readonly sourceHash: Hash;
}

/**
 * The reader's signature (packages/chase/src/source.ts). It tokenises and
 * parses the restricted form, applies CHASE_SOURCE_RULES, then the derived
 * zod schema, migrate and deep normalise (D-131). It never imports,
 * evaluates or type-checks the file; type checking is the editor's and
 * CI's `tsc`, and a test asserts that for every reference the reader's
 * value equals the module's default export.
 */
export type ReadChaseSource = (source: string, path: string) => ChaseSourceRead;

/**
 * Rules chase.validate applies to the parsed value after CHASE_SOURCE_RULES
 * and the derived schema (D-131). The source reader and chase.patch never
 * run tsc (D-178), so these hold at runtime even though defineChase also
 * checks the first four in the editor. chase.patch runs the same rules on
 * the patched value before writing and writes nothing on a failure. Each
 * failure is a CommandError (D-133) with record "chase-param/<rule>" and
 * path the JSON pointer of the failing value.
 *
 * - field-id-unique (E_SCHEMA): a field id appears once across all groups;
 *   path names the second occurrence.
 * - enum-default (E_SCHEMA): an enum field's default is one of its
 *   options[].value.
 * - default-range (E_SCHEMA): a numeric field's range has min at most max,
 *   and its default lies inside the range. Type level cannot do this check,
 *   since it needs literal arithmetic.
 * - show-when (E_REF): every leaf `field` of a showWhen on a field or a
 *   group, walked through `all` and `any`, names a declared field id;
 *   `near` lists candidates.
 * - preset-param (E_REF): every key of a preset's params is a declared
 *   field id, and every key of a group preset's params is a field id of
 *   that group; `near` lists candidates.
 * - instance-type (E_REF): every instance in params and presets carries a
 *   `type` declared in its field's `types`, and its keys are that type's
 *   field ids (P-12).
 * - readout (E_SCHEMA): a group's readouts are derived fields, verdict
 *   bands ascend, a limit has max or min, and an `auto.at` lies inside
 *   the range (P-02, P-03, P-17).
 * - fold (E_REF): every id in a group's fold names a field of that group
 *   (P-16).
 */
export const CHASE_PARAM_RULES = [
  "field-id-unique", "enum-default", "default-range", "show-when", "preset-param",
  "instance-type", "readout", "fold",
] as const;
export type ChaseParamRule = (typeof CHASE_PARAM_RULES)[number];

// Type-level checks for defineChase, in the style of CheckedBench (bench.ts).
// A failing value is replaced by a template literal naming the mistake, so
// tsc reports it at the offending literal.
type FieldIdsOf<Fs> = Fs extends readonly [infer F, ...infer R] ? [F extends { readonly id: infer K } ? K : never, ...FieldIdsOf<R>] : [];
type GroupFieldIds<Gs> = Gs extends readonly [infer G, ...infer R]
  ? [...(G extends { readonly fields: infer Fs } ? FieldIdsOf<Fs> : []), ...GroupFieldIds<R>] : [];
type CountOf<T, X, N extends unknown[] = []> = T extends readonly [infer H, ...infer R] ? CountOf<R, X, [H] extends [X] ? [...N, 1] : N> : N["length"];
type AllFieldIds<C extends Chase> = C["params"][number]["fields"][number]["id"];

/** Every leaf field id a ShowWhen names, walked through all and any. */
type ShowWhenFields<W> =
  W extends { readonly field: infer K } ? K
  : W extends { readonly all: readonly (infer X)[] } ? ShowWhenFields<X>
  : W extends { readonly any: readonly (infer X)[] } ? ShowWhenFields<X>
  : never;

/** A showWhen with an undeclared leaf turns into a message type naming it. */
type CheckShowWhen<C extends Chase, T> =
  T extends { readonly showWhen: infer W }
    ? ([Exclude<ShowWhenFields<W>, AllFieldIds<C>>] extends [never]
        ? unknown
        : { readonly showWhen: `unknown field: ${Exclude<ShowWhenFields<W>, AllFieldIds<C>> & string}` })
    : unknown;

type CheckField<C extends Chase, F> =
  & (F extends { readonly id: infer K } ? (CountOf<GroupFieldIds<C["params"]>, K> extends 1 ? unknown : { readonly id: `duplicate field id: ${K & string}` }) : unknown)
  & (F extends { readonly type: "enum"; readonly options: readonly (infer O)[]; readonly default: infer D }
      ? (D extends (O extends { readonly value: infer V } ? V : never) ? unknown : { readonly default: `enum default not in options: ${D & string}` })
      : unknown)
  & CheckShowWhen<C, F>;

type CheckGroup<C extends Chase, G> =
  & (G extends { readonly fields: infer Fs extends readonly unknown[] } ? { readonly fields: { readonly [I in keyof Fs]: Fs[I] & CheckField<C, Fs[I]> } } : unknown)
  & CheckShowWhen<C, G>;

type CheckPresetParams<C extends Chase, P> = { readonly [K in keyof P]: K extends keyof ParamsOf<C> ? P[K] : `unknown param: ${K & string}` };

type CheckedParams<C extends Chase> =
  C extends { readonly params: infer Gs extends readonly unknown[] } ? { readonly params: { readonly [I in keyof Gs]: Gs[I] & CheckGroup<C, Gs[I]> } } : unknown;
type CheckedPresets<C extends Chase> =
  C extends { readonly presets: infer Ps extends readonly unknown[] }
    ? { readonly presets: { readonly [I in keyof Ps]: Ps[I] extends { readonly params: infer P } ? Omit<Ps[I], "params"> & { readonly params: CheckPresetParams<C, P> & Partial<ParamsOf<C>> } : Ps[I] } }
    : unknown;

/**
 * The chase as written, with field id uniqueness, enum defaults, showWhen
 * references and preset keys checked (CHASE_PARAM_RULES 1, 2, 4, 5), and
 * no top-level key Chase lacks: a generic parameter skips excess property
 * checks, so a retired `checks` selector (D-173) would otherwise compile.
 * default-range stays a runtime rule.
 */
export type CheckedChase<C extends Chase> = C & CheckedParams<C> & CheckedPresets<C> & CheckedKeys<C>;

type CheckedKeys<C> = { readonly [K in Exclude<keyof C, keyof Chase>]: `no such field on Chase: ${K & string}` };

/**
 * Identity that keeps literal types, so ParamsOf sees option values and ids,
 * and checks the chase through CheckedChase. Identity at runtime.
 */
export function defineChase<const C extends Chase>(c: C & NoInfer<CheckedChase<C>>): C {
  return c;
}

/** Ties a build function's params to its chase. Identity at runtime. */
export function defineBuild<const C extends Chase>(_chase: C, fn: BuildFn<ParamsOf<C>>): BuildFn<ParamsOf<C>> {
  return fn;
}
