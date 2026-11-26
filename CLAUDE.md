# CLAUDE.md

@AGENTS.md

## Claude Code specifics

- Reviewer and release agents live in `.claude/agents/`: `claims-auditor`, `security-reviewer` and
  `test-auditor` for independent review, and `devops-engineer` for opening pull requests.
- `/raise-pr` (`.claude/commands/raise-pr.md`) runs slice-loop steps 4 and 5: independent review, the PR
  through the devops-engineer agent, then a `/code-review` pass on the PR with real bugs fixed.
- Whenever I ask to raise, open or create a pull request, follow `.claude/commands/raise-pr.md`, even if I
  don't type `/raise-pr`.
- Built-in PR commands only I can start (never invoke them yourself; remind me when they fit):
  - `/ship` commits, pushes, opens a PR, reviews it, then watches it until it is merged or closed. Prefer
    `/raise-pr` for slices, since `/ship` does not fill the evidence table or run the three reviewers.
  - `/steward` watches an open PR and fixes CI failures, conflicts and review comments.
