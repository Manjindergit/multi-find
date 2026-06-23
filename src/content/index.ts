/**
 * Content-script entry point — bootstraps the session, engine, UI, and
 * select-to-add, and handles relayed commands from the background worker.
 */
import type { RuntimeMessage, ViewMode } from '../types/index';
import { SessionModel } from '../core/session';
import { EngineImpl } from './engine';
import { SelectToAdd } from './select-to-add';
import { UiController } from '../ui/app';
import {
  loadSettings,
  loadWatchlists,
  watchlistsForHost,
  saveSettings,
} from '../storage/index';
import { currentHost, debounce } from '../utils/index';

async function bootstrap(): Promise<void> {
  const w = window as unknown as { __multiFindLoaded?: boolean };
  if (w.__multiFindLoaded) return;
  w.__multiFindLoaded = true;

  const settings = await loadSettings();

  const session = new SessionModel(settings.defaultOptions);
  session.setViewMode(settings.view);

  const engine = new EngineImpl(session, settings);
  const ui = new UiController(session, engine, settings);

  const selectToAdd = new SelectToAdd((text) => {
    session.addTerm(text);
    if (!ui.isVisible()) ui.open();
  });

  engine.setExcludeHosts([ui.hostElement]);
  engine.start();
  selectToAdd.start();

  // Auto-apply watchlists that match this host (global + domain-scoped).
  try {
    const lists = await loadWatchlists();
    const matching = watchlistsForHost(lists, currentHost());
    for (const list of matching) session.appendTerms(list.terms);
  } catch {
    /* storage unavailable — continue without watchlists */
  }

  // Persist view-mode changes so the preference sticks.
  const persistView = debounce((view: ViewMode) => {
    void saveSettings({ ...settings, view });
  }, 500);
  let lastView = session.getViewMode();
  session.subscribe((snapshot) => {
    if (snapshot.viewMode !== lastView) {
      lastView = snapshot.viewMode;
      persistView(lastView);
    }
  });

  chrome.runtime.onMessage.addListener((message: RuntimeMessage) => {
    if (message?.type !== 'mf-command') return;
    switch (message.command) {
      case 'toggle-panel':
        ui.toggle();
        break;
      case 'toggle-view':
        session.toggleViewMode();
        if (!ui.isVisible()) ui.open();
        break;
      case 'next-match':
        if (!ui.isVisible()) ui.open();
        engine.next();
        break;
      case 'prev-match':
        if (!ui.isVisible()) ui.open();
        engine.prev();
        break;
      case 'add-selection':
        if (selectToAdd.addCurrentSelection() && !ui.isVisible()) ui.open();
        break;
      default:
        break;
    }
  });
}

void bootstrap();
