# S-<NNN>: <outcome in user terms>

Milestone: <M1 First live run> · Appetite: 1 session · Risk: <low | medium | high (why)>
Replaces or covers: <sprint file / FR-* IDs>

## Outcome
One short paragraph: after this ships, who can do what.

## Acceptance criteria (EARS)
AC1 When <trigger>, the <component> shall <response>.
AC2 While <state>, the <component> shall <response>.
AC3 If <unwanted condition>, then the <component> shall <response>.

## Non-goals
What this slice deliberately does not do.

## Contracts touched (read only these sections)
Master plan §<n> (<name>). ADR-<nnn>. New or changed Zod schemas: packages/shared/src/api/<file>.ts

## Risks to test explicitly
- Isolation: 404 for non-members and 403 for low roles on every new route.
- Races: <each read-then-write> gets a Promise.all test.
- Free-tier profile: <anything affected>.

## Tests written first
<path>.acceptance.test.ts covers AC1-AC<n>. SC IDs: <SC-...>.

## Done means
Required checks green · claims audit shows no MISSING or STUB · staging smoke passes (once staging exists) ·
the user merged the PR.
