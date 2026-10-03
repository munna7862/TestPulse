// Claude Code Stop hook: do not let the agent finish a turn with lint or type errors in changed code.
// Blocks once per turn; CI on the protected main branch stays the final gate.
import { execSync } from "node:child_process";

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
const { stop_hook_active: retried } = JSON.parse(raw || "{}");

const changed = execSync("git status --porcelain", { encoding: "utf8" })
  .split("\n")
  .some((line) => /\.(ts|tsx|mjs|prisma)$/.test(line.trim()));
if (!changed || retried) process.exit(0);

for (const command of ["npm run lint", "npm run typecheck"]) {
  try {
    execSync(command, { stdio: "pipe", encoding: "utf8" });
  } catch (error) {
    const output = error && typeof error === "object" && "stdout" in error ? String(error.stdout) : String(error);
    process.stderr.write(`${command} failed. Fix it before you finish:\n${output.slice(-4000)}`);
    process.exit(2);
  }
}
