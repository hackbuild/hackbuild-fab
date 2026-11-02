//#region spec/ids.ts
var e = 1024, t = "hbf-mesh-2", n = [
	"SLIDE",
	"LOCATE",
	"PRESS",
	"SNAP",
	"LAP",
	"SLIP",
	"PSLIP",
	"GUIDE",
	"PGUIDE"
], r = [
	"profile",
	"geom",
	"mesh",
	"3mf",
	"sim",
	"circuit",
	"copper",
	"board",
	"nest",
	"inlay",
	"motion"
], i = [
	"raster",
	"prism",
	"stack",
	"revolve",
	"lathe",
	"trace",
	"loft",
	"sweep",
	"csg",
	"imported",
	"brep"
], a = [
	"fdm",
	"laser",
	"vinyl",
	"pcb",
	"paper"
], o = [
	"block",
	"warn",
	"note"
], s = {
	block: "block-export",
	warn: "show",
	note: "inform"
}, c = [
	"verified",
	"measured",
	"vendor",
	"community",
	"inferred"
], l = [
	"measured",
	"computed",
	"vendor",
	"inferred",
	"unknown"
], u = {
	verified: "vendor",
	measured: "measured",
	vendor: "vendor",
	community: "measured",
	inferred: "inferred"
}, d = [
	"flex-conductor",
	"flex",
	"conductor",
	"art",
	"body"
], f = [
	"bore",
	"pocket",
	"boss",
	"tabSlot",
	"snap",
	"chamfer",
	"round",
	"edgeProfile",
	"window",
	"web",
	"screw",
	"hinge",
	"conductor",
	"contact",
	"port",
	"pad",
	"horn",
	"detent",
	"finger",
	"flexCut",
	"lamination",
	"bridge"
], p = [
	"thread",
	"bayonet",
	"magnet",
	"inlay",
	"insert",
	"spring",
	"mount",
	"relief"
], ee = [...f, ...p], te = [
	"sweepcut",
	"coupling",
	"loom",
	"keel",
	"seat",
	"hangSlot",
	"peg",
	"sheetThrough",
	"halfLap",
	"stencil",
	"applique",
	"weir",
	"peristaltic"
], ne = {
	tabslot: "tabSlot",
	flexcut: "flexCut"
}, re = {
	latch: "mechanism: MechanismDef displacement-coincidence-latch, apply() emits bore, pocket and web features, the latch.margin metric gated by CHK-MOT-05 and an identity assertion (spec/canon.ts, Author.mech)",
	coupon: "reference: reference/coupons/<id>/ whose chase declares Chase.coupon (spec/chase.ts CouponDecl); its geometry is ordinary features",
	pivot: "joint: JointDecl kind revolute with via (bore pair) and stock for bought round stock between sheet parts (spec/part-ir.ts)",
	pinInSlot: "joint: JointDecl kind prismatic or planar with via (pin feature, slot window or pocket) and range, plus a contact assertion over range (spec/part-ir.ts)",
	pin_in_slot: "joint: as pinInSlot"
}, ie = ["chamfer", "round"], ae = [
	"M00",
	"M01",
	"M02",
	"M03",
	"M04",
	"M05",
	"M06",
	"M07",
	"M08",
	"M09",
	"M10",
	"M11",
	"M12",
	"M13",
	"M14",
	"M15",
	"M16"
], oe = {
	pocket: "M03",
	inlay: "M03",
	conductor: "M05",
	contact: "M05",
	port: "M05",
	pad: "M05",
	bore: "M06",
	window: "M06",
	detent: "M06",
	finger: "M06",
	flexCut: "M06",
	spring: "M06",
	hinge: "M10",
	thread: "M10",
	bayonet: "M10",
	magnet: "M10",
	insert: "M10",
	relief: "M10",
	boss: "M11",
	tabSlot: "M11",
	snap: "M11",
	chamfer: "M11",
	round: "M11",
	edgeProfile: "M11",
	web: "M11",
	screw: "M11",
	horn: "M11",
	lamination: "M11",
	bridge: "M11",
	mount: "M11"
}, se = [
	"outline",
	"routedSlot",
	"npthMount",
	"keepout",
	"antennaKeepout",
	"silkString",
	"artLayer",
	"registrationMark",
	"castellatedSeat",
	"solderJumper",
	"maskOpening",
	"thermalSlot",
	"bareLead",
	"declaredBridge"
], ce = "mergeApplied", le = [
	"base",
	"preUnionCutters",
	"unionPositives",
	"postUnionCutters",
	"partition",
	"insets",
	"frameEmit",
	"hash"
], ue = ["@hackbuild/kernel/author", "@hackbuild/spec"], de = {
	wallMs: 3e4,
	heapMb: 2048,
	maxResultBytes: 67108864,
	imports: ue,
	fsRead: "design-and-kernel",
	fsWrite: !1,
	network: !1,
	childProcess: !1,
	workers: !1,
	addons: !1,
	env: "empty"
}, fe = [
	"import",
	"fs-read",
	"fs-write",
	"network",
	"child-process",
	"worker",
	"addon",
	"wall",
	"heap",
	"result-size",
	"result-schema",
	"generator"
], pe = [
	"PRT",
	"FIT",
	"ASM",
	"SHT",
	"NET",
	"BRD",
	"MOT",
	"3MF",
	"INL",
	"LNT",
	"SHP",
	"KEY",
	"UI",
	"ART",
	"DEV",
	"CLAIM"
], me = [
	"E_SCHEMA",
	"E_REF",
	"E_UNSAT",
	"E_HANDLE",
	"E_STALE",
	"E_PROVENANCE",
	"E_GATE",
	"E_GATE_UNAVAILABLE",
	"E_REPEAT",
	"E_KERNEL",
	"E_PARAM_MISSING",
	"E_DRAFT",
	"E_EXISTS"
];
function he(e) {
	if (!(e instanceof Error) || !("hbf" in e)) return !1;
	let t = e.hbf;
	return typeof t == "object" && !!t && me.includes(t.code);
}
function m(e) {
	let t = e.path === void 0 || e.path === "" ? "" : ` ${e.path}`;
	return Object.assign(/* @__PURE__ */ Error(`${e.code}${t} ${e.hint}`), { hbf: e });
}
function h(e, t) {
	let n = Array.from({ length: t.length + 1 }, (e, t) => t);
	for (let r = 1; r <= e.length; r += 1) {
		let i = n[0];
		n[0] = r;
		for (let a = 1; a <= t.length; a += 1) {
			let o = n[a];
			n[a] = Math.min(n[a] + 1, n[a - 1] + 1, i + (e[r - 1] === t[a - 1] ? 0 : 1)), i = o;
		}
	}
	return n[t.length];
}
function ge(e, t, n = 3, r = {}) {
	let i = typeof e == "string" ? e : "", a = (e) => {
		let t = h(i, e);
		return r.segments === !0 ? Math.min(t, ...e.split("-").map((e) => h(i, e) + 1)) : t;
	};
	return [...new Set(t)].filter((e) => e !== i).map((e) => ({
		c: e,
		d: a(e)
	})).sort((e, t) => e.d - t.d || (e.c < t.c ? -1 : +(e.c > t.c))).slice(0, n).map((e) => e.c);
}
var g = {
	pass: 0,
	fail: 1,
	input: 2,
	gateUnavailable: 3,
	provenance: 4,
	repeat: 5,
	internal: 70
}, _e = {
	E_SCHEMA: {
		exit: g.input,
		http: 422,
		isError: !0
	},
	E_REF: {
		exit: g.input,
		http: 422,
		isError: !0
	},
	E_HANDLE: {
		exit: g.input,
		http: 422,
		isError: !0
	},
	E_STALE: {
		exit: g.input,
		http: 422,
		isError: !0
	},
	E_UNSAT: {
		exit: g.fail,
		http: 200,
		isError: !1
	},
	E_PROVENANCE: {
		exit: g.provenance,
		http: 409,
		isError: !0
	},
	E_GATE_UNAVAILABLE: {
		exit: g.gateUnavailable,
		http: 403,
		isError: !0
	},
	E_REPEAT: {
		exit: g.repeat,
		http: 429,
		isError: !0
	},
	E_GATE: {
		exit: g.gateUnavailable,
		http: 403,
		isError: !0
	},
	E_KERNEL: {
		exit: g.fail,
		http: 200,
		isError: !0
	},
	E_PARAM_MISSING: {
		exit: g.input,
		http: 422,
		isError: !0
	},
	E_DRAFT: {
		exit: g.input,
		http: 409,
		isError: !0
	},
	E_EXISTS: {
		exit: g.input,
		http: 409,
		isError: !0
	}
}, ve = {
	pass: {
		exit: g.pass,
		http: 200,
		isError: !1
	},
	warn: {
		exit: g.pass,
		http: 200,
		isError: !1
	},
	fail: {
		exit: g.fail,
		http: 200,
		isError: !1
	},
	skip: {
		exit: g.pass,
		http: 200,
		isError: !1
	}
}, _ = (e) => e.replace(/~/g, "~0").replace(/\//g, "~1"), ye = (e) => `/facts/${_(e)}`;
function be(e, t, n) {
	return m({
		code: "E_PARAM_MISSING",
		path: ye(e),
		got: t === void 0 ? null : typeof t == "number" ? String(t) : t,
		expected: "a finite number",
		hint: `fact ${e} is missing or not a finite number; pass it in facts`,
		record: n
	});
}
function v(e, t, n) {
	let r = Object.hasOwn(e.facts, t) ? e.facts[t] : void 0;
	if (typeof r == "number" && Number.isFinite(r)) return r;
	throw be(t, r, n);
}
function xe(e, t, n) {
	let r = v(e, t, n);
	if (r >= 0) return r;
	throw m({
		code: "E_SCHEMA",
		path: `/facts/${t}`,
		got: String(r),
		expected: "a number at least 0",
		hint: `fact ${t} is a clearance in mm; pass 0 or more`,
		record: n
	});
}
function Se(e, t, n, r) {
	if (Object.hasOwn(e.facts, t)) return {
		value: v(e, t, r),
		row: null
	};
	let i = e.profile.constant(n);
	return {
		value: i.value,
		row: i
	};
}
var Ce = (e) => e.flatMap((e) => e.row === null ? [] : [e.row.provenance.tier]);
//#endregion
//#region spec/profile.ts
function y(e) {
	let t = null;
	for (let n of e) (t === null || c.indexOf(n) > c.indexOf(t)) && (t = n);
	return t;
}
function we(e) {
	return {
		qualifier: u[e],
		basis: e
	};
}
function Te(e) {
	let t = [];
	for (let n of e) {
		if (n === null) return {
			qualifier: "unknown",
			basis: null
		};
		t.push(n);
	}
	return {
		qualifier: "computed",
		basis: y(t)
	};
}
function Ee(e, t) {
	return (e - t) / 2;
}
//#endregion
//#region spec/registry.ts
var De = [
	"featureKinds",
	"checks",
	"constraints",
	"exporters",
	"simModels",
	"panels",
	"adapters",
	"profiles",
	"motion",
	"mechanisms",
	"archetypes"
], Oe = [
	"single",
	"composer",
	"surface",
	"board",
	"machine",
	"catalog"
], ke = 2, Ae = [
	"layer",
	"breakers",
	"assembly",
	"pause",
	"pinout",
	"hookup",
	"grams",
	"checked",
	"fit-test"
], je = [
	"imports",
	"export",
	"literal",
	"no-identifier",
	"no-spread",
	"keys",
	"finite",
	"size",
	"build-path",
	"id"
], Me = /^[a-z0-9]+(-[a-z0-9]+)*$/, Ne = {
	maxBytes: 262144,
	maxDepth: 32
}, Pe = [
	"field-id-unique",
	"enum-default",
	"default-range",
	"show-when",
	"preset-param",
	"instance-type",
	"readout",
	"fold"
];
function Fe(e) {
	return e;
}
function Ie(e, t) {
	return t;
}
//#endregion
//#region spec/bench.ts
var Le = 1, Re = [
	"logic",
	"ohm",
	"settle",
	"adc",
	"travel",
	"dir",
	"pinV",
	"pullupOhm",
	"force",
	"pressure",
	"tilt"
];
function ze(e, t) {
	return {
		...t,
		chase: e.meta.id,
		bench: 1
	};
}
//#endregion
//#region spec/widgets.ts
var Be = [
	"drive.tilt",
	"drive.press",
	"drive.touch",
	"drive.fader",
	"drive.code",
	"plot.curve",
	"readout.signal",
	"view.light",
	"view.netlens"
], b = "DRAFT_", Ve = "hbf:draft", He = "1", Ue = "https://tools.hack.build/3mf/2026/draft", We = "DRAFT: not adopted. checks ran as warnings only. run hbf adopt before you print it.", Ge = "draft: checks show as warnings until hbf adopt runs them as blocking", Ke = "application/hbf-draft+json", qe = "draft.json", Je = ".hbf/drafts", Ye = (e) => e.startsWith("DRAFT_") ? e : `${b}${e}`, Xe = "BENCH", Ze = {
	"print-card": "card",
	design: "json",
	stlzip: "stl"
}, Qe = "unknown export kind: ", $e = [
	"query",
	"author",
	"build",
	"prove",
	"look",
	"make"
], et = /* @__PURE__ */ "constraints.query,catalog.find,catalog.pins,mech.find,mech.derive,arch.find,knowledge.search,reference.list,chase.scaffold,chase.validate,chase.diff,chase.patch,arch.apply,init,part.build,part.inspect,part.probe,asm.solve,check.run,fits.table,sim.run,sim.sweep,circuit.solve,motion.run,rules.audit,view.render,chase.render,project.graph,chase.bake,nest.pack,export.run,draft,adopt".split(","), tt = {
	"constraints.query": "query",
	"catalog.find": "query",
	"catalog.pins": "query",
	"mech.find": "query",
	"mech.derive": "query",
	"arch.find": "query",
	"knowledge.search": "query",
	"reference.list": "query",
	"chase.scaffold": "author",
	"chase.validate": "author",
	"chase.diff": "author",
	"chase.patch": "author",
	"arch.apply": "author",
	init: "author",
	"part.build": "build",
	"part.inspect": "build",
	"part.probe": "build",
	"asm.solve": "build",
	"check.run": "prove",
	"fits.table": "prove",
	"sim.run": "prove",
	"sim.sweep": "prove",
	"circuit.solve": "prove",
	"motion.run": "prove",
	"rules.audit": "prove",
	"view.render": "look",
	"chase.render": "look",
	"project.graph": "look",
	"chase.bake": "make",
	"nest.pack": "make",
	"export.run": "make",
	draft: "make",
	adopt: "make"
}, nt = [
	"init",
	"project.graph",
	"draft",
	"adopt"
], rt = [
	"mcp",
	"doctor",
	"explain",
	"gc",
	"parity",
	"counts",
	"evidence",
	"capabilities"
], x = [
	"constraints_query",
	"catalog_search",
	"canon_search",
	"mech_derive",
	"knowledge_search",
	"chase_scaffold",
	"chase_validate",
	"chase_patch",
	"arch_apply",
	"part_build",
	"part_probe",
	"layout_solve",
	"check_run",
	"sim_run",
	"circuit_solve",
	"motion_run",
	"view_render",
	"chase_bake",
	"export_run"
], it = /^[a-zA-Z0-9_-]{1,128}$/, at = (e) => (e.verdict === "pass" || e.verdict === "warn") && e.errors.length === 0, ot = { "catalog.find": ["fetch"] }, S = {
	readOnlyHint: !0,
	destructiveHint: !1,
	idempotentHint: !0,
	openWorldHint: !1
}, C = {
	readOnlyHint: !1,
	destructiveHint: !1,
	idempotentHint: !1,
	openWorldHint: !1
}, w = {
	readOnlyHint: !1,
	destructiveHint: !1,
	idempotentHint: !0,
	openWorldHint: !1
}, T = [
	{
		name: "constraints_query",
		covers: ["constraints.query"],
		selector: null,
		annotations: S,
		task: "never",
		gated: !1,
		profiles: ["query,prove", "sweep"]
	},
	{
		name: "catalog_search",
		covers: ["catalog.find", "catalog.pins"],
		selector: "op",
		annotations: S,
		task: "never",
		gated: !1,
		profiles: ["query,prove"]
	},
	{
		name: "canon_search",
		covers: [
			"mech.find",
			"arch.find",
			"reference.list"
		],
		selector: "canon",
		annotations: S,
		task: "never",
		gated: !1,
		profiles: ["query,prove"]
	},
	{
		name: "mech_derive",
		covers: ["mech.derive"],
		selector: null,
		annotations: S,
		task: "never",
		gated: !1,
		profiles: ["query,prove"]
	},
	{
		name: "knowledge_search",
		covers: ["knowledge.search"],
		selector: null,
		annotations: S,
		task: "never",
		gated: !1,
		profiles: ["query,prove"]
	},
	{
		name: "chase_scaffold",
		covers: ["chase.scaffold"],
		selector: null,
		annotations: C,
		task: "never",
		gated: !1,
		profiles: []
	},
	{
		name: "chase_validate",
		covers: ["chase.validate", "chase.diff"],
		selector: "op",
		annotations: S,
		task: "never",
		gated: !1,
		profiles: ["query,prove"]
	},
	{
		name: "chase_patch",
		covers: ["chase.patch"],
		selector: null,
		annotations: C,
		task: "never",
		gated: !1,
		profiles: []
	},
	{
		name: "arch_apply",
		covers: ["arch.apply"],
		selector: null,
		annotations: C,
		task: "never",
		gated: !1,
		profiles: []
	},
	{
		name: "part_build",
		covers: ["part.build", "part.inspect"],
		selector: "op",
		annotations: w,
		task: "over2s",
		gated: !1,
		profiles: ["sweep"]
	},
	{
		name: "part_probe",
		covers: ["part.probe"],
		selector: null,
		annotations: S,
		task: "never",
		gated: !1,
		profiles: []
	},
	{
		name: "layout_solve",
		covers: ["asm.solve", "nest.pack"],
		selector: "op",
		annotations: w,
		task: "over2s",
		gated: !1,
		profiles: ["sweep"]
	},
	{
		name: "check_run",
		covers: ["check.run", "fits.table"],
		selector: "report",
		annotations: S,
		task: "over2s",
		gated: !1,
		profiles: ["query,prove", "sweep"]
	},
	{
		name: "sim_run",
		covers: ["sim.run", "sim.sweep"],
		selector: "mode",
		annotations: S,
		task: "always",
		gated: !1,
		profiles: ["query,prove"]
	},
	{
		name: "circuit_solve",
		covers: ["circuit.solve"],
		selector: null,
		annotations: S,
		task: "never",
		gated: !1,
		profiles: ["query,prove"]
	},
	{
		name: "motion_run",
		covers: ["motion.run", "rules.audit"],
		selector: "op",
		annotations: S,
		task: "over2s",
		gated: !1,
		profiles: ["query,prove"]
	},
	{
		name: "view_render",
		covers: ["view.render"],
		selector: null,
		annotations: S,
		task: "never",
		gated: !1,
		profiles: ["sweep"]
	},
	{
		name: "chase_bake",
		covers: ["chase.bake", "chase.render"],
		selector: "mode",
		annotations: w,
		task: "always",
		gated: !1,
		profiles: []
	},
	{
		name: "export_run",
		covers: ["export.run"],
		selector: null,
		annotations: {
			readOnlyHint: !1,
			destructiveHint: !0,
			idempotentHint: !1,
			openWorldHint: !1
		},
		task: "always",
		gated: !0,
		requires: ["print.3mf", "cut.svg"],
		profiles: ["sweep"]
	}
];
function E(e) {
	let t = T;
	return e === "all" ? t : t.filter((t) => t.profiles.includes(e));
}
var st = {
	all: x,
	"query,prove": E("query,prove").map((e) => e.name),
	sweep: E("sweep").map((e) => e.name)
}, ct = 5e3, lt = 6e5, ut = 18e5, dt = 3, ft = 4, pt = [
	"mesh.3d",
	"sheet.2d",
	"circuit.netlist",
	"print.3mf",
	"cut.svg",
	"render",
	"check"
], mt = [
	"send.print",
	"fire.laser",
	"heat.bed",
	"cut.vinyl"
];
//#endregion
//#region \0@oxc-project+runtime@0.152.0/helpers/esm/typeof.js
function D(e) {
	"@babel/helpers - typeof";
	return D = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
		return typeof e;
	} : function(e) {
		return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
	}, D(e);
}
//#endregion
//#region \0@oxc-project+runtime@0.152.0/helpers/esm/toPrimitive.js
function ht(e, t) {
	if (D(e) != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (D(r) != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
//#endregion
//#region \0@oxc-project+runtime@0.152.0/helpers/esm/toPropertyKey.js
function gt(e) {
	var t = ht(e, "string");
	return D(t) == "symbol" ? t : t + "";
}
//#endregion
//#region \0@oxc-project+runtime@0.152.0/helpers/esm/defineProperty.js
function O(e, t, n) {
	return (t = gt(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
//#endregion
//#region spec/jcs.ts
var k = class extends Error {
	constructor(e, t) {
		super(`canonical JSON has no form for ${t} at ${e === "" ? "/" : e}`), O(this, "path", void 0), O(this, "got", void 0), this.name = "CanonicalizeError", this.path = e, this.got = t;
	}
}, _t = (e) => e.replace(/~/g, "~0").replace(/\//g, "~1");
function A(e, t) {
	if (e === null) return "null";
	switch (typeof e) {
		case "number":
			if (!Number.isFinite(e)) throw new k(t, String(e));
			return JSON.stringify(e);
		case "string":
		case "boolean": return JSON.stringify(e);
		case "bigint": throw new k(t, `${String(e)}n`);
		case "undefined":
		case "function":
		case "symbol": return;
	}
	if (Array.isArray(e)) return `[${e.map((e, n) => A(e, `${t}/${n}`) ?? "null").join(",")}]`;
	if (ArrayBuffer.isView(e) && !(e instanceof DataView)) return A(Array.from(e), t);
	let n = e, r = [];
	for (let e of Object.keys(n).sort()) {
		let i = A(n[e], `${t}/${_t(e)}`);
		i !== void 0 && r.push(`${JSON.stringify(e)}:${i}`);
	}
	return `{${r.join(",")}}`;
}
function j(e) {
	return A(e, "") ?? "null";
}
function M(e) {
	let t = [];
	for (let n = 0; n < e.length; n += 1) {
		let r = e.charCodeAt(n);
		if (r >= 55296 && r <= 56319 && n + 1 < e.length) {
			let t = e.charCodeAt(n + 1);
			t >= 56320 && t <= 57343 && (r = 65536 + (r - 55296 << 10) + (t - 56320), n += 1);
		}
		r >= 55296 && r <= 57343 && (r = 65533), r < 128 ? t.push(r) : r < 2048 ? t.push(192 | r >> 6, 128 | r & 63) : r < 65536 ? t.push(224 | r >> 12, 128 | r >> 6 & 63, 128 | r & 63) : t.push(240 | r >> 18, 128 | r >> 12 & 63, 128 | r >> 6 & 63, 128 | r & 63);
	}
	return Uint8Array.from(t);
}
var vt = new Uint32Array([
	1116352408,
	1899447441,
	3049323471,
	3921009573,
	961987163,
	1508970993,
	2453635748,
	2870763221,
	3624381080,
	310598401,
	607225278,
	1426881987,
	1925078388,
	2162078206,
	2614888103,
	3248222580,
	3835390401,
	4022224774,
	264347078,
	604807628,
	770255983,
	1249150122,
	1555081692,
	1996064986,
	2554220882,
	2821834349,
	2952996808,
	3210313671,
	3336571891,
	3584528711,
	113926993,
	338241895,
	666307205,
	773529912,
	1294757372,
	1396182291,
	1695183700,
	1986661051,
	2177026350,
	2456956037,
	2730485921,
	2820302411,
	3259730800,
	3345764771,
	3516065817,
	3600352804,
	4094571909,
	275423344,
	430227734,
	506948616,
	659060556,
	883997877,
	958139571,
	1322822218,
	1537002063,
	1747873779,
	1955562222,
	2024104815,
	2227730452,
	2361852424,
	2428436474,
	2756734187,
	3204031479,
	3329325298
]), N = (e, t) => e >>> t | e << 32 - t;
function P(e) {
	let t = typeof e == "string" ? M(e) : e, n = t.length * 8, r = new Uint8Array(Math.ceil((t.length + 9) / 64) * 64);
	r.set(t), r[t.length] = 128;
	let i = new DataView(r.buffer);
	i.setUint32(r.length - 8, Math.floor(n / 4294967296), !1), i.setUint32(r.length - 4, n >>> 0, !1);
	let a = new Uint32Array([
		1779033703,
		3144134277,
		1013904242,
		2773480762,
		1359893119,
		2600822924,
		528734635,
		1541459225
	]), o = /* @__PURE__ */ new Uint32Array(64);
	for (let e = 0; e < r.length; e += 64) {
		for (let t = 0; t < 16; t += 1) o[t] = i.getUint32(e + t * 4, !1);
		for (let e = 16; e < 64; e += 1) {
			let t = o[e - 15], n = o[e - 2], r = N(t, 7) ^ N(t, 18) ^ t >>> 3, i = N(n, 17) ^ N(n, 19) ^ n >>> 10;
			o[e] = o[e - 16] + r + o[e - 7] + i >>> 0;
		}
		let t = a[0], n = a[1], r = a[2], s = a[3], c = a[4], l = a[5], u = a[6], d = a[7];
		for (let e = 0; e < 64; e += 1) {
			let i = N(c, 6) ^ N(c, 11) ^ N(c, 25), a = c & l ^ ~c & u, f = d + i + a + vt[e] + o[e] >>> 0, p = (N(t, 2) ^ N(t, 13) ^ N(t, 22)) + (t & n ^ t & r ^ n & r) >>> 0;
			d = u, u = l, l = c, c = s + f >>> 0, s = r, r = n, n = t, t = f + p >>> 0;
		}
		a[0] = a[0] + t >>> 0, a[1] = a[1] + n >>> 0, a[2] = a[2] + r >>> 0, a[3] = a[3] + s >>> 0, a[4] = a[4] + c >>> 0, a[5] = a[5] + l >>> 0, a[6] = a[6] + u >>> 0, a[7] = a[7] + d >>> 0;
	}
	return Array.from(a, (e) => e.toString(16).padStart(8, "0")).join("");
}
//#endregion
//#region spec/art.ts
var F = "hbf.art", yt = 1, I = ["front", "back"], L = [
	"none",
	"through",
	"pocket"
], R = [
	"text",
	"shape",
	"logo",
	"scope",
	"circuit",
	"path",
	"image",
	"relief"
], z = [
	"marker",
	"plexb",
	"plex",
	"elite",
	"vt"
], B = [
	"ring",
	"rect",
	"ellipse",
	"frame",
	"diamond",
	"chevrons",
	"grid",
	"sun",
	"saguaro",
	"mesa",
	"zigzag",
	"steps",
	"arrow"
], V = ["hb", "hsl"], bt = [
	"mono",
	"silhouette",
	"palette"
];
function H(e) {
	return `hbf://art/${P(j(e))}`;
}
function xt(e) {
	return {
		uri: H(e),
		kind: "layers"
	};
}
function St() {
	return {
		schema: F,
		version: 1,
		faces: {
			front: [],
			back: []
		}
	};
}
var Ct = {
	dx: 0,
	dy: 0,
	rot: 0,
	slot: 1,
	slot2: 2,
	cut: "none",
	depth: 1.2,
	mute: !1
}, wt = {
	text: {
		text: "",
		font: "plexb",
		size: 4,
		ls: 0,
		arc: 0,
		splitGap: .6
	},
	shape: {
		shape: "ring",
		w: 20,
		h: 20,
		t: 1.2,
		n: 6
	},
	logo: {
		brand: "hb",
		w: 30
	},
	scope: {
		a: 3,
		b: 2,
		phase: 90,
		w: 30,
		h: 22,
		t: .9
	},
	circuit: {
		seed: 7,
		w: 34,
		h: 40,
		pitch: 2.4,
		tw: .8,
		pad: 2.2,
		drill: .7,
		density: 1,
		clip: "ellipse"
	},
	path: {
		d: "",
		bx: 0,
		by: 0,
		bw: 10,
		bh: 10,
		w: 24
	},
	image: {
		src: "",
		mode: "mono",
		w: 24,
		thr: .5,
		invert: !1
	},
	relief: {
		src: "",
		depthSrc: "",
		source: "depth",
		model: "onnx-community/depth-anything-v2-small",
		device: "auto",
		w: 30,
		height: 2.4,
		base: .24,
		bgcut: .25,
		gamma: 1,
		smooth: .3,
		detail: .15,
		roll: 1.2,
		inset: .6,
		thr: .5,
		invert: !1,
		mode: "smooth",
		split: 1
	}
};
function Tt(e, t, n = {}) {
	return {
		...Ct,
		...wt[e],
		...n,
		id: t,
		kind: e
	};
}
var U = (e) => typeof e == "object" && !!e && !Array.isArray(e), W = (e) => typeof e == "number" && Number.isFinite(e), Et = (e, t) => typeof t == "string" && e.includes(t), G = (e, t) => (n) => e(n) ? null : t, K = G(W, "a number"), q = G((e) => W(e) && e > 0, "a number above 0"), J = G((e) => W(e) && e >= 0, "a number from 0"), Y = G((e) => W(e) && Number.isInteger(e) && e >= 1, "a whole number from 1"), Dt = G((e) => W(e) && Number.isInteger(e), "a whole number"), X = G((e) => typeof e == "string", "a string"), Z = G((e) => typeof e == "boolean", "true or false"), Q = (e) => G((t) => Et(e, t), `one of ${e.join(", ")}`), $ = G((e) => W(e) && e >= 0 && e <= 1, "a number from 0 to 1"), Ot = {
	id: G((e) => typeof e == "string" && e.length > 0, "a non-empty string"),
	dx: K,
	dy: K,
	rot: K,
	slot: Y,
	slot2: Y,
	cut: Q(L),
	depth: J,
	mute: Z
}, kt = {
	text: {
		text: X,
		font: Q(z),
		size: q,
		ls: K,
		arc: K,
		splitGap: J
	},
	shape: {
		shape: Q(B),
		w: q,
		h: q,
		t: q,
		n: Y
	},
	logo: {
		brand: Q(V),
		w: q
	},
	scope: {
		a: Y,
		b: Y,
		phase: K,
		w: q,
		h: q,
		t: q
	},
	circuit: {
		seed: Dt,
		w: q,
		h: q,
		pitch: q,
		tw: q,
		pad: J,
		drill: J,
		density: J,
		clip: Q(["ellipse", "rect"])
	},
	path: {
		d: X,
		bx: K,
		by: K,
		bw: q,
		bh: q,
		w: q
	},
	image: {
		src: X,
		mode: Q(bt),
		w: q,
		thr: $,
		invert: Z
	},
	relief: {
		src: X,
		depthSrc: X,
		source: Q([
			"depth",
			"luma",
			"inflate"
		]),
		model: X,
		device: Q([
			"auto",
			"webgpu",
			"wasm"
		]),
		w: q,
		height: q,
		base: J,
		bgcut: K,
		gamma: q,
		smooth: J,
		detail: K,
		roll: J,
		inset: J,
		thr: $,
		invert: Z,
		mode: Q(["smooth", "terrace"]),
		split: $
	}
};
function At(e) {
	let t = [];
	if (!U(e)) return [{ message: "an art document is an object" }];
	e.schema !== "hbf.art" && t.push({
		message: `schema ${String(e.schema)}, expected ${F}`,
		path: ["schema"]
	}), e.version !== 1 && t.push({
		message: `version ${String(e.version)}, expected 1`,
		path: ["version"]
	});
	let n = e.faces;
	if (!U(n)) return [...t, {
		message: "faces holds front and back lists",
		path: ["faces"]
	}];
	let r = /* @__PURE__ */ new Set();
	for (let e of I) {
		let i = n[e];
		if (!Array.isArray(i)) {
			t.push({
				message: `${e} is a list of layers`,
				path: ["faces", e]
			});
			continue;
		}
		i.forEach((n, i) => {
			let a = [
				"faces",
				e,
				i
			];
			if (!U(n)) {
				t.push({
					message: "a layer is an object",
					path: a
				});
				return;
			}
			let o = n.kind;
			if (!Et(R, o)) {
				t.push({
					message: `kind ${String(o)}, expected one of ${R.join(", ")}`,
					path: [...a, "kind"]
				});
				return;
			}
			for (let [e, r] of [...Object.entries(Ot), ...Object.entries(kt[o])]) {
				let i = r(n[e]);
				i !== null && t.push({
					message: `${e} is ${JSON.stringify(n[e]) ?? "missing"}, expected ${i}`,
					path: [...a, e]
				});
			}
			let s = n.id;
			typeof s == "string" && s.length > 0 && (r.has(s) && t.push({
				message: `id ${s} appears twice; ids are unique across both faces`,
				path: [...a, "id"]
			}), r.add(s));
		});
	}
	return t;
}
var jt = { "~standard": {
	version: 1,
	vendor: "hackbuild-spec",
	validate: (e) => {
		let t = At(e);
		return t.length > 0 ? { issues: t } : { value: e };
	}
} };
//#endregion
export { p as ADMITTED_FEATURE_KINDS, ce as APPLIED_MERGE, V as ART_BRANDS, L as ART_CUTS, F as ART_DOCUMENT_SCHEMA, yt as ART_DOCUMENT_VERSION, I as ART_FACES, z as ART_FONTS, bt as ART_IMAGE_MODES, wt as ART_KIND_DEFAULTS, Ct as ART_LAYER_BASE_DEFAULTS, R as ART_LAYER_KINDS, B as ART_SHAPES, te as BACKLOG_FEATURE_KINDS, Xe as BENCH_GLOBAL, Le as BENCH_SCHEMA_VERSION, se as BOARD_FEATURE_KINDS, ue as BUILD_IMPORTS, de as BUILD_SANDBOX, fe as BUILD_SANDBOX_REASONS, le as BUILD_STAGES, Ae as CARD_SECTIONS, Me as CHASE_ID_PATTERN, Oe as CHASE_KINDS, Pe as CHASE_PARAM_RULES, ke as CHASE_SCHEMA_VERSION, Ne as CHASE_SOURCE_LIMITS, je as CHASE_SOURCE_RULES, pe as CHECK_AREAS, nt as CLI_ONLY, ot as CLI_ONLY_FIELDS, tt as COMMAND_GROUP, et as COMMAND_NAMES, mt as CONSEQUENTIAL_CAPABILITIES, f as CORE_FEATURE_KINDS, k as CanonicalizeError, Je as DRAFTS_DIR, qe as DRAFT_BLOCK_FILE, Ke as DRAFT_BLOCK_TYPE, We as DRAFT_CARD_LINE, Ve as DRAFT_META_KEY, Ue as DRAFT_META_NS, He as DRAFT_META_VALUE, b as DRAFT_PREFIX, Ge as DRAFT_WAIVER, Re as DRIVE_READOUTS, me as ERROR_CODES, _e as ERROR_TRANSPORT, g as EXIT_CODES, Ze as EXPORT_ALIASES, ee as FEATURE_KINDS, oe as FEATURE_KIND_ADMISSION, ne as FEATURE_KIND_ALIASES, lt as GATE_EXPIRY_MS, $e as GROUPS, r as KERNEL_IDS, ae as KIND_MILESTONES, T as MCP_TOOLS, x as MCP_TOOL_NAMES, e as MESH_GRID_PER_MM, t as MESH_HASH_TAG, i as MESH_ROUTES, re as MOVED_FEATURE_KINDS, pt as OBSERVE_CAPABILITIES, ct as OUTPUT_CAP_TOKENS, d as PARTITION_PRIORITY, ie as PRE_UNION_KINDS, a as PROCESSES, l as QUALIFIERS, De as REGISTRY_KINDS, dt as REPEAT_SAME_CALLS, ft as REPEAT_SAME_FAILS, ut as REPEAT_WINDOW_MS, n as SEED_FIT_CLASSES, o as SEVERITIES, s as SEVERITY_EFFECT, c as TIERS, u as TIER_QUALIFIER, st as TOOLSET_PROFILES, it as TOOL_NAME_PATTERN, Qe as UNKNOWN_EXPORT_KIND, rt as UTILITY_VERBS, ve as VERDICT_TRANSPORT, Be as WIDGET_KINDS, At as artDocumentIssues, jt as artDocumentSchema, H as artDocumentUri, xt as artDocumentValue, Tt as artLayer, j as canonicalize, m as commandError, ze as defineBench, Ie as defineBuild, Fe as defineChase, ge as didYouMean, Ye as draftName, h as editDistance, St as emptyArtDocument, be as factMissingError, Se as factOrConstant, ye as factPointer, Ee as gapPerSide, he as isThrownCommandError, y as lowestTier, v as needFact, xe as needNonNegative, _ as pointerToken, Te as qualify, we as qualifyRow, at as resultOk, P as sha256Hex, Ce as tiersOf, E as toolsFor, M as utf8Bytes };
