# Test Cases Catalog — Phase 02 Sprint 06: Design System Foundation & App Shell

## 1. Metadata & Traceability
- **Sprint:** P02-S06: Design System Foundation and App Shell
- **Phase:** Phase 02: Project Bootstrap & DevOps
- **Feature Traceability:**
  - `FR-UX-01` (Design tokens, primitives, app shell)
  - `FR-UX-02` (Dark/light/system theme without flash; per-user persistence)
  - `FR-UX-03` (Loading, empty, error states on screens)
  - `FR-UX-04` (WCAG 2.1 AA, keyboard navigation, accessible markup)
- **Scenario Traceability:**
  - `SC-UX-001` (Component catalog rendered in both themes with zero axe violations)
  - `SC-UX-002` (Dark theme first paint without flash)
  - `SC-UX-003` (Theme toggle persistence in localStorage across reloads)
  - `SC-UX-004` (Loading, empty, and error states render correctly)
  - `SC-UX-005` (Axe-core accessibility audit in both themes)
- **Lead Persona:** `role-frontend-engineer`
- **Reviewer Personas:** `role-product-owner`, `role-sdet-architect`

---

## 2. Test Scenarios Register

### [SC-UX-001] Component Catalog Rendering in Both Themes
- **Given:** Web application running with `@testpulse/ui` design system primitives
- **When:** Browser visits `/dev/ui` in light and dark mode
- **Then:** All base primitives (Buttons, Inputs, Selects, Checkboxes, Badges, StatusBadges, Cards, Dialogs, DropdownMenus, Tabs, Tables, Skeletons, EmptyStates, CodeBlocks) render correctly without visual regressions or critical/serious axe-core accessibility violations.
- **Level:** End-to-End (`E`)
- **Automated By:** `apps/web/e2e/catalog.spec.ts`

### [SC-UX-002] No-Flash Theme Loading
- **Given:** User browser prefers dark color scheme (`prefers-color-scheme: dark`)
- **When:** Page is loaded prior to client-side React hydration
- **Then:** The inline theme script evaluates before paint and attaches the `.dark` class to `document.documentElement`, ensuring zero flash of un-themed or light content.
- **Level:** End-to-End (`E`)
- **Automated By:** `apps/web/e2e/catalog.spec.ts`

### [SC-UX-003] Theme Selection Persistence
- **Given:** Theme toggle component in the header
- **When:** User selects "Dark", "Light", or "System"
- **Then:** The preference is stored in `localStorage` under `testpulse-theme` and persisted across browser reloads.
- **Level:** End-to-End (`E`)
- **Automated By:** `apps/web/e2e/catalog.spec.ts`

### [SC-UX-004] Loading, Empty, and Error States
- **Given:** Shared UI primitives for feedback states (`Skeleton`, `EmptyState`, `Card`)
- **When:** Rendered with loading placeholders or empty dataset indicators
- **Then:** Skeletons pulse with accessible aria-busy attributes and EmptyState displays an icon, title, description, and call to action.
- **Level:** Component Test (`CT` / `U`)
- **Automated By:** `packages/ui/src/index.test.ts` & `apps/web/e2e/catalog.spec.ts`

### [SC-UX-005] Automated WCAG 2.1 AA Accessibility Audit
- **Given:** Core application routes (`/`, `/dev/ui`, and app shell layout)
- **When:** Scanned using `@axe-core/playwright` in both light and dark themes
- **Then:** Zero critical or serious accessibility violations are reported.
- **Level:** End-to-End / Accessibility (`E`)
- **Automated By:** `apps/web/e2e/smoke.spec.ts` & `apps/web/e2e/catalog.spec.ts`
