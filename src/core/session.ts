/**
 * SessionModel — the single source of truth for the active search session.
 * Both UI views (panel and overview) render from one instance of this model.
 * DOM-free and observable via subscribe().
 */
import type {
  Term,
  TermOptions,
  ViewMode,
  SerializableTerm,
} from '../types/index';
import { assignColor, contrastColor } from './colors';

export interface SessionSnapshot {
  terms: Term[];
  viewMode: ViewMode;
  activeTermId: string | null;
}

export type SessionListener = (snapshot: SessionSnapshot) => void;

export const DEFAULT_TERM_OPTIONS: TermOptions = {
  caseSensitive: false,
  wholeWord: false,
  regex: false,
};

let idCounter = 0;
function generateId(): string {
  idCounter += 1;
  return `t_${idCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

export class SessionModel {
  private terms: Term[] = [];
  private viewMode: ViewMode = 'panel';
  private activeTermId: string | null = null;
  private listeners = new Set<SessionListener>();
  private defaults: TermOptions;

  constructor(defaults: TermOptions = DEFAULT_TERM_OPTIONS) {
    this.defaults = { ...defaults };
  }

  // ---- subscription -------------------------------------------------------

  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) listener(snapshot);
  }

  getSnapshot(): SessionSnapshot {
    return {
      terms: this.terms.map((t) => ({ ...t, options: { ...t.options } })),
      viewMode: this.viewMode,
      activeTermId: this.activeTermId,
    };
  }

  // ---- term CRUD ----------------------------------------------------------

  addTerm(query = '', options?: Partial<TermOptions>): Term {
    const color = assignColor(this.terms.map((t) => t.color));
    const term: Term = {
      id: generateId(),
      query,
      color,
      textColor: contrastColor(color),
      enabled: true,
      options: { ...this.defaults, ...options },
    };
    this.terms.push(term);
    this.activeTermId = term.id;
    this.emit();
    return term;
  }

  removeTerm(id: string): void {
    const before = this.terms.length;
    this.terms = this.terms.filter((t) => t.id !== id);
    if (this.terms.length === before) return;
    if (this.activeTermId === id) {
      this.activeTermId = this.terms.length > 0 ? this.terms[0]!.id : null;
    }
    this.emit();
  }

  updateTerm(id: string, patch: Partial<Omit<Term, 'id'>>): void {
    const term = this.terms.find((t) => t.id === id);
    if (!term) return;
    if (patch.query !== undefined) term.query = patch.query;
    if (patch.enabled !== undefined) term.enabled = patch.enabled;
    if (patch.color !== undefined) {
      term.color = patch.color;
      term.textColor = patch.textColor ?? contrastColor(patch.color);
    } else if (patch.textColor !== undefined) {
      term.textColor = patch.textColor;
    }
    if (patch.options) term.options = { ...term.options, ...patch.options };
    this.emit();
  }

  setQuery(id: string, query: string): void {
    this.updateTerm(id, { query });
  }

  setOption(id: string, key: keyof TermOptions, value: boolean): void {
    const term = this.terms.find((t) => t.id === id);
    if (!term) return;
    term.options = { ...term.options, [key]: value };
    this.emit();
  }

  toggleEnabled(id: string): void {
    const term = this.terms.find((t) => t.id === id);
    if (!term) return;
    term.enabled = !term.enabled;
    this.emit();
  }

  setActiveTerm(id: string | null): void {
    if (id !== null && !this.terms.some((t) => t.id === id)) return;
    this.activeTermId = id;
    this.emit();
  }

  clear(): void {
    if (this.terms.length === 0) return;
    this.terms = [];
    this.activeTermId = null;
    this.emit();
  }

  // ---- view ---------------------------------------------------------------

  setViewMode(mode: ViewMode): void {
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    this.emit();
  }

  toggleViewMode(): void {
    this.setViewMode(this.viewMode === 'panel' ? 'overview' : 'panel');
  }

  getViewMode(): ViewMode {
    return this.viewMode;
  }

  // ---- defaults -----------------------------------------------------------

  setDefaults(defaults: TermOptions): void {
    this.defaults = { ...defaults };
  }

  // ---- serialization ------------------------------------------------------

  /** Active terms as a serializable list (drops runtime ids). */
  serializeTerms(): SerializableTerm[] {
    return this.terms.map((t) => ({
      query: t.query,
      color: t.color,
      textColor: t.textColor,
      enabled: t.enabled,
      options: { ...t.options },
    }));
  }

  /** Replace all terms from a serialized list, assigning fresh ids. */
  loadTerms(terms: SerializableTerm[]): void {
    this.terms = terms.map((t) => ({
      id: generateId(),
      query: t.query,
      color: t.color,
      textColor: t.textColor || contrastColor(t.color),
      enabled: t.enabled,
      options: { ...this.defaults, ...t.options },
    }));
    this.activeTermId = this.terms.length > 0 ? this.terms[0]!.id : null;
    this.emit();
  }

  /** Append serialized terms to the current session. */
  appendTerms(terms: SerializableTerm[]): void {
    for (const t of terms) {
      this.terms.push({
        id: generateId(),
        query: t.query,
        color: t.color || assignColor(this.terms.map((x) => x.color)),
        textColor: t.textColor || contrastColor(t.color),
        enabled: t.enabled,
        options: { ...this.defaults, ...t.options },
      });
    }
    if (terms.length > 0 && this.activeTermId === null && this.terms[0]) {
      this.activeTermId = this.terms[0].id;
    }
    this.emit();
  }
}
