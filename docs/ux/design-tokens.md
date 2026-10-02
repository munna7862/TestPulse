# TestPulse Design Tokens & Theming Specification

> **Sprint:** Phase 02 — Sprint 06: Design System Foundation and App Shell  
> **Status:** Active baseline for all UI sprints (Phases 03–08).  
> **Standards:** WCAG 2.1 AA (text ≥ 4.5:1, UI components & badges ≥ 3:1).

---

## 1. Overview & Principles

TestPulse uses a semantic, CSS-first design token architecture built on **Tailwind CSS v4** `@theme`.  
Components reference **semantic roles** (`surface`, `foreground`, `border`, `primary`, status indicators), never raw color names (e.g. `bg-red-500`), ensuring complete consistency across light and dark themes.

- **Zero Flash of Unstyled Theme (FOUT):** Themes (`system`, `light`, `dark`) are resolved and applied prior to initial paint using an inline pre-hydration script.
- **Accessible Contrast:** Every foreground token paired with its corresponding background token satisfies WCAG 2.1 AA standards.
- **Untrusted Content Safety:** System font stacks and monospace code fonts render untrusted text safely without layout distortion.

---

## 2. Color Palette & Semantic Tokens

### 2.1 Base Surfaces & Layout

| Token | CSS Variable | Light Theme | Dark Theme | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `background` | `--background` | `#ffffff` | `#0b0f19` | Application canvas / base background |
| `foreground` | `--foreground` | `#0f172a` (Slate 900) | `#f8fafc` (Slate 50) | High-contrast body text (Contrast: ~16:1) |
| `card` | `--card` | `#ffffff` | `#111827` (Gray 900) | Card and container surfaces |
| `card-foreground` | `--card-foreground` | `#0f172a` | `#f8fafc` | Text within cards |
| `popover` | `--popover` | `#ffffff` | `#111827` | Menus, tooltips, dialogs, dropdowns |
| `popover-foreground` | `--popover-foreground` | `#0f172a` | `#f8fafc` | Text within popovers |
| `muted` | `--muted` | `#f1f5f9` (Slate 100) | `#1e293b` (Slate 800) | Subtle backgrounds, table headers |
| `muted-foreground` | `--muted-foreground` | `#475569` (Slate 600) | `#94a3b8` (Slate 400) | Secondary text, captions (Contrast: ~5.2:1) |
| `border` | `--border` | `#e2e8f0` (Slate 200) | `#1e293b` (Slate 800) | Card, dialog, and divider borders |
| `input` | `--input` | `#e2e8f0` (Slate 200) | `#334155` (Slate 700) | Form input border |
| `ring` | `--ring` | `#6366f1` (Indigo 500) | `#818cf8` (Indigo 400) | Focus ring indicator |

---

### 2.2 Brand & Actions

| Token | CSS Variable | Light Theme | Dark Theme | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `primary` | `--primary` | `#4f46e5` (Indigo 600) | `#6366f1` (Indigo 500) | Primary call to action, active tabs |
| `primary-foreground` | `--primary-foreground` | `#ffffff` | `#ffffff` | Text on primary elements (Contrast: > 5:1) |
| `secondary` | `--secondary` | `#f1f5f9` (Slate 100) | `#1e293b` (Slate 800) | Secondary buttons, subtle pills |
| `secondary-foreground` | `--secondary-foreground` | `#0f172a` | `#f8fafc` | Text on secondary elements |
| `accent` | `--accent` | `#f8fafc` (Slate 50) | `#1e293b` (Slate 800) | Hover highlight state |
| `accent-foreground` | `--accent-foreground` | `#0f172a` | `#f8fafc` | Text on hovered items |
| `destructive` | `--destructive` | `#dc2626` (Red 600) | `#ef4444` (Red 500) | Dangerous actions, delete buttons |
| `destructive-foreground` | `--destructive-foreground` | `#ffffff` | `#ffffff` | Text on destructive elements |

---

### 2.3 Test Execution Status Tokens

TestPulse defines dedicated status tokens matching the test execution domain model:

| Status | Role / Meaning | Light Background | Light Foreground | Dark Background | Dark Foreground |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`passed`** | Successful test pass | `#ecfdf5` (Emerald 50) | `#047857` (Emerald 700) | `rgba(6, 78, 59, 0.35)` | `#34d399` (Emerald 400) |
| **`failed`** | Assertion or runtime failure | `#fef2f2` (Red 50) | `#b91c1c` (Red 700) | `rgba(127, 29, 29, 0.35)` | `#f87171` (Red 400) |
| **`skipped`** | Skipped / omitted test | `#f1f5f9` (Slate 100) | `#475569` (Slate 600) | `rgba(30, 41, 59, 0.5)` | `#94a3b8` (Slate 400) |
| **`flaky`** | Intermittent flakiness | `#fffbeb` (Amber 50) | `#b45309` (Amber 700) | `rgba(120, 53, 15, 0.35)` | `#fbbf24` (Amber 400) |
| **`quarantined`** | Quarantined / non-blocking | `#faf5ff` (Purple 50) | `#7e22ce` (Purple 700) | `rgba(88, 28, 135, 0.35)` | `#c084fc` (Purple 400) |
| **`running`** | In-flight live execution | `#f0f9ff` (Sky 50) | `#0369a1` (Sky 700) | `rgba(12, 74, 110, 0.35)` | `#38bdf8` (Sky 400) |

All status foreground and background pairings satisfy WCAG 2.1 AA (≥ 4.5:1 for text, ≥ 3.0:1 for graphical pills).

---

## 3. Typography & Self-Hosting

Fonts are self-hosted via Next.js `next/font/google` at build time without external network calls during runtime:

- **UI Sans:** `Inter` (`--font-sans`)
  - Headings: `font-semibold` / `font-bold`, tight tracking.
  - Body: `font-normal` / `font-medium`, 14px / 16px.
- **Code & Stack Traces:** `JetBrains Mono` (`--font-mono`)
  - Code snippets, test fingerprints, timestamps, IDs: `font-mono`, 13px.

---

## 4. Spacing, Radii & Depth

- **Radii Scale:**
  - `rounded-sm`: `0.25rem` (4px) — Small badges, tags
  - `rounded-md`: `0.375rem` (6px) — Inputs, buttons
  - `rounded-lg`: `0.5rem` (8px) — Cards, modals, dialogs
  - `rounded-xl`: `0.75rem` (12px) — Popovers, dropdown menus
  - `rounded-full`: `9999px` — Avatars, status pills
- **Z-Index Scale:**
  - Base: `0`
  - Sticky Headers: `10`
  - Sidebar: `20`
  - Popover / Dropdown: `30`
  - Modal Backdrop / Dialog: `40`
  - Tooltips & Toasts: `50`
