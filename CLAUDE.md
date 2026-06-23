# CLAUDE.md

Guidance for AI-assisted development of **Multi-Find**, a Manifest V3 browser extension for multi-term in-page search.

## What this project is

A browser extension that finds, highlights, counts, and navigates **multiple search terms simultaneously**, each in its own color. Full requirements live in [`docs/SPEC.md`](./docs/SPEC.md). Progress is tracked in [`TASKS.md`](./TASKS.md) — keep it updated as features land.

## Architecture (mandatory decisions)

- **Language:** TypeScript, `strict` mode. No `any` escape hatches without justification.
- **Build:** Vite with an MV3 pipeline → outputs to `dist/`.
- **Tests:** Vitest. Core logic (search engine, color assignment, session model, storage serialization) must be unit-testable in isolation from the DOM/browser APIs.
- **Target:** Chrome / Chromium (Manifest V3) first. Keep browser-specific code behind thin adapters so Firefox/Edge ports stay feasible.

### Layered structure

Code is organized so the **core is framework- and DOM-free** and testable:

| Layer | Path | Responsibility |
|-------|------|----------------|
| Core | `src/core/` | Search engine (plain/case/word/regex matching), shared **session model**, color assignment + auto-contrast. No DOM, no `chrome.*`. |
| Content | `src/content/` | DOM traversal, highlight rendering, `MutationObserver`, scroll/jump, select-to-add. |
| UI | `src/ui/` | Shadow-DOM panel + overview views. Both render from the **same** session model. |
| Background | `src/background/` | MV3 service worker: toolbar action, Commands API, message relay. |
| Storage | `src/storage/` | `chrome.storage` persistence, watchlists (global + domain-scoped), export/import JSON. |
| Types/Utils | `src/types/`, `src/utils/` | Shared types and helpers. |

### Key principles

- **One session model, two views.** The pinned panel and centered overview are different renderings of one shared state object. Never fork state per view.
- **Shadow DOM isolation.** All injected UI lives in a shadow root so page CSS can't leak in or out.
- **Performance is a feature.** Debounce rescans, time-slice with `requestIdleCallback`, and guard against pathological large pages. SPA route changes must re-trigger scans via `MutationObserver`.
- **No placeholders.** Don't leave TODO stubs, mocked behavior, or "future enhancement" gaps for spec'd features. If something is in the spec, it gets implemented.

## Commands

```bash
npm install        # install dependencies
npm run dev        # watch-mode build for development
npm run build      # production build → dist/
npm run test       # run Vitest
npm run typecheck  # tsc --noEmit
npm run lint       # lint (if configured)
```

## Conventions

- Match the style of surrounding code; keep the core dependency-free.
- Browser APIs (`chrome.*`) are accessed only in `background/`, `content/`, `storage/` — never in `core/`.
- Prefer pure functions in `core/` returning data the view layers render.
- Write a unit test alongside any non-trivial core logic change.
- Update [`TASKS.md`](./TASKS.md) when completing or adding a task.

## Environment notes

- Primary dev OS: Windows (PowerShell). A Bash tool is also available for POSIX scripts.
- This repo is Chrome-first; test by loading `dist/` as an unpacked extension at `chrome://extensions`.
