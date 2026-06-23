/**
 * Highlighter — paints matches using the CSS Custom Highlight API.
 *
 * This never mutates the page DOM (no wrapping <mark> elements), which keeps
 * highlighting fast, reflow-free, and safe on complex / SPA pages. Requires
 * Chrome 105+ (declared in the manifest).
 */

const STYLE_ID = 'multi-find-highlight-styles';
const TERM_PREFIX = 'mf-term-';
const ACTIVE_NAME = 'mf-active';

export interface TermHighlight {
  id: string;
  color: string;
  textColor: string;
  ranges: Range[];
}

// Minimal structural types so we don't depend on lib.dom Highlight typings.
interface HighlightInstance {
  priority: number;
}
interface HighlightConstructor {
  new (...ranges: Range[]): HighlightInstance;
}
interface HighlightRegistryLike {
  set(name: string, highlight: HighlightInstance): void;
  delete(name: string): boolean;
}

interface HighlightApi {
  Highlight: HighlightConstructor;
  registry: HighlightRegistryLike;
}

function getApi(): HighlightApi | null {
  const g = globalThis as unknown as {
    Highlight?: HighlightConstructor;
    CSS?: { highlights?: HighlightRegistryLike };
  };
  if (typeof g.Highlight === 'function' && g.CSS?.highlights) {
    return { Highlight: g.Highlight, registry: g.CSS.highlights };
  }
  return null;
}

/** Sanitize a term id into a valid CSS custom-ident. */
function highlightName(id: string): string {
  return TERM_PREFIX + id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export class Highlighter {
  private api = getApi();
  private styleEl: HTMLStyleElement | null = null;
  private activeNames = new Set<string>();

  isSupported(): boolean {
    return this.api !== null;
  }

  private ensureStyle(): HTMLStyleElement {
    if (this.styleEl && this.styleEl.isConnected) return this.styleEl;
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      (document.head ?? document.documentElement).appendChild(style);
    }
    this.styleEl = style;
    return style;
  }

  /** Replace all term highlights with the given set. */
  render(terms: TermHighlight[]): void {
    const api = this.api;
    if (!api) return;
    this.clearTerms();

    const rules: string[] = [];
    for (const term of terms) {
      if (term.ranges.length === 0) continue;
      const name = highlightName(term.id);
      const highlight = new api.Highlight(...term.ranges);
      highlight.priority = 1;
      api.registry.set(name, highlight);
      this.activeNames.add(name);
      rules.push(
        `::highlight(${name}){background-color:${term.color};color:${term.textColor};border-radius:2px;}`,
      );
    }
    // Active match paints on top of any term highlight.
    rules.push(
      `::highlight(${ACTIVE_NAME}){background-color:#1a73e8;color:#ffffff;}`,
    );
    this.ensureStyle().textContent = rules.join('\n');
  }

  /** Set (or clear) the single active-match highlight. */
  setActive(range: Range | null): void {
    const api = this.api;
    if (!api) return;
    if (range) {
      const highlight = new api.Highlight(range);
      highlight.priority = 10;
      api.registry.set(ACTIVE_NAME, highlight);
    } else {
      api.registry.delete(ACTIVE_NAME);
    }
  }

  private clearTerms(): void {
    if (!this.api) return;
    for (const name of this.activeNames) this.api.registry.delete(name);
    this.activeNames.clear();
  }

  /** Remove all highlights and styles. */
  clearAll(): void {
    if (this.api) {
      this.clearTerms();
      this.api.registry.delete(ACTIVE_NAME);
    }
    if (this.styleEl) {
      this.styleEl.remove();
      this.styleEl = null;
    }
  }
}
