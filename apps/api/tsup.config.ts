import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts", "src/worker.ts"],
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
});
