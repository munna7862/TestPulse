Raise a pull request for the current slice. Extra notes for the PR, if any: $ARGUMENTS

1. **Find the slice.** Read `planning/NOW.md` and the slice brief in `planning/slices/`. The git range is
   `origin/main...HEAD` plus any uncommitted changes. If it is unclear which slice this is, ask.
2. **Independent review.** In fresh contexts, run the `claims-auditor` and `test-auditor` agents, and the
   `security-reviewer` agent when the diff touches auth, sessions, tenancy, API keys, ingestion, webhooks or
   logging. Fix only findings that come with proof, then run `npm run verify` again. Any blocker you cannot
   fix stops here: list it and wait for me.
3. **Open the PR.** Use the `devops-engineer` agent to branch, check size, verify, commit, push and open the
   PR. Pass it the slice brief path, the reviewer results (findings, fixed, deferred) and my notes above.
4. **Code review.** Run the `/code-review` skill at `high` on the new PR number. Fix the findings that are
   real bugs, run `npm run verify` again, push to the same branch, and add a `/code-review` row to the PR's
   Independent review table. List any finding you chose not to fix, with the reason.
5. **Hand over.** Give me the PR link, the verify summary and what the reviews changed. Then remind me that
   I can type `/steward` to have Claude watch this PR's CI, conflicts and comments until it is merged or
   closed. You cannot start `/steward` or `/ship` yourself; only I can type them.

Never merge the PR and never tick items in `task.md`. I merge after reading the evidence.
