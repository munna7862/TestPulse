# Walkthrough: Phase 02 — Sprint 06: Design System Foundation and App Shell

## 1. Sprint Metadata
- **Sprint:** P02-S06: Design System Foundation and App Shell
- **Phase:** Phase 02: Project Bootstrap & DevOps
- **Branch:** `feat/P02-S06-design-system-app-shell`
- **Lead Persona:** `role-frontend-engineer`
- **Reviewer Personas:** `role-product-owner`, `role-sdet-architect`
- **Date:** 2026-10-02

---

## 2. Overview & Implementation Summary

In P02-S06, we established the design tokens, no-flash theming, typography baseline, base UI primitives in `@testpulse/ui`, authenticated responsive App Shell, and an interactive component catalog for TestPulse:

1. **Design Tokens & Contrast Specification (`docs/ux/design-tokens.md`, `apps/web/src/app/globals.css`)**:
   - Specified semantic design tokens for surface, text, border, brand, and 6 core test execution states (`passed`, `failed`, `skipped`, `flaky`, `quarantined`, `running`).
   - Configured Tailwind CSS v4 `@theme` mappings to semantic CSS variables with `@variant dark (&:where(.dark, .dark *));`.
   - Verified WCAG 2.1 AA color contrast in both light and dark themes (text contrast ≥ 4.5:1, status badges and graphics ≥ 3.0:1).

2. **No-Flash Theme Switcher & Persistence (`apps/web/src/providers/ThemeProvider.tsx`, `apps/web/src/app/layout.tsx`)**:
   - Implemented `ThemeProvider` supporting `system`, `light`, and `dark` modes with lazy initialization avoiding cascading re-renders.
   - Persists user selection in `localStorage` (`testpulse-theme`) and long-lived cookies (`max-age=31536000`).
   - Configured inline pre-hydration script in `layout.tsx` executing before React mounts to apply `.dark` to `<html>` immediately, eliminating any theme flash on page load.

3. **Typography Self-Hosting (`apps/web/src/app/layout.tsx`)**:
   - Configured `next/font/google` for `Inter` (UI) and `JetBrains_Mono` (Code/Stack traces) using Next.js build-time font optimization with zero runtime requests to external font CDNs.

4. **UI Primitives Package (`@testpulse/ui`)**:
   - Implemented accessible primitives built on Radix UI primitives:
     - `Button`: Multiple variants (`default`, `secondary`, `destructive`, `outline`, `ghost`, `link`), sizes (`sm`, `md`, `lg`, `icon`), loading spinner state, and Radix `Slot` (`asChild`).
     - `IconButton`: Accessible icon button requiring `aria-label`.
     - `Input`: Label, helper text, error messages, and disabled state.
     - `Select`: Radix Select with accessible triggers, item list, and keyboard navigation.
     - `Checkbox`: Radix Checkbox with check indicator and label.
     - `Badge`: Generic status badges (`default`, `secondary`, `outline`, `destructive`).
     - `StatusBadge`: Test execution status badge with dedicated colors and icons for `passed`, `failed`, `skipped`, `flaky`, `quarantined`, `running`.
     - `Card`: Composable `Card`, `CardHeader`, `CardTitle` (configurable heading hierarchy), `CardDescription`, `CardContent`, `CardFooter`.
     - `Dialog`: Accessible Radix modal dialog with overlay, header, footer, and close trigger.
     - `DropdownMenu`: Accessible Radix dropdown menu with items, separators, and labels.
     - `Tooltip`: Radix Tooltip with provider, trigger, and content.
     - `Tabs`: Radix Tabs with list, triggers, and tab panels.
     - `Table`: Accessible HTML5 data table with header, body, row, cell, and caption primitives.
     - `Skeleton`: Animated pulse loading placeholder with `aria-busy="true"` and `aria-live="polite"`.
     - `EmptyState`: Empty state illustration/icon, title, description, and action button.
     - `Toast`: Polite notification status alert with variants (`info`, `success`, `warning`, `destructive`).
     - `CodeBlock`: Untrusted code/stack trace renderer safely avoiding HTML injection with copy button.
     - `ThemeToggle`: Theme switcher dropdown supporting light, dark, and system modes.

5. **Responsive App Shell (`apps/web/src/app/(app)/layout.tsx`)**:
   - Implemented sidebar navigation (`/runs`, `/flaky`, `/quarantine`, `/leaderboards`, `/settings`, `/dev/ui`) with active indicators and badges.
   - Header with organization/project switcher slot, breadcrumbs, real-time connection status pill (🟢 Live / 🟡 Reconnecting / 🔴 Offline), notification bell slot, theme toggle, and user avatar.
   - Mobile responsive drawer menu with accessible backdrop and close button.

6. **Interactive Component Catalog (`apps/web/src/app/dev/ui/page.tsx`)**:
   - Interactive preview route showcasing all design system primitives in both light and dark themes across 7 structured sections.

---

## 3. Traceability & Test Scenarios

All scenarios are cataloged in `docs/testing/test_cases_catalog_P02_S06.md` and registered in `docs/testing/scenario-catalog.md`:

| Scenario ID | Description | Automated By | Status |
| :--- | :--- | :--- | :--- |
| **SC-UX-001** | Component catalog renders all primitives in light and dark themes with 0 Axe violations | `apps/web/e2e/catalog.spec.ts` | Verified |
| **SC-UX-002** | Page loads with dark system preference and paints dark tokens without flash | `apps/web/e2e/catalog.spec.ts` | Verified |
| **SC-UX-003** | Theme toggle persists user choice in localStorage across page reloads | `apps/web/e2e/catalog.spec.ts` | Verified |
| **SC-UX-004** | Screens render loading, empty, and error states gracefully | `packages/ui/src/index.test.ts` | Verified |
| **SC-UX-005** | App shell renders navigation, breadcrumbs, status pill, and satisfies WCAG 2.1 AA | `apps/web/e2e/catalog.spec.ts` | Verified |

---

## 4. Verification Results & Quality Gates

All Turborepo quality gates were executed locally and observed to pass:

| Gate / Command | Observed Output | Duration | Status |
| :--- | :--- | :--- | :--- |
| `npm run check:traceability` | `100% of automated scenarios verified against tests` (18/18 verified) | 0.8s | **PASS** |
| `npm run format:check` | `All matched files use Prettier code style!` | 1.7s | **PASS** |
| `npm run lint` | 0 ESLint errors, 0 warnings across all 6 workspaces | 13.8s | **PASS** |
| `npm run typecheck` | 0 TypeScript compiler errors across all 6 workspaces | 6.5s | **PASS** |
| `npm run test` | 62 tests passing across `@testpulse/db` (16), `@testpulse/shared` (6), `@testpulse/web` (3), `@testpulse/ui` (14), `@testpulse/api` (23) | 2.3s | **PASS** |
| `npm run test:e2e` | 6 Playwright E2E & Axe-core accessibility tests passing in both themes | 8.4s | **PASS** |
| `npm run build` | Turborepo build success across Next.js (`/`, `/_not-found`, `/dev/ui`, `/healthz`, `/runs`) and Fastify (`server.js`, `worker-main.js`) | 10.7s | **PASS** |

---

## 5. Known Constraints & Audit Notes

- **Prisma 7.10 Dependency Advisory:** As documented in ADR-004 and P02-S04, `@prisma/config@7.10.0` has upstream transitive advisories (`deepmerge-ts` and `mysql2`). Per ADR-004, Prisma 7.10 is pinned and cannot be downgraded via `npm audit fix --force`.
- **Component Catalog Route:** The `/dev/ui` route serves as the living component catalog and Playwright E2E visual/accessibility test harness. In future production releases, it can be conditionally gated by environment or feature flag.
