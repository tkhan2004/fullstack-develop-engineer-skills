import { defineConfig } from "tsup";

export default defineConfig({
  entry: { cli: "src/bin.ts" },
  format: ["esm"],
  target: "node20",
  platform: "node",
  clean: true,
  banner: { js: "#!/usr/bin/env node" },
  // Single self-contained file so `npx @engineering-skills/cli` needs no workspace packages.
  noExternal: [/.*/],
});
