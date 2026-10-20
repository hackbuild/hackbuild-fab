// Log builders for tools/test/agent-hooks-quiet.test.mjs. The shapes follow
// what vitest (default reporter, no TTY), tsc -b (no pretty) and a vite
// build print. The vitest shape was compared against a vitest 5.0.3 run
// with one failing test (measured, 2026-10-20, not committed: its footer
// carries a dash the voice lint blocks); the tsc and vite shapes are
// inferred. The glyphs are built from code points so this file passes the
// voice lint.
// The line counts are the brief's: a vitest log of 800 lines with 2
// failures, a tsc log with 40 errors, a 90 line passing log and a 200 line
// log with no known marker.

const CHECK = String.fromCodePoint(0x2713);
const CROSS = String.fromCodePoint(0x00d7);
const CHEVRON = String.fromCodePoint(0x276f);
const ARROW = String.fromCodePoint(0x2192);
const RULE = String.fromCodePoint(0x23af).repeat(20);
const BAR = String.fromCodePoint(0x2502);

const passLine = (i) => ` ${CHECK} packages/p${i % 29}/test/case-${i}.test.ts (${(i % 7) + 1} tests) ${(i * 13) % 97}ms`;

/** The two failing tests the vitest log carries, by full name. */
export const FAILING = [
  { file: "packages/geom/test/fillet.test.ts", name: "fillet > keeps the radius at the seam", got: "0.4", want: "0.5", line: 42 },
  { file: "packages/mesh/test/weld.test.ts", name: "weld > closes the shell after the pinch", got: "false", want: "true", line: 117 },
];

const frame = (f) => {
  const out = [];
  for (let k = f.line - 5; k <= f.line + 4; k++) out.push(`    ${String(k).padStart(4)}|   const v${k} = step(${k});`);
  out.splice(6, 0, `       |                   ^`);
  return out;
};

const failDetail = (f) => [
  ` FAIL  ${f.file} > ${f.name}`,
  `AssertionError: expected ${f.got} to be ${f.want} // Object.is equality`,
  "",
  "- Expected",
  "+ Received",
  "",
  `- ${f.want}`,
  `+ ${f.got}`,
  "",
  ` ${CHEVRON} ${f.file}:${f.line}:18`,
  ...frame(f),
  "",
  `${RULE}[${FAILING.indexOf(f) + 1}/${FAILING.length}]${RULE}`,
  "",
];

const SUMMARY_PASS = (files, tests) => [
  "",
  ` Test Files  ${files} passed (${files})`,
  `      Tests  ${tests} passed (${tests})`,
  "   Start at  01:48:23",
  "   Duration  42.10s (transform 3.20s, setup 0ms, collect 9.80s, tests 28.40s, environment 2ms, prepare 1.10s)",
  "",
];

/** A vitest run of `total` lines with the two FAILING tests, ending in its summary. */
export function vitestLog(total = 800) {
  const head = ["", " RUN  v4.0.8 /repo", ""];
  const marks = FAILING.flatMap((f) => [
    ` ${CHEVRON} ${f.file} (6 tests | 1 failed) 40ms`,
    `   ${CHECK} ${f.name.split(" > ")[0]} > builds 3ms`,
    `   ${CROSS} ${f.name} 12ms`,
    `     ${ARROW} expected ${f.got} to be ${f.want} // Object.is equality`,
  ]);
  const detail = ["", `${RULE} Failed Tests ${FAILING.length} ${RULE}`, "", ...FAILING.flatMap(failDetail)];
  const tail = [
    "",
    ` Test Files  2 failed | 118 passed (120)`,
    `      Tests  2 failed | 640 passed (642)`,
    "   Start at  01:48:23",
    "   Duration  42.10s (transform 3.20s, setup 0ms, collect 9.80s, tests 28.40s, environment 2ms, prepare 1.10s)",
    "",
  ];
  const fill = total - head.length - marks.length - detail.length - tail.length;
  if (fill < 20) throw new Error(`vitestLog needs at least ${total - fill + 20} lines`);
  const third = Math.floor(fill / 3);
  const body = [];
  for (let i = 0; i < fill; i++) {
    if (i === third) body.push(...marks.slice(0, 4));
    if (i === 2 * third) body.push(...marks.slice(4));
    body.push(passLine(i));
  }
  return [...head, ...body, ...detail, ...tail].join("\n") + "\n";
}

/** A passing vitest run of `total` lines. */
export function passingLog(total = 90) {
  const head = ["", " RUN  v4.0.8 /repo", ""];
  const tail = SUMMARY_PASS(30, 212);
  const body = [];
  for (let i = 0; i < total - head.length - tail.length; i++) body.push(passLine(i));
  return [...head, ...body, ...tail].join("\n") + "\n";
}

/** tsc -b without pretty output: `count` errors, each with three elaboration lines. */
export function tscLog(count = 40) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(`packages/ui/src/panel${i % 8}.ts(${10 + i},${5 + (i % 9)}): error TS2322: Type 'string | undefined' is not assignable to type 'string'.`);
    out.push(`  Type 'undefined' is not assignable to type 'string'.`);
    out.push(`    The expected type comes from property 'note' which is declared here on type 'RailField'`);
    out.push(`    packages/ui-core/src/rail.ts(${20 + i},3): 'note' is declared here.`);
  }
  out.push(`Found ${count} errors in 8 files.`);
  return out.join("\n") + "\n";
}

/** A vite build log of `total` lines with no failure marker and no summary line. */
export function unknownLog(total = 200) {
  const out = ["vite v6.3.5 building for production...", "transforming..."];
  for (let i = 0; out.length < total - 1; i++) out.push(`dist/assets/chunk-${i}.js  ${(i * 3.7).toFixed(2)} kB ${BAR} gzip: ${(i * 1.1).toFixed(2)} kB`);
  out.push("built in 4.21s");
  return out.join("\n") + "\n";
}
