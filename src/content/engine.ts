/**
 * Engine — orchestrates the session model, scanner, highlighter, and observer.
 * Owns match state (counts, ordered matches, active index) and emits results
 * to the UI. This is the bridge between the DOM-free core and the page.
 */
import type { Settings } from '../types/index';
import { SessionModel } from '../core/session';
import { Highlighter } from './highlighter';
import { PageObserver } from './observer';
import { scan, type OrderedMatch, type ScanToken } from './scanner';
import { debounce } from '../utils/index';

export interface MatchPosition {
  /** 1-based index of the active match, or 0 when there are none. */
  index: number;
  total: number;
}

export interface EngineResult {
  counts: Map<string, number>;
  total: number;
  truncated: boolean;
  position: MatchPosition;
  supported: boolean;
}

export interface SnippetParts {
  before: string;
  match: string;
  after: string;
}

export interface MinimapMark {
  ratio: number; // 0..1 vertical position in the document
  color: string;
}

const SNIPPET_CONTEXT = 40;

export class EngineImpl {
  readonly session: SessionModel;
  private settings: Settings;
  private highlighter = new Highlighter();
  private observer: PageObserver;
  private ordered: OrderedMatch[] = [];
  private activeIndex = -1;
  private truncated = false;
  private counts = new Map<string, number>();
  private resultListeners = new Set<(result: EngineResult) => void>();
  private excludeHosts: Element[] = [];
  private scanToken: ScanToken = { cancelled: false };
  private scheduleRescan: (() => void) & { cancel: () => void };
  private started = false;

  constructor(session: SessionModel, settings: Settings) {
    this.session = session;
    this.settings = settings;
    this.observer = new PageObserver(
      () => void this.rescan(),
      settings.rescanDebounceMs,
    );
    this.scheduleRescan = debounce(() => void this.rescan(), 60);
  }

  setExcludeHosts(hosts: Element[]): void {
    this.excludeHosts = hosts;
    this.observer.setExcludeHosts(hosts);
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.session.subscribe(() => this.scheduleRescan());
    this.observer.start();
    void this.rescan();
  }

  onResults(listener: (result: EngineResult) => void): () => void {
    this.resultListeners.add(listener);
    listener(this.currentResult());
    return () => this.resultListeners.delete(listener);
  }

  isSupported(): boolean {
    return this.highlighter.isSupported();
  }

  private currentResult(): EngineResult {
    return {
      counts: new Map(this.counts),
      total: this.ordered.length,
      truncated: this.truncated,
      position: {
        index: this.activeIndex >= 0 ? this.activeIndex + 1 : 0,
        total: this.ordered.length,
      },
      supported: this.highlighter.isSupported(),
    };
  }

  private emit(): void {
    const result = this.currentResult();
    for (const listener of this.resultListeners) listener(result);
  }

  async rescan(): Promise<void> {
    // Cancel any in-flight scan.
    this.scanToken.cancelled = true;
    const token: ScanToken = { cancelled: false };
    this.scanToken = token;

    const terms = this.session.getSnapshot().terms;
    const result = await scan(
      terms,
      {
        maxNodes: this.settings.maxNodes,
        maxMatches: this.settings.maxMatchesPerPage,
        excludeHosts: this.excludeHosts,
      },
      token,
    );
    if (token.cancelled) return;

    this.counts = result.counts;
    this.ordered = result.ordered;
    this.truncated = result.truncated;

    // Paint highlights grouped by term.
    const termList = terms
      .filter((t) => t.enabled && result.rangesByTerm.has(t.id))
      .map((t) => ({
        id: t.id,
        color: t.color,
        textColor: t.textColor,
        ranges: result.rangesByTerm.get(t.id) ?? [],
      }));
    this.highlighter.render(termList);

    // Keep active index in range.
    if (this.ordered.length === 0) {
      this.activeIndex = -1;
      this.highlighter.setActive(null);
    } else if (this.activeIndex >= this.ordered.length) {
      this.activeIndex = this.ordered.length - 1;
      this.applyActive(false);
    } else if (this.activeIndex >= 0) {
      this.applyActive(false);
    }

    this.emit();
  }

  // ---- navigation ---------------------------------------------------------

  next(): void {
    if (this.ordered.length === 0) return;
    this.activeIndex = (this.activeIndex + 1) % this.ordered.length;
    this.applyActive(true);
    this.emit();
  }

  prev(): void {
    if (this.ordered.length === 0) return;
    this.activeIndex =
      (this.activeIndex - 1 + this.ordered.length) % this.ordered.length;
    this.applyActive(true);
    this.emit();
  }

  jumpTo(index: number): void {
    if (index < 0 || index >= this.ordered.length) return;
    this.activeIndex = index;
    this.applyActive(true);
    this.emit();
  }

  private applyActive(scrollIntoView: boolean): void {
    const match = this.ordered[this.activeIndex];
    if (!match) {
      this.highlighter.setActive(null);
      return;
    }
    this.highlighter.setActive(match.range);
    if (scrollIntoView) {
      const target =
        match.range.startContainer.parentElement ??
        (match.range.startContainer as Element | null);
      target?.scrollIntoView({ block: 'center', inline: 'nearest' });
    }
  }

  // ---- snippets & minimap -------------------------------------------------

  snippetAt(index: number): SnippetParts | null {
    const match = this.ordered[index];
    if (!match) return null;
    const node = match.range.startContainer;
    const text = node.nodeValue ?? '';
    const start = match.range.startOffset;
    const end = match.range.endOffset;
    return {
      before: text.slice(Math.max(0, start - SNIPPET_CONTEXT), start),
      match: text.slice(start, end),
      after: text.slice(end, end + SNIPPET_CONTEXT),
    };
  }

  /** Term id for a match index (for snippet coloring). */
  termIdAt(index: number): string | null {
    return this.ordered[index]?.termId ?? null;
  }

  get matchCount(): number {
    return this.ordered.length;
  }

  get activeMatchIndex(): number {
    return this.activeIndex;
  }

  /** Compute vertical positions of matches for the minimap (bucketed). */
  minimapMarks(maxMarks: number, colorFor: (termId: string) => string): MinimapMark[] {
    const docHeight =
      document.documentElement.scrollHeight || document.body.scrollHeight || 1;
    const step = Math.max(1, Math.ceil(this.ordered.length / maxMarks));
    const marks: MinimapMark[] = [];
    for (let i = 0; i < this.ordered.length; i += step) {
      const match = this.ordered[i]!;
      const rect = match.range.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      marks.push({
        ratio: Math.min(1, Math.max(0, top / docHeight)),
        color: colorFor(match.termId),
      });
    }
    return marks;
  }

  destroy(): void {
    this.scanToken.cancelled = true;
    this.scheduleRescan.cancel();
    this.observer.stop();
    this.highlighter.clearAll();
    this.resultListeners.clear();
  }
}
