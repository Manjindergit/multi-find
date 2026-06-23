# Multi-Find — Implementation Tracker

Living checklist of build progress. Mark items `[x]` as they land (implemented **and** tested). Keep this in sync with each commit. Full requirements: [`docs/SPEC.md`](./docs/SPEC.md).

Legend: `[ ]` not started · `[~]` in progress · `[x]` done

## 0. Foundation
- [x] Git repository initialized
- [x] README.md
- [x] CLAUDE.md
- [x] docs/SPEC.md (captured spec)
- [x] TASKS.md (this tracker)
- [x] .gitignore
- [ ] package.json + dependencies installed
- [ ] tsconfig.json (strict)
- [ ] Vite MV3 build pipeline → dist/
- [ ] Vitest configured
- [ ] manifest (MV3) defined
- [ ] Source directory skeleton (`src/{core,content,ui,background,storage,types,utils}`)

## 1. Core (DOM-free, unit-tested)
- [ ] Shared session model (terms, options, active match, results)
- [ ] Search engine: plain matching
- [ ] Search engine: case-sensitive mode
- [ ] Search engine: whole-word mode
- [ ] Search engine: regex mode (with invalid-regex error handling)
- [ ] Automatic color assignment
- [ ] Auto-contrast text color computation
- [ ] Per-term match counts
- [ ] Next/previous navigation logic (active match index)
- [ ] Unit tests for all of the above

## 2. Content script (DOM)
- [ ] Text-node traversal / page scanning
- [ ] Highlight rendering (per-term colors)
- [ ] Click-to-jump + scroll-into-view
- [ ] Active-match emphasis
- [ ] `MutationObserver` updates
- [ ] Debounced rescans
- [ ] `requestIdleCallback` time-slicing
- [ ] Large-page safeguards (node/match caps)
- [ ] SPA route-change handling
- [ ] Select-to-add workflow (selection → new term)

## 3. UI (Shadow DOM)
- [ ] Shadow root host + style isolation
- [ ] Compact pinned panel view
- [ ] Centered overview view
- [ ] Runtime switching between views
- [ ] Both views bound to shared session model
- [ ] Per-term controls (color, count, remove, mode toggles)
- [ ] Match-density minimap
- [ ] Context snippets list
- [ ] Keyboard shortcuts within UI
- [ ] Accessibility (roles, focus management, contrast, ARIA)

## 4. Background (service worker)
- [ ] MV3 service worker
- [ ] Toolbar action handler
- [ ] Commands API shortcuts
- [ ] Message relay (popup ↔ background ↔ content)

## 5. Persistence
- [ ] `chrome.storage` wrapper
- [ ] Settings persistence
- [ ] Saved highlight sets
- [ ] Watchlists (global)
- [ ] Domain-scoped watchlists
- [ ] Export to JSON
- [ ] Import from JSON (with validation)

## 6. Quality
- [ ] Error handling across layers
- [ ] Production build verified (load unpacked in Chrome)
- [ ] Unit test coverage for core + storage serialization
- [ ] Documentation complete (README usage, code comments where needed)
- [ ] Firefox/Edge portability notes / adapters
