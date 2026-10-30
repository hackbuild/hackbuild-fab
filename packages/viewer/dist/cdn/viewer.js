import { AmbientLight as e, Box3 as t, BufferAttribute as n, BufferGeometry as r, Color as i, DirectionalLight as a, DoubleSide as o, EdgesGeometry as s, FrontSide as c, Group as l, LineBasicMaterial as u, LineSegments as d, Mesh as f, MeshBasicMaterial as p, MeshStandardMaterial as m, PerspectiveCamera as h, Plane as g, PlaneGeometry as _, REVISION as v, Raycaster as y, Scene as b, Vector2 as x, Vector3 as S, WebGLRenderer as C } from "three";
//#region packages/viewer/src/part-refs.ts
var w = "body";
function T(e, t) {
	let n = [];
	for (let [r, i] of Object.entries(e)) if (!t.has(r)) {
		if (typeof i == "string") n.push(i);
		else if (Array.isArray(i)) for (let e of i) typeof e == "string" && n.push(e);
	}
	return n;
}
var E = /* @__PURE__ */ new Set([
	"id",
	"kind",
	w
]);
function D(e, t) {
	let n = new Set(e.bodies.map((e) => e.id)), r = new Map(e.features.map((e) => [e.id, e])), i = r.get(t);
	if (i === void 0) return n.has(t) ? [t] : [];
	let a = /* @__PURE__ */ new Set();
	n.has(t) && a.add(t);
	for (let e of T(i, E)) n.has(e) && a.add(e);
	for (let e of T(i, E)) {
		let i = r.get(e);
		if (i !== void 0 && e !== t) for (let e of T(i, E)) n.has(e) && a.add(e);
	}
	if (a.size === 0) {
		let e = i[w];
		typeof e == "string" && n.has(e) && a.add(e);
	}
	return e.bodies.map((e) => e.id).filter((e) => a.has(e));
}
function O(e, t) {
	let n = e.features.filter((e) => e.id === t).map((e) => e.id), r = e.features.filter((n) => n.id !== t && D(e, n.id).includes(t)).map((e) => e.id);
	return [...n, ...r];
}
function k(e, t) {
	let n = new Set(e.map((e) => e.id)), r = /* @__PURE__ */ new Map();
	for (let e of t) {
		let t = e.net;
		typeof t == "string" && n.has(e.id) && r.set(e.id, t);
	}
	return r;
}
//#endregion
//#region packages/viewer/src/controls.ts
var A = {
	iso: [-1.2, .85],
	top: [-Math.PI / 2, Math.PI / 2 - .001],
	front: [-Math.PI / 2, .12],
	side: [0, .12],
	under: [-1.2, -.85]
}, j = Object.keys(A), M = .008, N = 1.5, P = .0012, F = [1.1, .9], I = [20, 1500], L = 1.75, R = 4, z = (e, t, n) => Math.min(n, Math.max(t, e));
function B(e, t) {
	let [n, r] = A[t];
	e.theta = n, e.phi = r;
}
function V(e) {
	let [t, n, r] = e.target;
	return [
		t + e.dist * Math.cos(e.phi) * Math.cos(e.theta),
		n + e.dist * Math.cos(e.phi) * Math.sin(e.theta),
		r + e.dist * Math.sin(e.phi)
	];
}
function H(e, t, n) {
	e.theta -= t * M, e.phi = z(e.phi + n * M, -1.5, N);
}
function U(e, t) {
	e.dist = z(e.dist * t, I[0], I[1]);
}
function W(e, t, n) {
	let r = V(e), i = [
		r[0] - e.target[0],
		r[1] - e.target[1],
		r[2] - e.target[2]
	], a = ee([
		i[1],
		-i[0],
		0
	]), [o, s, c] = a, l = ee([
		s * i[2] - c * i[1],
		c * i[0] - o * i[2],
		o * i[1] - s * i[0]
	]), u = e.dist * P;
	for (let r = 0; r < 3; r++) e.target[r] = e.target[r] + a[r] * t * u - l[r] * n * u;
}
function ee(e) {
	let t = Math.hypot(...e) || 1;
	return e.map((e) => e / t);
}
var te = 1.08, ne = .2;
function G(e, t, n) {
	let [r, i] = t;
	for (let t = 0; t < 3; t++) e.target[t] = (r[t] + i[t]) / 2;
	let a = [
		0,
		1,
		2
	].map((e) => i[e] - r[e]), o = Math.max(...a) * L;
	if (n !== void 0 && n.aspect > 0) {
		let e = n.fovDeg * Math.PI / 360, t = Math.atan(Math.tan(e) * n.aspect), r = Math.hypot(...a) / 2;
		o = Math.max(o, te * r / Math.sin(Math.min(e, t)));
	}
	e.dist = z(o, I[0], I[1]);
}
function re(e, t) {
	let n = Math.max(...[
		0,
		1,
		2
	].map((t) => e[1][t] - e[0][t]), 1e-9);
	for (let r = 0; r < 3; r++) {
		let i = e[1][r] - e[0][r], a = t[1][r] - t[0][r], o = (e[1][r] + e[0][r]) / 2, s = (t[1][r] + t[0][r]) / 2;
		if (Math.abs(a - i) > .2 * n || Math.abs(s - o) > .2 * n) return !0;
	}
	return !1;
}
function ie(e, t, n) {
	let r = /* @__PURE__ */ new Map(), i = 0, a = null, o = () => {
		let [e, t] = [...r.values()];
		return e === void 0 || t === void 0 ? {
			span: 0,
			mid: [0, 0]
		} : {
			span: Math.hypot(e.x - t.x, e.y - t.y),
			mid: [(e.x + t.x) / 2, (e.y + t.y) / 2]
		};
	}, s = (t) => {
		r.set(t.pointerId, {
			x: t.clientX,
			y: t.clientY,
			button: t.button
		}), e.setPointerCapture?.(t.pointerId), r.size === 1 && (i = 0), a = r.size === 2 ? o() : null;
	}, c = (e) => {
		let s = r.get(e.pointerId);
		if (s === void 0) return;
		let c = e.clientX - s.x, l = e.clientY - s.y;
		if (s.x = e.clientX, s.y = e.clientY, i += Math.hypot(c, l), r.size === 2 && a !== null) {
			let e = o();
			e.span > 0 && a.span > 0 && U(t, a.span / e.span), W(t, e.mid[0] - a.mid[0], e.mid[1] - a.mid[1]), a = e;
		} else if (r.size === 1) s.button === 0 ? H(t, c, l) : W(t, c, l);
		else return;
		n.change();
	}, l = (e) => {
		let t = r.get(e.pointerId);
		r.delete(e.pointerId), a = r.size === 2 ? o() : null, t !== void 0 && r.size === 0 && t.button === 0 && i <= 4 && e.type === "pointerup" && n.pick(e.clientX, e.clientY);
	}, u = (e) => {
		e.preventDefault(), U(t, e.deltaY > 0 ? F[0] : F[1]), n.change();
	}, d = (e) => e.preventDefault(), f = () => n.refit();
	return e.addEventListener("pointerdown", s), e.addEventListener("pointermove", c), e.addEventListener("pointerup", l), e.addEventListener("pointercancel", l), e.addEventListener("wheel", u, { passive: !1 }), e.addEventListener("contextmenu", d), e.addEventListener("dblclick", f), () => {
		e.removeEventListener("pointerdown", s), e.removeEventListener("pointermove", c), e.removeEventListener("pointerup", l), e.removeEventListener("pointercancel", l), e.removeEventListener("wheel", u), e.removeEventListener("contextmenu", d), e.removeEventListener("dblclick", f);
	};
}
//#endregion
//#region packages/viewer/src/dispose.ts
function ae() {
	let e = /* @__PURE__ */ new Set();
	return {
		get live() {
			return e.size;
		},
		track(t) {
			return e.add(t), t;
		},
		release(t) {
			e.delete(t) && t.dispose();
		},
		releaseAll() {
			for (let t of [...e]) e.delete(t), t.dispose();
		}
	};
}
//#endregion
//#region packages/viewer/src/scene.ts
var K = {
	ambient: .62,
	key: {
		intensity: .85,
		at: [
			60,
			-90,
			140
		]
	},
	fill: {
		intensity: .4,
		at: [
			-90,
			70,
			50
		],
		color: 16769264
	},
	rim: {
		intensity: .35,
		at: [
			0,
			30,
			-120
		]
	}
}, oe = Math.PI, se = .13, ce = .55, q = [1.5, 1.9], le = .6, ue = 4, de = 30, fe = /* @__PURE__ */ new Set([
	"body",
	"structure",
	"backer"
]);
function pe(v) {
	let C = new b(), w = new h(30, 1, 1, 3e3);
	w.up.set(0, 0, 1);
	let T = oe;
	C.add(new e(16777215, K.ambient * T));
	let E = [
		K.key,
		K.fill,
		K.rim
	].map((e) => {
		let t = new a("color" in e ? e.color : 16777215, e.intensity * T);
		return t.position.set(e.at[0], e.at[1], e.at[2]), C.add(t), t;
	})[0], D = new l();
	C.add(D);
	let O = v.track(new _(1, 1)), A = v.track(new p({
		transparent: !0,
		opacity: ce,
		side: o
	})), j = new f(O, A);
	j.position.z = -.05, C.add(j);
	let M = new g(new S(0, 0, -1), 0), N = [], P = [];
	function F() {
		for (let e of N) v.release(e.geom), v.release(e.mat);
		N = [], P.length = 0, D.clear();
	}
	function I(e) {
		let t = v.track(new r());
		return t.setAttribute("position", new n(Float32Array.from(e.positions), 3)), t.setIndex(new n(Uint32Array.from(e.triangles), 1)), t.computeVertexNormals(), t.computeBoundingBox(), t;
	}
	function L(e, t, n) {
		if (F(), A.color.setStyle(n.bed), e === null) {
			j.visible = !1;
			return;
		}
		let r = t.section !== null && !t.plate;
		M.constant = t.section ?? 0;
		let a = r ? [M] : [], l = t.xray && !t.plate, p = (t.explode || t.layers === !0) && !t.plate, h = k(e.part.bodies, e.part.features ?? []), g = t.plate ? null : t.lens ?? null, _ = [...new Set(h.values())].sort(), y = [...new Set(e.part.bodies.map((e) => e.slot))].sort((e, t) => e - t), b = Math.min(...e.part.bodies.map((e) => e.mesh.bbox[0][2])), x = Math.max(...e.part.bodies.map((e) => e.mesh.bbox[1][2])), S = Math.max(4, (x - b) * le), C = new Set(t.focus);
		for (let t of e.part.bodies) {
			let b = e.meshes[t.id];
			if (b === void 0) continue;
			let x = I(b), w = h.get(t.id), T = g === null ? l && fe.has(t.role) : w !== g, E = (l || g !== null) && w !== void 0 ? n.net(_.indexOf(w)) : n.slot(t.slot), O = v.track(new m({
				color: new i().setStyle(E),
				roughness: .6,
				metalness: .05,
				flatShading: !0,
				transparent: T,
				opacity: T ? se : 1,
				depthWrite: !T,
				side: r ? o : c,
				clippingPlanes: a
			})), k = new f(x, O);
			if (k.userData.body = t.id, k.userData.role = t.role, p && (k.position.z = y.indexOf(t.slot) * S), D.add(k), P.push(k), N.push({
				geom: x,
				mat: O
			}), C.has(t.id)) {
				let e = v.track(new s(x, 30)), t = v.track(new u({
					color: new i().setStyle(n.focus),
					depthTest: !1,
					clippingPlanes: a
				})), r = new d(e, t);
				r.renderOrder = 10, r.position.copy(k.position), D.add(r), N.push({
					geom: e,
					mat: t
				});
			}
		}
		let w = R();
		if (j.visible = w !== null, w !== null) {
			let e = w.max.x - w.min.x, t = w.max.y - w.min.y;
			j.scale.set(e * q[0], t * q[1], 1), j.position.set((w.min.x + w.max.x) / 2, (w.min.y + w.max.y) / 2, -.05);
		}
	}
	function R() {
		if (P.length === 0) return null;
		let e = new t();
		for (let t of P) e.expandByObject(t);
		return e;
	}
	let z = new y();
	function B(e, t) {
		z.setFromCamera(new x(e, t), w);
		let n = z.intersectObjects(P, !1)[0]?.object.userData.body;
		return typeof n == "string" ? n : null;
	}
	function V() {
		return P.map((e) => ({
			id: String(e.userData.body),
			role: e.userData.role,
			opacity: e.material.opacity
		}));
	}
	function H() {
		let e = R();
		if (e === null) return null;
		w.updateMatrixWorld();
		let t = [Infinity, Infinity], n = [-Infinity, -Infinity];
		for (let r = 0; r < 8; r += 1) {
			let i = new S(r & 1 ? e.max.x : e.min.x, r & 2 ? e.max.y : e.min.y, r & 4 ? e.max.z : e.min.z).project(w);
			t[0] = Math.min(t[0], i.x), t[1] = Math.min(t[1], i.y), n[0] = Math.max(n[0], i.x), n[1] = Math.max(n[1], i.y);
		}
		return [
			t[0],
			t[1],
			n[0],
			n[1]
		];
	}
	function U(e) {
		let t = e ?? K.key.at;
		return E.position.set(t[0], t[1], t[2]), [
			E.position.x,
			E.position.y,
			E.position.z
		];
	}
	return {
		scene: C,
		camera: w,
		draw: L,
		bounds: R,
		pick: B,
		drawnBodies: V,
		ndcBounds: H,
		keyLight: U,
		dispose() {
			F(), v.release(O), v.release(A);
		}
	};
}
//#endregion
//#region \0@oxc-project+runtime@0.152.0/helpers/esm/checkPrivateRedeclaration.js
function me(e, t) {
	if (t.has(e)) throw TypeError("Cannot initialize the same private elements twice on an object");
}
//#endregion
//#region \0@oxc-project+runtime@0.152.0/helpers/esm/classPrivateMethodInitSpec.js
function he(e, t) {
	me(e, t), t.add(e);
}
//#endregion
//#region \0@oxc-project+runtime@0.152.0/helpers/esm/classPrivateFieldInitSpec.js
function J(e, t, n) {
	me(e, t), t.set(e, n);
}
//#endregion
//#region \0@oxc-project+runtime@0.152.0/helpers/esm/assertClassBrand.js
function Y(e, t, n) {
	if (typeof e == "function" ? e === t : e.has(t)) return arguments.length < 3 ? t : n;
	throw TypeError("Private element is not present on this object");
}
//#endregion
//#region \0@oxc-project+runtime@0.152.0/helpers/esm/classPrivateFieldSet2.js
function X(e, t, n) {
	return e.set(Y(e, t), n), n;
}
//#endregion
//#region \0@oxc-project+runtime@0.152.0/helpers/esm/classPrivateFieldGet2.js
function Z(e, t) {
	return e.get(Y(e, t));
}
//#endregion
//#region packages/viewer/src/hb-viewer.ts
var ge = "hb-viewer", Q = {
	theta: -Math.PI / 2 + .25,
	phi: 1.05,
	distPerExtent: 2.1
}, _e = 2, $ = [
	"--hb-part-b",
	"--hb-part-c",
	"--hb-part-d",
	"--hb-part-e",
	"--hb-part-f"
];
function ve(e, t) {
	let n = t.trim().toUpperCase(), r = (n) => getComputedStyle(e).getPropertyValue(n).trim() || t;
	return n === "#FFFFFF" ? r("--hb-paper") : n === "#1A1A1A" || n === "#000000" ? r("--hb-ink-border") : t;
}
var ye = [
	"explode",
	"layers",
	"xray",
	"plate",
	"paused"
];
function be() {
	if (customElements.get("hb-viewer") !== void 0) return;
	var e = /* @__PURE__ */ new WeakMap(), t = /* @__PURE__ */ new WeakMap(), n = /* @__PURE__ */ new WeakMap(), r = /* @__PURE__ */ new WeakMap(), i = /* @__PURE__ */ new WeakMap(), a = /* @__PURE__ */ new WeakMap(), o = /* @__PURE__ */ new WeakMap(), s = /* @__PURE__ */ new WeakMap(), c = /* @__PURE__ */ new WeakMap(), l = /* @__PURE__ */ new WeakMap(), u = /* @__PURE__ */ new WeakMap(), d = /* @__PURE__ */ new WeakMap(), f = /* @__PURE__ */ new WeakMap(), p = /* @__PURE__ */ new WeakMap(), m = /* @__PURE__ */ new WeakMap(), h = /* @__PURE__ */ new WeakMap(), g = /* @__PURE__ */ new WeakMap(), _ = /* @__PURE__ */ new WeakMap(), y = /* @__PURE__ */ new WeakMap(), b = /* @__PURE__ */ new WeakSet();
	class x extends HTMLElement {
		static get observedAttributes() {
			return [
				"cam",
				"section",
				"focus",
				...ye
			];
		}
		constructor() {
			super(), he(this, b), J(this, e, null), J(this, t, {}), J(this, n, "iso"), J(this, r, !1), J(this, i, {
				explode: !1,
				layers: !1,
				xray: !1,
				section: null,
				plate: !1,
				focus: [],
				lens: null
			}), J(this, a, null), J(this, o, !1), J(this, s, !1), J(this, c, 0), J(this, l, 0), J(this, u, !1), J(this, d, null), J(this, f, {
				theta: A.iso[0],
				phi: A.iso[1],
				dist: 260,
				target: [
					0,
					0,
					6
				]
			}), J(this, p, ae()), J(this, m, void 0), J(this, h, null), J(this, g, null), J(this, _, null), J(this, y, null);
			let v = this.attachShadow({ mode: "open" }), x = document.createElement("style");
			x.textContent = [
				":host{display:block;position:relative;background-color:var(--hb-void);aspect-ratio:16/10;overflow:hidden}",
				"canvas{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0;touch-action:none}",
				".ov{position:absolute;inset:0;z-index:1;pointer-events:none}",
				"::slotted(*){pointer-events:auto}"
			].join(""), X(m, this, document.createElement("canvas"));
			let S = document.createElement("div");
			S.className = "ov", S.append(document.createElement("slot")), v.append(x, Z(m, this), S);
		}
		connectedCallback() {
			if (this.classList.add("hb-graph"), Z(h, this) !== null) return;
			let e = new C({
				canvas: Z(m, this),
				antialias: !0,
				alpha: !0,
				preserveDrawingBuffer: !0
			});
			e.localClippingEnabled = !0, e.setClearColor(0, 0), X(h, this, e), X(g, this, pe(Z(p, this))), Z(g, this).keyLight(Z(a, this)), X(_, this, ie(Z(m, this), Z(f, this), {
				change: () => {
					Y(b, this, T).call(this), this.requestRender();
				},
				pick: (e, t) => Y(b, this, P).call(this, e, t),
				refit: () => this.fit()
			})), X(y, this, new ResizeObserver(() => Y(b, this, M).call(this))), Z(y, this).observe(this), Y(b, this, M).call(this), Y(b, this, j).call(this);
		}
		disconnectedCallback() {
			Z(c, this) !== 0 && cancelAnimationFrame(Z(c, this)), X(c, this, 0), Z(_, this)?.call(this), Z(y, this)?.disconnect(), Z(g, this)?.dispose(), Z(h, this)?.dispose(), X(_, this, null), X(y, this, null), X(g, this, null), X(h, this, null), X(u, this, !1), X(d, this, null);
		}
		attributeChangedCallback(e, t, n) {
			e === "cam" ? n !== null && n in A && (this.cam = n) : e === "section" ? this.section = n === null || n.trim() === "" || !Number.isFinite(Number(n)) ? null : Number(n) : e === "focus" ? this.focusIds = n === null ? [] : n.split(/\s+/).filter((e) => e !== "") : ye.includes(e) && (this[e] = n !== null);
		}
		get model() {
			return Z(e, this);
		}
		set model(t) {
			if (X(e, this, t), Y(b, this, j).call(this), t === null) return;
			let n = Y(b, this, S).call(this);
			(!Z(u, this) || n !== null && Z(d, this) !== null && re(Z(d, this), n)) && this.fit();
		}
		get slots() {
			return Z(t, this);
		}
		set slots(e) {
			X(t, this, { ...e }), Y(b, this, j).call(this);
		}
		get cam() {
			return Z(n, this);
		}
		set cam(e) {
			X(n, this, e), X(r, this, !1), B(Z(f, this), e), Y(b, this, E).call(this, e), this.requestRender();
		}
		get explode() {
			return Z(i, this).explode;
		}
		set explode(e) {
			Y(b, this, D).call(this, { explode: e });
		}
		get layers() {
			return Z(i, this).layers;
		}
		set layers(e) {
			Y(b, this, D).call(this, { layers: e }), this.fit();
		}
		get xray() {
			return Z(i, this).xray;
		}
		set xray(e) {
			Y(b, this, D).call(this, { xray: e });
		}
		get section() {
			return Z(i, this).section;
		}
		set section(e) {
			Y(b, this, D).call(this, { section: e });
		}
		get plate() {
			return Z(i, this).plate;
		}
		set plate(e) {
			Y(b, this, D).call(this, { plate: e }), this.fit();
		}
		get focusIds() {
			return Z(i, this).focus;
		}
		set focusIds(e) {
			Y(b, this, D).call(this, { focus: [...e] });
		}
		get lens() {
			return Z(i, this).lens;
		}
		set lens(e) {
			Y(b, this, D).call(this, { lens: e });
		}
		get light() {
			return Z(a, this);
		}
		set light(e) {
			X(a, this, e === null ? null : [
				e[0],
				e[1],
				e[2]
			]), Z(g, this)?.keyLight(Z(a, this)), this.requestRender();
		}
		get paused() {
			return Z(o, this);
		}
		set paused(e) {
			X(o, this, e), !e && Z(s, this) && this.requestRender();
		}
		get live() {
			return Z(p, this).live;
		}
		get memory() {
			let e = Z(h, this)?.info.memory;
			return {
				geometries: e?.geometries ?? 0,
				textures: e?.textures ?? 0
			};
		}
		get renders() {
			return Z(l, this);
		}
		get revision() {
			return v;
		}
		frame(e, t) {
			G(Z(f, this), e, Y(b, this, w).call(this)), Y(b, this, T).call(this), t !== void 0 && Y(b, this, D).call(this, { section: t }), this.requestRender();
		}
		fit() {
			let e = Y(b, this, S).call(this);
			e !== null && (G(Z(f, this), e, Y(b, this, w).call(this)), X(d, this, e), Z(i, this).plate && (Z(f, this).theta = Q.theta, Z(f, this).phi = Q.phi, Z(f, this).dist = Math.max(Z(f, this).dist, Math.max(e[1][0] - e[0][0], e[1][1] - e[0][1]) * Q.distPerExtent)), X(u, this, !0), this.requestRender());
		}
		viewState() {
			let e = Z(f, this);
			return {
				focus: [...Z(i, this).focus],
				sectionZ: Z(i, this).section,
				cam: {
					name: Z(r, this) ? null : Z(n, this),
					theta: e.theta,
					phi: e.phi,
					dist: e.dist,
					target: [...e.target],
					eye: V(e)
				}
			};
		}
		inspect() {
			let e = Z(g, this), t = this.clientWidth, n = this.clientHeight;
			if (e === null) return {
				bodies: [],
				screen: null,
				width: t,
				height: n
			};
			let [r, i, a] = V(Z(f, this));
			e.camera.position.set(r, i, a), e.camera.lookAt(...Z(f, this).target);
			let o = e.ndcBounds(), s = o === null ? null : [
				(o[0] + 1) / 2 * t,
				(1 - o[3]) / 2 * n,
				(o[2] + 1) / 2 * t,
				(1 - o[1]) / 2 * n
			];
			return {
				bodies: e.drawnBodies(),
				screen: s,
				width: t,
				height: n
			};
		}
		requestRender() {
			if (Z(o, this) || Z(h, this) === null) {
				X(s, this, !0);
				return;
			}
			Z(c, this) === 0 && X(c, this, requestAnimationFrame(() => {
				X(c, this, 0), Y(b, this, N).call(this);
			}));
		}
	}
	function S() {
		let e = Z(g, this)?.bounds() ?? null;
		return e === null ? null : [[
			e.min.x,
			e.min.y,
			e.min.z
		], [
			e.max.x,
			e.max.y,
			e.max.z
		]];
	}
	function w() {
		let e = Z(g, this)?.camera, t = this.clientWidth, n = this.clientHeight;
		return e === void 0 || t <= 0 || n <= 0 ? void 0 : {
			fovDeg: e.fov,
			aspect: t / n
		};
	}
	function T() {
		Z(r, this) || (X(r, this, !0), Y(b, this, E).call(this, null));
	}
	function E(e) {
		this.dispatchEvent(new CustomEvent("camchange", {
			detail: { cam: e },
			bubbles: !0,
			composed: !0
		}));
	}
	function D(e) {
		X(i, this, {
			...Z(i, this),
			...e
		}), Y(b, this, j).call(this);
	}
	function k() {
		let e = getComputedStyle(this), n = (t) => e.getPropertyValue(t).trim();
		return {
			slot: (e) => {
				let r = Z(t, this)[e];
				return r === void 0 ? n($[(e - 1 + $.length) % $.length]) : ve(this, r);
			},
			net: (e) => n($[e % $.length]),
			focus: n("--hb-pink"),
			bed: n("--hb-ink")
		};
	}
	function j() {
		Z(g, this) !== null && (Z(g, this).draw(Z(e, this), Z(i, this), Y(b, this, k).call(this)), this.requestRender());
	}
	function M() {
		let e = Z(h, this);
		if (e === null) return;
		let t = Math.max(1, this.clientWidth), n = Math.max(1, this.clientHeight);
		e.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)), e.setSize(t, n, !1);
		let i = Z(g, this)?.camera;
		i !== void 0 && (i.aspect = t / n, i.updateProjectionMatrix()), Z(u, this) && !Z(r, this) && this.fit(), this.requestRender();
	}
	function N() {
		let e = Z(h, this), t = Z(g, this);
		if (e === null || t === null) return;
		if (Z(o, this)) {
			X(s, this, !0);
			return;
		}
		let [n, r, i] = V(Z(f, this));
		t.camera.position.set(n, r, i), t.camera.lookAt(...Z(f, this).target), e.render(t.scene, t.camera), X(s, this, !1), X(l, this, Z(l, this) + 1);
	}
	function P(t, n) {
		let r = Z(g, this), i = Z(e, this);
		if (r === null || i === null) return;
		let a = Z(m, this).getBoundingClientRect(), o = r.pick((t - a.left) / a.width * 2 - 1, -((n - a.top) / a.height) * 2 + 1);
		if (o === null) return;
		let s = {
			body: o,
			feature: O({
				id: i.part.id,
				bodies: i.part.bodies,
				features: i.part.features ?? []
			}, o)[0] ?? null
		};
		this.dispatchEvent(new CustomEvent("pick", {
			detail: s,
			bubbles: !0,
			composed: !0
		}));
	}
	customElements.define(ge, x);
}
//#endregion
//#region packages/viewer/src/bake-stage.ts
function xe(e) {
	be();
	let t = document.createElement(ge);
	return e.appendChild(t), {
		revision: v,
		viewer: t,
		dispose() {
			t.remove();
		}
	};
}
//#endregion
export { q as BED_MARGIN, ce as BED_OPACITY, A as CAMS, j as CAM_NAMES, I as DIST_RANGE, le as EXPLODE_FRACTION, ue as EXPLODE_MIN_MM, L as FIT_FACTOR, te as FIT_MARGIN, ge as HB_VIEWER_TAG, oe as LEGACY_LIGHT_SCALE, K as LIGHTS, _e as MAX_PIXEL_RATIO, M as ORBIT_RAD_PER_PX, de as OUTLINE_DEG, P as PAN_PER_PX, N as PHI_LIMIT, R as PICK_SLOP_PX, Q as PLATE_CAM, ne as REFIT_FRACTION, F as WHEEL_STEP, se as XRAY_GHOST, ie as bindControls, D as bodiesOfFeature, k as bodyNets, re as boundsMoved, ae as createOwner, pe as createStageScene, be as defineHbViewer, V as eye, O as featuresOfBody, G as fit, xe as mountBakeStage, W as pan, H as rotate, B as setCam, U as zoom };
