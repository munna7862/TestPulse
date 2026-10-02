/**
 * Docker-free local PostgreSQL 16 for development (`npm run db:start` from the repo root).
 * Runs the embedded-postgres binaries in the foreground with data in `<repo>/.pg-dev` (git-ignored).
 * Stop with Ctrl+C. Connection: postgresql://postgres:postgres@localhost:<port>/testpulse
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";

const port = Number(process.env.PG_LOCAL_PORT ?? 5433);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const databaseDir = path.join(repoRoot, ".pg-dev");

const pg = new EmbeddedPostgres({
  databaseDir,
  port,
  user: "postgres",
  password: "postgres",
  persistent: true,
  onLog: () => undefined,
});

if (!existsSync(path.join(databaseDir, "PG_VERSION"))) {
  console.info(`Initialising a new PostgreSQL cluster in ${databaseDir} ...`);
  await pg.initialise();
}
await pg.start();
try {
  await pg.createDatabase("testpulse");
} catch {
  // Database already exists.
}

console.info(
  `PostgreSQL 16 is running.\n  DATABASE_URL=postgresql://postgres:postgres@localhost:${port}/testpulse\n  Press Ctrl+C to stop.`,
);

let stopping = false;
async function stop(): Promise<void> {
  if (stopping) return;
  stopping = true;
  await pg.stop();
  process.exit(0);
}
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
