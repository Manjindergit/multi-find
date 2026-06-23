import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  saveSet,
  loadSets,
  deleteSet,
  saveWatchlist,
  loadWatchlists,
  watchlistsForHost,
  buildExportBundle,
  parseImportBundle,
} from '../src/storage/index';
import type { SerializableTerm } from '../src/types/index';

// Minimal in-memory chrome.storage.local mock.
function installChromeMock(): void {
  const data: Record<string, unknown> = {};
  (globalThis as unknown as { chrome: unknown }).chrome = {
    storage: {
      local: {
        async get(key: string) {
          return key in data ? { [key]: data[key] } : {};
        },
        async set(items: Record<string, unknown>) {
          Object.assign(data, items);
        },
      },
    },
  };
}

const term: SerializableTerm = {
  query: 'foo',
  color: '#ffd54f',
  textColor: '#1a1a1a',
  enabled: true,
  options: { caseSensitive: false, wholeWord: false, regex: false },
};

beforeEach(() => {
  installChromeMock();
});

describe('settings', () => {
  it('returns defaults when nothing stored', async () => {
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
  it('round-trips saved settings', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, maxMatchesPerPage: 99 });
    expect((await loadSettings()).maxMatchesPerPage).toBe(99);
  });
});

describe('sets', () => {
  it('saves, loads, and deletes', async () => {
    const set = await saveSet('My set', [term]);
    expect(await loadSets()).toHaveLength(1);
    await deleteSet(set.id);
    expect(await loadSets()).toHaveLength(0);
  });
});

describe('watchlists', () => {
  it('filters by host (global + exact domain)', async () => {
    await saveWatchlist('global', null, [term]);
    await saveWatchlist('example', 'example.com', [term]);
    await saveWatchlist('other', 'other.com', [term]);
    const lists = await loadWatchlists();
    const forExample = watchlistsForHost(lists, 'example.com');
    expect(forExample.map((w) => w.name).sort()).toEqual(['example', 'global']);
  });
});

describe('export / import', () => {
  it('builds a versioned bundle', () => {
    const bundle = buildExportBundle(DEFAULT_SETTINGS, [], []);
    expect(bundle.kind).toBe('multi-find-export');
    expect(bundle.version).toBe(1);
  });
  it('parses a valid bundle', () => {
    const json = JSON.stringify(buildExportBundle(DEFAULT_SETTINGS, [], []));
    expect(parseImportBundle(json).sets).toEqual([]);
  });
  it('rejects non-JSON', () => {
    expect(() => parseImportBundle('not json')).toThrow();
  });
  it('rejects foreign files', () => {
    expect(() => parseImportBundle('{"kind":"something-else"}')).toThrow(
      /Not a Multi-Find/,
    );
  });
});
