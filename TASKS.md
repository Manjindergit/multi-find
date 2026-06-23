# Multi-Find — Implementation Tracker

Living checklist of build progress. Full requirements: [`docs/SPEC.md`](./docs/SPEC.md).

Legend: `[ ]` not started · `[~]` in progress · `[x]` done

## 0. Foundation
- [x] Git repository initialized
- [x] README.md
- [x] CLAUDE.md
- [x] docs/SPEC.md (captured spec)
- [x] TASKS.md (this tracker)
- [x] .gitignore
- [x] package.json + dependencies installed
- [x] tsconfig.json (strict)
- [x] Vite MV3 build pipeline → dist/
- [x] Vitest configured
- [x] manifest (MV3) defined
- [x] Source directory skeleton (`src/{core,content,ui,background,storage,types,utils}`)

## 1. Core (DOM-free, unit-tested)
- [x] Shared session model (terms, options, active term, view, serialization)
- [x] Search engine: plain matching
- [x] Search engine: case-sensitive mode
- [x] Search engine: whole-word mode
- [x] Search engine: regex mode (with invalid-regex error handling)
- [x] Automatic color assignment
- [x] Auto-contrast text color computation
- [x] Per-term match counts
- [x] Next/previous navigation logic (active match index)
- [x] Unit tests for all of the above (40 tests passing)

## 2. Content script (DOM)
- [x] Text-node traversal / page scanning
- [x] Highlight rendering (CSS Custom Highlight API, per-term colors)
- [x] Click-to-jump + scroll-into-view
- [x] Active-match emphasis
- [x] `MutationObserver` updates
- [x] Debounced rescans
- [x] `requestIdleCallback` time-slicing
- [x] Large-page safeguards (node + match caps)
- [x] SPA route-change handling (history hook + popstate/hashchange)
- [x] Select-to-add workflow (selection → new term)

## 3. UI (Shadow DOM)
- [x] Shadow root host + style isolation
- [x] Compact pinned panel view
- [x] Centered overview view
- [x] Runtime switching between views
- [x] Both views bound to shared session model
- [x] Per-term controls (color, count, remove, enable, mode toggles)
- [x] Match-density minimap (clickable, live cursor)
- [x] Context snippets list (click-to-jump)
- [x] Keyboard shortcuts within UI (Enter/Shift+Enter/Esc)
- [x] Accessibility (roles, aria-labels, aria-pressed, focus management, dark mode, reduced motion)

## 4. Background (service worker)
- [x] MV3 service worker
- [x] Toolbar action handler
- [x] Commands API shortcuts
- [x] Message relay (background → content)

## 5. Persistence
- [x] `chrome.storage` wrapper
- [x] Settings persistence
- [x] Saved highlight sets
- [x] Watchlists (global)
- [x] Domain-scoped watchlists (auto-applied on matching hosts)
- [x] Export to JSON
- [x] Import from JSON (with validation)

## 6. Quality
- [x] Error handling across layers (invalid regex, storage failures, import errors)
- [x] Production build verified (`npm run build` → loadable `dist/`)
- [x] Unit test coverage for core + storage serialization
- [x] Documentation complete (README usage + inline docs)
- [x] Firefox/Edge portability considered (feature-detected highlighter, thin chrome.* surface)

## Verification snapshot
- `npm run typecheck` → clean
- `npm run test` → 40 passing
- `npm run build` → MV3 `dist/` emitted
