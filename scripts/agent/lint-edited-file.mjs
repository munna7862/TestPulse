// Claude Code PostToolUse hook: lint the file the agent just edited and send problems straight back to it.
import { ESLint } from "eslint";

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
const file = JSON.parse(raw || "{}").tool_input?.file_path ?? "";
const skipped = ["generated", "node_modules", "dist", ".next"];
const parts = file.replaceAll("\\", "/").split("/");
if (!/\.(ts|tsx|mjs)$/.test(file) || parts.some((part) => skipped.includes(part))) process.exit(0);

const eslint = new ESLint({ cwd: process.env.CLAUDE_PROJECT_DIR ?? process.cwd(), warnIgnored: false });
const results = await eslint.lintFiles([file]);
if (results.some((r) => r.errorCount > 0 || r.warningCount > 0)) {
  const formatter = await eslint.loadFormatter("stylish");
  process.stderr.write(await formatter.format(results));
  process.exit(2);
}
