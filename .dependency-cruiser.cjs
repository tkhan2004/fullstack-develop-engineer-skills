/** Enforces the package dependency direction from docs/03-plan/repository-structure.md */
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    {
      name: "core-depends-on-nothing-internal",
      severity: "error",
      from: { path: "^packages/core/src" },
      to: { path: "^(packages/(?!core)|apps/)" },
    },
    {
      // Adapters know only the canonical output. One that reads config, the profile or the skill
      // engine would couple the core to a specific AI tool's needs.
      name: "adapters-know-only-the-canonical-output",
      severity: "error",
      from: { path: "^packages/adapters/src" },
      to: { path: "^packages/(?!adapters|core)" },
    },
    {
      name: "packages-do-not-import-apps",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
  ],
  options: { tsConfig: { fileName: "tsconfig.base.json" }, doNotFollow: { path: "node_modules" } },
};
