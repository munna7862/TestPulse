import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts", "src/worker-main.ts"],
  format: ["esm"],
  platform: "node",
  target: "node24",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  splitting: false,
  // Internal workspace packages are consumed as TypeScript source ("just-in-time" packages),
  // so they must be bundled into the API build output.
  noExternal: [/^@testpulse\//],
  // Everything else (including packages that only workspace packages depend on, e.g. pg and Prisma via
  // @testpulse/db) stays external and is resolved from node_modules at runtime. Bundling those CJS
  // packages into ESM output breaks on `require`.
  external: [/^(?!@testpulse\/)(@[^/]+\/)?[a-z0-9][^/]*/],
});
