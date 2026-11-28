# TestPulse delivery roadmap

The [master plan](master/TestPulse_Master_Plan.md) defines the contracts. The Phase 04–11 sprint notes remain references for scope and traceability. [Approved slice briefs](slices/) guide implementation in the order below. Each implementation slice aims for one reviewable PR within the 800-product-line budget.

## Now · M1 first live run locally

**Milestone outcome.** A developer signs up, verifies their account, creates an organization and project, and generates a project API key. They run the example Playwright suite with the reporter and see results appear in the browser before the suite finishes. The browser then shows the final status. Record the elapsed time against the existing ten-minute golden-path target. Verify the path with a real runner, API, PostgreSQL, Redis, and browser. [SC-E2E-001](../docs/testing/scenario-catalog.md#e2e--critical-journeys)

1. **Run storage.** [S-010](slices/S-010-tenant-scoped-run-storage.md) adds the `TestRun` model, project-scoped identity and indexes, and migration and tenant-isolation evidence. PostgreSQL is sufficient for this slice.
2. **Test identity and result storage.** Add `TestSuite`, `TestCase`, and `TestResult` with project-safe relationships and the canonical fingerprint rules. Prove that one test keeps its identity across Windows and Linux and that runner projects remain distinct. Split migration and fingerprint work into separate slices if needed.
3. **Ingestion lifecycle.** Plan separate slices for run start, result batches, and shard completion. Reuse project API-key authentication, enforce quota on run creation, and verify retries and shard consistency. Schedule the event schemas and `RealtimePublisher` ahead of the first route that emits. Publish the canonical events after commit. [Ingestion contract](../docs/api/ingestion.md) · [Event contract](../docs/api/realtime-events.md)
4. **Reporter and live view.** Connect a workspace Playwright reporter to the ingestion lifecycle and add the minimal run-detail read and live view. Prove that a project member can subscribe with a short-lived ticket, see committed progress, and refetch on reconnect. Reporter and browser work can proceed in separate worktrees once their API and event contracts are stable. [Phase 05 reference](phases/05-phase-real-time-dashboard.md)

Use the [Docker-free local setup](../docs/database/local-setup.md) and the local mail transport for account verification. Configure a reachable Redis instance for the real-time proof. Run tests and independent review per slice, with Chromium and axe when journeys change. Carry the release checks into each slice and run the milestone journey on the integrated build. [Delivery playbook](../docs/process/ai-delivery-playbook.html)

## Next · Hosted reproduction

Once the local journey passes, configure staging and run the same synthetic example through the deployed app. Use the deploy workflow to verify the deployed commit and the staging smoke check. Exercise the verified Vercel client-address handoff with matching credentials as part of hosted validation. [Staging runbook](../docs/ops/free-tier-deployment.md) · [Proxy design](../docs/architecture/adr-008-verified-web-proxy.md)

## Later

Extend runner coverage to Vitest, validate ingestion throughput and retention on realistic data, then continue with flaky-test triage, quarantine, notifications, analytics, and release readiness. Keep the roadmap ordered by user outcomes and use the [implementation roadmap](master/TestPulse_Master_Plan.md#9-implementation-roadmap-11-phases-60-sprints) for the remaining scope.
