/** Per-term matching options. Each term matches independently. */
export interface TermOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
}

/** A single search term in the session. */
export interface Term {
  id: string;
  query: string;
  /** Highlight background color (hex, e.g. "#ffd54f"). */
  color: string;
  /** Auto-contrast text color (hex), derived from `color`. */
  textColor: string;
  enabled: boolean;
  options: TermOptions;
}

/** A term shape safe to serialize (no runtime id required on import). */
export interface SerializableTerm {
  query: string;
  color: string;
  textColor: string;
  enabled: boolean;
  options: TermOptions;
}

export type ViewMode = 'panel' | 'overview';

export interface Settings {
  defaultOptions: TermOptions;
  /** Hard cap on total matches rendered per page (large-page safeguard). */
  maxMatchesPerPage: number;
  /** Hard cap on text nodes scanned (large-page safeguard). */
  maxNodes: number;
  /** Debounce window for rescans after DOM mutations. */
  rescanDebounceMs: number;
  view: ViewMode;
}

export interface HighlightSet {
  id: string;
  name: string;
  terms: SerializableTerm[];
  createdAt: number;
}

export interface Watchlist {
  id: string;
  name: string;
  /** null = applies to all domains; otherwise an exact hostname. */
  domain: string | null;
  terms: SerializableTerm[];
  createdAt: number;
}

export interface ExportBundle {
  kind: 'multi-find-export';
  version: 1;
  exportedAt: number;
  settings: Settings;
  sets: HighlightSet[];
  watchlists: Watchlist[];
}

/** Messages relayed between background, content, and UI. */
export type RuntimeCommand =
  | 'toggle-panel'
  | 'next-match'
  | 'prev-match'
  | 'toggle-view'
  | 'add-selection';

export interface CommandMessage {
  type: 'mf-command';
  command: RuntimeCommand;
}

export type RuntimeMessage = CommandMessage;
