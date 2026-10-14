// The M00-T06 sweep config. sweep.property.ts sits outside the *.test.ts
// include of the root config and of the workspace default, so `npm test`
// never runs it; `npm run sweep` selects it here. silent false keeps the
// summary line: vitest 5.0.3 drops console output of passing tests otherwise.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["test/**/*.property.ts"], silent: false },
});
