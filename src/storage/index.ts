/**
 * Persistence layer over chrome.storage.local: settings, saved highlight sets,
 * watchlists (global + domain-scoped), and JSON export/import.
 *
 * Pure serialization helpers (buildExportBundle / parseImportBundle) are kept
 * separate from chrome.* calls so they can be unit-tested without the browser.
 */
import type {
  Settings,
  TermOptions,
  HighlightSet,
  Watchlist,
  SerializableTerm,
  ExportBundle,
} from '../types/index';

const KEY_SETTINGS = 'mf.settings';
const KEY_SETS = 'mf.sets';
const KEY_WATCHLISTS = 'mf.watchlists';

export const DEFAULT_OPTIONS: TermOptions = {
  caseSensitive: false,
  wholeWord: false,
  regex: false,
};

export const DEFAULT_SETTINGS: Settings = {
  defaultOptions: { ...DEFAULT_OPTIONS },
  maxMatchesPerPage: 5000,
  maxNodes: 200000,
  rescanDebounceMs: 250,
  view: 'panel',
};

// ---- low-level chrome.storage access --------------------------------------

function storageArea(): chrome.storage.StorageArea {
  return chrome.storage.local;
}

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const result = await storageArea().get(key);
    const value = result[key];
    return value === undefined ? fallback : (value as T);
  } catch {
    return fallback;
  }
}

async function write(key: string, value: unknown): Promise<void> {
  await storageArea().set({ [key]: value });
}

// ---- settings -------------------------------------------------------------

export async function loadSettings(): Promise<Settings> {
  const stored = await read<Partial<Settings>>(KEY_SETTINGS, {});
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    defaultOptions: { ...DEFAULT_OPTIONS, ...stored.defaultOptions },
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await write(KEY_SETTINGS, settings);
}

// ---- highlight sets -------------------------------------------------------

export async function loadSets(): Promise<HighlightSet[]> {
  return read<HighlightSet[]>(KEY_SETS, []);
}

export async function saveSet(
  name: string,
  terms: SerializableTerm[],
): Promise<HighlightSet> {
  const sets = await loadSets();
  const set: HighlightSet = {
    id: `set_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    terms,
    createdAt: Date.now(),
  };
  sets.push(set);
  await write(KEY_SETS, sets);
  return set;
}

export async function deleteSet(id: string): Promise<void> {
  const sets = (await loadSets()).filter((s) => s.id !== id);
  await write(KEY_SETS, sets);
}

// ---- watchlists -----------------------------------------------------------

export async function loadWatchlists(): Promise<Watchlist[]> {
  return read<Watchlist[]>(KEY_WATCHLISTS, []);
}

export async function saveWatchlist(
  name: string,
  domain: string | null,
  terms: SerializableTerm[],
): Promise<Watchlist> {
  const lists = await loadWatchlists();
  const list: Watchlist = {
    id: `wl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    domain,
    terms,
    createdAt: Date.now(),
  };
  lists.push(list);
  await write(KEY_WATCHLISTS, lists);
  return list;
}

export async function deleteWatchlist(id: string): Promise<void> {
  const lists = (await loadWatchlists()).filter((w) => w.id !== id);
  await write(KEY_WATCHLISTS, lists);
}

/** Watchlists that apply to a host: global (domain null) + exact matches. */
export function watchlistsForHost(
  lists: Watchlist[],
  host: string,
): Watchlist[] {
  return lists.filter((w) => w.domain === null || w.domain === host);
}

// ---- export / import (pure) -----------------------------------------------

export function buildExportBundle(
  settings: Settings,
  sets: HighlightSet[],
  watchlists: Watchlist[],
): ExportBundle {
  return {
    kind: 'multi-find-export',
    version: 1,
    exportedAt: Date.now(),
    settings,
    sets,
    watchlists,
  };
}

export interface ParsedImport {
  settings?: Settings;
  sets: HighlightSet[];
  watchlists: Watchlist[];
}

/** Parse and validate an export bundle from JSON text. Throws on bad input. */
export function parseImportBundle(json: string): ParsedImport {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('File is not valid JSON.');
  }
  if (typeof data !== 'object' || data === null) {
    throw new Error('Unexpected file contents.');
  }
  const bundle = data as Partial<ExportBundle>;
  if (bundle.kind !== 'multi-find-export') {
    throw new Error('Not a Multi-Find export file.');
  }
  if (bundle.version !== 1) {
    throw new Error(`Unsupported export version: ${String(bundle.version)}.`);
  }
  return {
    settings: bundle.settings,
    sets: Array.isArray(bundle.sets) ? bundle.sets : [],
    watchlists: Array.isArray(bundle.watchlists) ? bundle.watchlists : [],
  };
}

/** Apply a parsed import, merging into existing stored data. */
export async function applyImport(parsed: ParsedImport): Promise<void> {
  if (parsed.settings) await saveSettings(parsed.settings);
  if (parsed.sets.length > 0) {
    const existing = await loadSets();
    await write(KEY_SETS, [...existing, ...parsed.sets]);
  }
  if (parsed.watchlists.length > 0) {
    const existing = await loadWatchlists();
    await write(KEY_WATCHLISTS, [...existing, ...parsed.watchlists]);
  }
}
