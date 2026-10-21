// The stage scene for `<hb-viewer>`: Part IR bodies on the void with the
// modes of the bench skeleton. No DOM here; the element in hb-viewer.ts owns
// the canvas, the renderer and the controls, and this file builds what they
// draw. Ported from PIP bench/part3.js lines 9 to 21 (lights, bed, clip
// plane) and 210 to 233 (`VIEW.update`: xray ghosts the shell at 0.13 and
// draws the nets in colour, section clips with double sided faces, plate
// drops explode and xray) and TENON src/part3.js lines 191 to 197 (explode
// as a fixed step per gap in a declared order). Two departures, both from
// M09-T06: the section plane is horizontal at a z the caller names (a
// located finding carries one), and focus outlines the named bodies. Two
// more from R1-engine-15: a lens lights one net and ghosts every other
// body (view.netlens), and the key light moves (view.light).
//
// Every geometry and material is created through one Owner and freed when
// the part is replaced or a mode changes (D-055).

import {
  AmbientLight, Box3, BufferAttribute, BufferGeometry, Color, DirectionalLight, DoubleSide, EdgesGeometry, FrontSide,
  Group, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, Plane,
  PlaneGeometry, Raycaster, Scene, Vector2, Vector3, type Object3D,
} from "three";
import type { Body, Part } from "@hackbuild/spec";
import type { Owner } from "./dispose.js";
import { bodyNets } from "../widgets/netlens.js";

/** A body's mesh as the build hands it over: xyz triples and triangle indices. */
export interface ViewMesh {
  readonly positions: ArrayLike<number>;
  readonly triangles: ArrayLike<number>;
}

/** Part IR with its meshes resolved by body id. */
export interface ViewPart {
  readonly part: Pick<Part, "id" | "bodies"> & { readonly features?: Part["features"] };
  readonly meshes: Readonly<Record<string, ViewMesh>>;
}

export interface ViewModes {
  readonly explode: boolean;
  /** The layer stack lifted apart by slot (UI.md 12.1 `layers`); absent is off. */
  readonly layers?: boolean;
  readonly xray: boolean;
  /** Section plane height, mm; null shows the whole part. */
  readonly section: number | null;
  readonly plate: boolean;
  /** Ids to outline; ids that name no body are ignored here. */
  readonly focus: readonly string[];
  /** The one net lit in colour, every other body ghosted (view.netlens); absent or null is off. */
  readonly lens?: string | null;
}

/** CSS colours the element resolves from tokens and slot colours. */
export interface Palette {
  /** Display colour of a filament slot. */
  slot(slot: number): string;
  /** Colour of the n-th net in xray, n from 0. */
  net(n: number): string;
  /** Outline of a focused body. */
  readonly focus: string;
  /** The bed under the part. */
  readonly bed: string;
}

/** PIP part3.js lines 14 to 17: ambient, key, fill and rim intensity and position. */
export const LIGHTS = {
  ambient: 0.62,
  key: { intensity: 0.85, at: [60, -90, 140] },
  fill: { intensity: 0.4, at: [-90, 70, 50], color: 0xffe0f0 },
  rim: { intensity: 0.35, at: [0, 30, -120] },
} as const;
/**
 * PIP ran on three 0.128 with legacy lights; three 0.155 dropped them and a
 * light of the same number reads about pi times darker (three r155 migration
 * notes). Scaling by pi keeps PIP's brightly lit stage (GUIDELINES 6).
 */
export const LEGACY_LIGHT_SCALE = Math.PI;
/** xray ghost opacity of the shell (PIP part3.js line 213). */
export const XRAY_GHOST = 0.13;
/** Bed opacity (PIP part3.js line 19). */
export const BED_OPACITY = 0.55;
/** Bed size as a multiple of the part footprint, x then y (PIP part3.js line 229). */
export const BED_MARGIN: readonly [number, number] = [1.5, 1.9];
/**
 * Explode step per slot gap as a fraction of the part height, with a 4 mm
 * floor (inferred: TENON steps 45 mm along a 300 mm club; a flat pad needs
 * a step on its own height scale).
 */
export const EXPLODE_FRACTION = 0.6;
export const EXPLODE_MIN_MM = 4;
/** Edge angle for focus outlines, degrees (inferred). */
export const OUTLINE_DEG = 30;

/** Roles drawn as ghosts in xray: the shell around the conductors. */
const SHELL_ROLES: ReadonlySet<Body["role"]> = new Set(["body", "structure", "backer"]);

export interface DrawnBody {
  readonly id: string;
  readonly role: Body["role"];
  readonly opacity: number;
}

export interface StageScene {
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  /** Rebuilds the drawn objects for a part and modes; frees what the last draw made. */
  draw(view: ViewPart | null, modes: ViewModes, palette: Palette): void;
  /** Bounds of what is drawn, or null when nothing is. */
  bounds(): Box3 | null;
  /** Body id under a normalised device point, or null. */
  pick(ndcX: number, ndcY: number): string | null;
  /** What is drawn, per body: role and material opacity (gold G-16). */
  drawnBodies(): readonly DrawnBody[];
  /** Bounds of what is drawn in normalised device coordinates for the current camera, or null (gold G-15). */
  ndcBounds(): readonly [number, number, number, number] | null;
  /** Moves the key light to a position, mm (view.light); null puts it back at LIGHTS.key.at. Returns where it is. */
  keyLight(at: readonly [number, number, number] | null): [number, number, number];
  /** Frees every object the scene still holds. */
  dispose(): void;
}

export function createStageScene(owner: Owner): StageScene {
  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 1, 3000);
  camera.up.set(0, 0, 1);
  const s = LEGACY_LIGHT_SCALE;
  scene.add(new AmbientLight(0xffffff, LIGHTS.ambient * s));
  const lights = [LIGHTS.key, LIGHTS.fill, LIGHTS.rim].map((l) => {
    const d = new DirectionalLight("color" in l ? l.color : 0xffffff, l.intensity * s);
    d.position.set(l.at[0], l.at[1], l.at[2]);
    scene.add(d);
    return d;
  });
  const key = lights[0]!;
  const group = new Group();
  scene.add(group);
  const bedGeom = owner.track(new PlaneGeometry(1, 1));
  const bedMat = owner.track(new MeshBasicMaterial({ transparent: true, opacity: BED_OPACITY, side: DoubleSide }));
  const bed = new Mesh(bedGeom, bedMat);
  bed.position.z = -0.05;
  scene.add(bed);
  const clip = new Plane(new Vector3(0, 0, -1), 0);
  let drawn: { geom: BufferGeometry; mat: { dispose(): void } }[] = [];
  const meshes: Mesh[] = [];

  function clear(): void {
    for (const d of drawn) {
      owner.release(d.geom);
      owner.release(d.mat);
    }
    drawn = [];
    meshes.length = 0;
    group.clear();
  }

  function geometryOf(m: ViewMesh): BufferGeometry {
    const g = owner.track(new BufferGeometry());
    g.setAttribute("position", new BufferAttribute(Float32Array.from(m.positions), 3));
    g.setIndex(new BufferAttribute(Uint32Array.from(m.triangles), 1));
    g.computeVertexNormals();
    g.computeBoundingBox();
    return g;
  }

  function draw(view: ViewPart | null, modes: ViewModes, palette: Palette): void {
    clear();
    bedMat.color.setStyle(palette.bed);
    if (view === null) {
      bed.visible = false;
      return;
    }
    const clipOn = modes.section !== null && !modes.plate;
    clip.constant = modes.section ?? 0;
    const planes = clipOn ? [clip] : [];
    const xray = modes.xray && !modes.plate;
    // Bodies lift by slot for both: this explode moves each slot up, which is the layer stack's LIFT.
    const explode = (modes.explode || modes.layers === true) && !modes.plate;
    const nets = bodyNets(view.part.bodies, view.part.features ?? []);
    const lens = modes.plate ? null : (modes.lens ?? null);
    const netOrder = [...new Set(nets.values())].sort();
    const slots = [...new Set(view.part.bodies.map((b) => b.slot))].sort((a, b) => a - b);
    const zLo = Math.min(...view.part.bodies.map((b) => b.mesh.bbox[0][2]));
    const zHi = Math.max(...view.part.bodies.map((b) => b.mesh.bbox[1][2]));
    const step = Math.max(EXPLODE_MIN_MM, (zHi - zLo) * EXPLODE_FRACTION);
    const focus = new Set(modes.focus);

    for (const b of view.part.bodies) {
      const m = view.meshes[b.id];
      if (m === undefined) continue;
      const geom = geometryOf(m);
      const net = nets.get(b.id);
      const ghost = lens !== null ? net !== lens : xray && SHELL_ROLES.has(b.role);
      const colour = (xray || lens !== null) && net !== undefined ? palette.net(netOrder.indexOf(net)) : palette.slot(b.slot);
      const mat = owner.track(new MeshStandardMaterial({
        color: new Color().setStyle(colour), roughness: 0.6, metalness: 0.05, flatShading: true,
        transparent: ghost, opacity: ghost ? XRAY_GHOST : 1, depthWrite: !ghost,
        side: clipOn ? DoubleSide : FrontSide, clippingPlanes: planes,
      }));
      const mesh = new Mesh(geom, mat);
      mesh.userData["body"] = b.id;
      mesh.userData["role"] = b.role;
      if (explode) mesh.position.z = slots.indexOf(b.slot) * step;
      group.add(mesh);
      meshes.push(mesh);
      drawn.push({ geom, mat });
      if (focus.has(b.id)) {
        const edges = owner.track(new EdgesGeometry(geom, OUTLINE_DEG));
        const line = owner.track(new LineBasicMaterial({ color: new Color().setStyle(palette.focus), depthTest: false, clippingPlanes: planes }));
        const seg = new LineSegments(edges, line);
        seg.renderOrder = 10;
        seg.position.copy(mesh.position);
        group.add(seg);
        drawn.push({ geom: edges, mat: line });
      }
    }
    const box = bounds();
    bed.visible = box !== null;
    if (box !== null) {
      const w = box.max.x - box.min.x;
      const d = box.max.y - box.min.y;
      bed.scale.set(w * BED_MARGIN[0], d * BED_MARGIN[1], 1);
      bed.position.set((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, -0.05);
    }
  }

  function bounds(): Box3 | null {
    if (meshes.length === 0) return null;
    const box = new Box3();
    for (const m of meshes) box.expandByObject(m as Object3D);
    return box;
  }

  const ray = new Raycaster();
  function pick(ndcX: number, ndcY: number): string | null {
    ray.setFromCamera(new Vector2(ndcX, ndcY), camera);
    const hit = ray.intersectObjects(meshes, false)[0];
    const body = hit?.object.userData["body"];
    return typeof body === "string" ? body : null;
  }

  function drawnBodies(): DrawnBody[] {
    return meshes.map((m) => ({ id: String(m.userData["body"]), role: m.userData["role"] as Body["role"], opacity: (m.material as MeshStandardMaterial).opacity }));
  }

  function ndcBounds(): [number, number, number, number] | null {
    const box = bounds();
    if (box === null) return null;
    camera.updateMatrixWorld();
    const lo = [Infinity, Infinity];
    const hi = [-Infinity, -Infinity];
    for (let i = 0; i < 8; i += 1) {
      const v = new Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera);
      lo[0] = Math.min(lo[0] as number, v.x);
      lo[1] = Math.min(lo[1] as number, v.y);
      hi[0] = Math.max(hi[0] as number, v.x);
      hi[1] = Math.max(hi[1] as number, v.y);
    }
    return [lo[0] as number, lo[1] as number, hi[0] as number, hi[1] as number];
  }

  function keyLight(at: readonly [number, number, number] | null): [number, number, number] {
    const p = at ?? LIGHTS.key.at;
    key.position.set(p[0], p[1], p[2]);
    return [key.position.x, key.position.y, key.position.z];
  }

  return {
    scene,
    camera,
    draw,
    bounds,
    pick,
    drawnBodies,
    ndcBounds,
    keyLight,
    dispose() {
      clear();
      owner.release(bedGeom);
      owner.release(bedMat);
    },
  };
}
