// @hackbuild/inlay, tier 1. Contracts live in spec. No DOM, no canvas, no
// ImageData constructor here (D-045): text, images and SVG arrive through
// the Surface interface that M03-T04 defines.

export * from "./intake/index.js";
export * from "./surface.js";
export * from "./quantize.js";
export * from "./otsu.js";
export * from "./layers/text.js";
export * from "./layers/ring.js";
export * from "./layers/image.js";
export * from "./layers/shape.js";
export * from "./layers/path.js";
export * from "./layers/sprue.js";
export * from "./layers/shapes.js";
export * from "./layers/scope.js";
export * from "./layers/circuit.js";
export * from "./layers/logo.js";
export * from "./marks.js";
export * from "./art-lower.js";
export * from "./face.js";
export * from "./hygiene/box.js";
export * from "./hygiene/disc.js";
export * from "./hygiene/despeckle.js";
export * from "./hygiene/recipes.js";
export * from "./hygiene/thin.js";
export * from "./mirror.js";
export * from "./split.js";
export * from "./opacity.js";
export * from "./kind.js";
export * from "./checks/inl-01.js";
export * from "./checks/inl-02.js";
export * from "./checks/inl-03.js";
export * from "./checks/inl-04.js";
