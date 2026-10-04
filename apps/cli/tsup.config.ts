import { cpSync } from "node:fs";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: { cli: "src/bin.ts" },
  format: ["esm"],
  target: "node20",
  platform: "node",
  clean: true,
  // Bundled CommonJS dependencies (yaml) call require(); give the ESM bundle one.
  banner: {
    js: '#!/usr/bin/env node\nimport { createRequire as __createRequire } from "node:module";\nconst require = __createRequire(import.meta.url);',
  },
  // Single self-contained file so `npx @engineering-skills/cli` needs no workspace packages.
  noExternal: [/.*/],
  // Framework data (architectures, presets, skills) ships next to the bundle.
  onSuccess: async () => {
    for (const dir of ["architectures", "presets", "skills"])
      cpSync(`../../${dir}`, `dist/data/${dir}`, { recursive: true });
  },
});
