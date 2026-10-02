# Phase 08 — Analytics & Reporting

← [Phase 07](./07-phase-notifications-integrations.md) | [Phase 09 →](./09-phase-ux-polish-accessibility.md)

## Objective

Transform raw test data into actionable insights. Build charts, trend lines, and metrics that help teams understand their test health trajectory.

## Outcome

Project dashboards display pass rate trends, MTTR for flaky tests, top failing tests, and other key metrics — enabling data-driven quality decisions.

## Scope

- Pass rate trend chart (daily/weekly/monthly)
- Test duration trend chart
- Top 10 most failing tests (configurable time range)
- Top 10 slowest tests
- Flaky test leaderboard (most unstable tests)
- Mean Time to Resolution (MTTR) for quarantined tests
- Run frequency chart (runs per day/week)
- Branch comparison view
- CSV/JSON data export
- Materialized views / pre-computed aggregations for performance

## Architecture

```text
Raw Data (RunResults)
        |
        v
Background Aggregation Jobs (BullMQ)
        |
        v
Materialized Metrics (daily_pass_rates, test_stability_scores, etc.)
        |
        v
Analytics API Endpoints
        |
        v
Dashboard Charts (Recharts/Nivo)
```

## Testing

- Unit tests for aggregation logic
- Integration tests for metrics API endpoints
- Visual regression tests for chart rendering
- Performance tests for aggregation queries on large datasets

## Acceptance Criteria

- [ ] Pass rate trend chart renders correctly with real data.
- [ ] Top failing/slowest tests are accurately computed.
- [ ] MTTR metric is calculated for quarantined tests.
- [ ] Charts are responsive and interactive (tooltips, zoom).
- [ ] Data export works for CSV and JSON formats.
- [ ] Aggregation queries perform well on 100K+ results.

## Exit Criteria

A project dashboard tells the story: "Our test health improved from 82% to 97% pass rate over 30 days, and our average flaky test resolution time dropped from 12 days to 4."

## Sprint Decomposition

- P08-S01: Aggregation pipeline and materialized metrics
- P08-S02: Pass rate and duration trend charts
- P08-S03: Top failing, slowest, and flakiest test views
- P08-S04: MTTR metrics, branch comparison, and data export
