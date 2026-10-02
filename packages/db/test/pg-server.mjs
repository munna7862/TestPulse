// Child process that owns a throwaway embedded PostgreSQL 16 for the test run.
//
// Why a separate process: embedded-postgres registers `async-exit-hook`, which calls process.exit(0)
// on shutdown. Loaded inside the Vitest process it would overwrite a failing exit code with 0 and turn
// red test runs green. Isolated here, it cannot touch the test runner's exit code.
//
// Protocol: prints `READY <adminUrl>` on stdout once started; stops when stdin receives "stop" or closes.
import os from "node:os";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const port = Number(process.argv[2]);
if (!Number.isInteger(port) || port <= 0) {
  console.error("usage: pg-server.mjs <port>");
  process.exit(2);
}

const pg = new EmbeddedPostgres({
  databaseDir: path.join(os.tmpdir(), `testpulse-pg-${process.pid}-${Date.now()}`),
  port,
  user: "postgres",
  password: "postgres",
  persistent: false,
  onLog: () => undefined,
});

let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  try {
    await pg.stop();
  } finally {
    process.exit(0);
  }
}

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  if (String(chunk).includes("stop")) void stop();
});
process.stdin.on("end", () => void stop());

await pg.initialise();
await pg.start();
process.stdout.write(`READY postgresql://postgres:postgres@127.0.0.1:${port}/postgres\n`);
