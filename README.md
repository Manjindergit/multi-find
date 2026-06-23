# Multi-Find

A browser extension that supercharges in-page search: find, highlight, and navigate **multiple search terms at once** — each in its own color, with match counts, regex support, saved sets, watchlists, and a match-density minimap. Think `Ctrl+F`, but for many queries simultaneously.

> Status: **Scaffolding / pre-implementation.** See [`TASKS.md`](./TASKS.md) for the build checklist and [`docs/SPEC.md`](./docs/SPEC.md) for the full specification.

## Features

### Core search
- Multiple simultaneous search terms, each with an individual color
- Automatic color assignment with auto-contrast text colors
- Live match counts per term
- Next / previous navigation across matches
- Case-sensitive, whole-word, and regex modes

### UI
- Compact **pinned panel** and a centered **overview** mode, switchable at runtime
- Fully isolated from page styles via **Shadow DOM**
- A single shared session model drives both views

### Persistence
- Saved highlight sets and watchlists (global + domain-scoped)
- Settings persistence
- Export / import as JSON

### Navigation & discovery
- Match-density **minimap**
- Context snippets with click-to-jump navigation
- Keyboard shortcuts and a select-to-add workflow

### Browser integration
- Toolbar action and Commands API shortcuts
- MV3 service-worker relay between popup, background, and content scripts

### Performance
- `MutationObserver`-driven updates with debounced rescans
- `requestIdleCallback` time-slicing and large-page safeguards
- SPA compatibility

## Tech stack

- **TypeScript** (strict mode)
- **Vite** + MV3 build pipeline
- **Vitest** for unit tests
- Chrome-first (Manifest V3); Firefox/Edge portability kept in mind

## Getting started

```bash
npm install        # install dependencies
npm run dev        # build in watch mode for development
npm run build      # produce a production build in dist/
npm run test       # run unit tests
npm run typecheck  # type-check without emitting
```

### Load the unpacked extension (Chrome)

1. Run `npm run build` (or `npm run dev`).
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the `dist/` folder.

## Project layout

```
multi-find/
├── src/
│   ├── background/   # MV3 service worker (command + message relay)
│   ├── content/      # content script: DOM scanning, highlighting
│   ├── core/         # search engine, session model, color logic
│   ├── ui/           # Shadow DOM panel + overview views
│   ├── storage/      # persistence, watchlists, export/import
│   ├── types/        # shared TypeScript types
│   └── utils/        # shared helpers
├── tests/            # unit tests
├── docs/SPEC.md      # full product specification
├── TASKS.md          # implementation progress tracker
└── CLAUDE.md         # guidance for AI-assisted development
```

## License

TBD.
