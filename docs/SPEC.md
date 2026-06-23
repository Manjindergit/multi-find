# Multi-Find — Specification

The authoritative description of what Multi-Find must do. Everything here is **in scope** and required; no feature should ship as a placeholder, mock, or TODO.

## Overview

Multi-Find is a Manifest V3 browser extension (Chrome-first) that lets a user search a web page for **many terms at once**, highlighting each term in its own color, counting matches, and navigating between them — with saved sets, watchlists, a minimap, and regex support.

## Architecture decisions (mandatory)

- TypeScript, strict mode.
- Vite-based MV3 build pipeline → `dist/`.
- Vitest unit tests.
- Chrome/Chromium first; Firefox/Edge portability considered.
- DOM-free, testable **core** with a single shared **session model** rendered by both UI views.

## Required features

### Core search
- Multiple simultaneous search terms.
- Individual color per term.
- Live match counts per term.
- Next / previous navigation across all matches.
- Case-sensitive mode.
- Whole-word mode.
- Regex mode.
- Auto-contrast text colors (readable against each highlight color).
- Automatic color assignment for new terms.

### UI
- Compact **pinned panel**.
- Centered **overview** mode.
- Runtime switching between panel and overview.
- **Shadow DOM** isolation for all injected UI.
- Shared session model used by both views.

### Persistence
- Saved highlight sets.
- Watchlists.
- Domain-scoped watchlists.
- Settings persistence.
- Export / import as JSON.

### Navigation & discovery
- Match-density **minimap**.
- Context snippets for matches.
- Click-to-jump navigation.
- Keyboard shortcuts.
- Select-to-add workflow (select page text → add as a search term).

### Browser integration
- Toolbar action.
- Commands API (keyboard commands).
- MV3 service-worker relay between popup/background/content.
- Chrome-first implementation.
- Firefox/Edge portability considerations.

### Performance
- `MutationObserver`-driven updates.
- Debounced rescans.
- `requestIdleCallback` time-slicing.
- Large-page safeguards.
- SPA compatibility.

### Quality
- TypeScript, strict mode.
- Unit tests.
- Production-ready architecture.
- Error handling.
- Accessibility.
- Documentation.

## Deliverable

A complete, working repository implementing **all** of the above — no partial subsets, no placeholder implementations, no "future enhancement" sections for spec'd features.
