// Claude Code PreToolUse hook: committed acceptance tests are the approved spec, so block edits to them.
// New, uncommitted *.acceptance.test.ts files are allowed (that is the "tests first" step).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
const file = JSON.parse(raw || "{}").tool_input?.file_path ?? "";
if (!/\.acceptance\.test\.tsx?$/.test(file)) process.exit(0);

try {
  execFileSync("git", ["ls-files", "--error-unmatch", file], { stdio: "ignore" });
} catch {
  process.exit(0);
}
// The user can approve a spec change by listing the file in planning/approved-spec-changes.md (visible in the PR).
const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const approvals = join(root, "planning", "approved-spec-changes.md");
const rel = relative(root, file).replaceAll("\\", "/");
if (existsSync(approvals) && readFileSync(approvals, "utf8").includes(`| ${rel} |`)) process.exit(0);

process.stderr.write(
  "Blocked: this acceptance test is part of the approved spec. Do not change it to make code pass. " +
    "If the spec is wrong, stop and ask the user, then record the approval in planning/approved-spec-changes.md.\n",
);
process.exit(2);
