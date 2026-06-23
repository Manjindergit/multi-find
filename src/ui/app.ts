/**
 * UiController — renders the Shadow-DOM UI (pinned panel + centered overview)
 * from the shared SessionModel and Engine results. Uses event delegation so
 * listeners survive re-renders, and preserves input focus/caret across them.
 */
import type {
  Settings,
  HighlightSet,
  Watchlist,
  TermOptions,
} from '../types/index';
import type { SessionModel, SessionSnapshot } from '../core/session';
import type { EngineImpl, EngineResult, MinimapMark } from '../content/engine';
import { UI_STYLES } from './styles';
import { currentHost } from '../utils/index';
import { matcherError } from '../core/search';
import * as store from '../storage/index';

type PanelMode = 'main' | 'sets' | 'watchlists' | 'settings';

const OPT_LABELS: Record<keyof TermOptions, { label: string; title: string }> = {
  caseSensitive: { label: 'Aa', title: 'Case sensitive' },
  wholeWord: { label: 'W', title: 'Whole word' },
  regex: { label: '.*', title: 'Regular expression' },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export class UiController {
  private host: HTMLDivElement;
  private shadow: ShadowRoot;
  private visible = false;
  private mode: PanelMode = 'main';

  private snapshot: SessionSnapshot;
  private result: EngineResult;
  private sets: HighlightSet[] = [];
  private watchlists: Watchlist[] = [];

  private cachedMarks: MinimapMark[] = [];
  private cachedMarksTotal = -1;

  constructor(
    private readonly session: SessionModel,
    private readonly engine: EngineImpl,
    private settings: Settings,
  ) {
    this.host = document.createElement('div');
    this.host.setAttribute('data-multi-find-ui', '');
    this.shadow = this.host.attachShadow({ mode: 'open' });
    this.snapshot = session.getSnapshot();
    this.result = {
      counts: new Map(),
      total: 0,
      truncated: false,
      position: { index: 0, total: 0 },
      supported: true,
    };

    document.documentElement.appendChild(this.host);
    this.session.subscribe((s) => {
      this.snapshot = s;
      if (this.visible) this.render();
    });
    this.engine.onResults((r) => {
      this.result = r;
      if (this.visible) this.render();
    });

    this.shadow.addEventListener('click', this.onClick);
    this.shadow.addEventListener('input', this.onInput);
    this.shadow.addEventListener('change', this.onChange);
    this.shadow.addEventListener('keydown', this.onKeyDown as EventListener);
    window.addEventListener('scroll', this.onScroll, true);
  }

  get hostElement(): Element {
    return this.host;
  }

  setSettings(settings: Settings): void {
    this.settings = settings;
  }

  isVisible(): boolean {
    return this.visible;
  }

  // ---- visibility ---------------------------------------------------------

  open(): void {
    this.visible = true;
    if (this.snapshot.terms.length === 0) this.session.addTerm('');
    this.render();
    this.focusFirstInput();
  }

  close(): void {
    this.visible = false;
    this.shadow.innerHTML = '';
  }

  toggle(): void {
    if (this.visible) this.close();
    else this.open();
  }

  private focusFirstInput(): void {
    requestAnimationFrame(() => {
      const input = this.shadow.querySelector<HTMLInputElement>(
        '[data-focus^="query:"], [data-focus="add"]',
      );
      input?.focus();
    });
  }

  // ---- rendering ----------------------------------------------------------

  private render(): void {
    if (!this.visible) return;
    const focusState = this.captureFocus();
    this.shadow.innerHTML = `<style>${UI_STYLES}</style>${this.renderMinimap()}${this.renderRoot()}`;
    this.restoreFocus(focusState);
  }

  private renderRoot(): string {
    const view = this.snapshot.viewMode;
    const dialogAttrs =
      view === 'overview'
        ? 'role="dialog" aria-modal="false" aria-label="Multi-Find overview"'
        : 'role="region" aria-label="Multi-Find"';
    return `
      <div class="mf-root" data-view="${view}" ${dialogAttrs}>
        ${this.renderHeader()}
        <div class="mf-body">
          ${this.renderMain()}
          ${this.mode === 'sets' ? this.renderSets() : ''}
          ${this.mode === 'watchlists' ? this.renderWatchlists() : ''}
          ${this.mode === 'settings' ? this.renderSettings() : ''}
          ${view === 'overview' ? this.renderSnippets() : ''}
        </div>
        ${this.renderFooter()}
      </div>`;
  }

  private renderHeader(): string {
    const view = this.snapshot.viewMode;
    const nextView = view === 'panel' ? 'overview' : 'panel';
    return `
      <div class="mf-header">
        <span class="mf-title">Multi-Find</span>
        <button class="mf-icon-btn" data-action="toggle-view"
          title="Switch to ${nextView}" aria-label="Switch to ${nextView} view">⇄</button>
        <button class="mf-icon-btn" data-action="close"
          title="Close (Esc)" aria-label="Close Multi-Find">✕</button>
      </div>`;
  }

  private renderMain(): string {
    if (this.mode !== 'main') return '';
    const unsupported = !this.result.supported
      ? `<div class="mf-warn">Highlighting needs Chrome 105+. Counts still work.</div>`
      : '';
    const truncated = this.result.truncated
      ? `<div class="mf-warn">Showing first ${this.settings.maxMatchesPerPage} matches (page is large).</div>`
      : '';
    return `
      ${unsupported}
      <div class="mf-add-row">
        <input class="mf-input" type="search" placeholder="Add a search term…"
          data-field="add" data-focus="add" aria-label="Add a search term" />
        <button class="mf-btn mf-btn-primary" data-action="add-term">Add</button>
      </div>
      <div class="mf-terms">${this.snapshot.terms.map((t) => this.renderTerm(t)).join('')}</div>
      ${truncated}`;
  }

  private renderTerm(term: SessionSnapshot['terms'][number]): string {
    const count = this.result.counts.get(term.id);
    const error = term.query === '' ? null : matcherError(term.query, term.options);
    const opts = (Object.keys(OPT_LABELS) as (keyof TermOptions)[])
      .map((key) => {
        const meta = OPT_LABELS[key];
        const pressed = term.options[key];
        return `<button class="mf-opt" data-action="opt" data-id="${term.id}" data-opt="${key}"
          aria-pressed="${pressed}" title="${meta.title}" aria-label="${meta.title}">${meta.label}</button>`;
      })
      .join('');
    const countLabel = error
      ? `<span class="mf-danger" title="${escapeHtml(error)}">⚠</span>`
      : count === undefined
        ? ''
        : `${count}`;
    return `
      <div class="mf-term" data-disabled="${!term.enabled}">
        <input class="mf-swatch" type="color" value="${escapeHtml(term.color)}"
          data-action="color" data-id="${term.id}" title="Highlight color"
          aria-label="Highlight color for ${escapeHtml(term.query || 'term')}" />
        <input class="mf-input mf-query" type="text" value="${escapeHtml(term.query)}"
          data-field="query" data-id="${term.id}" data-focus="query:${term.id}"
          placeholder="search term" aria-label="Search term" />
        <div class="mf-term-actions">
          <button class="mf-icon-btn" data-action="toggle-enabled" data-id="${term.id}"
            title="${term.enabled ? 'Disable' : 'Enable'}"
            aria-label="${term.enabled ? 'Disable term' : 'Enable term'}">${term.enabled ? '◉' : '○'}</button>
          <button class="mf-icon-btn mf-danger" data-action="remove" data-id="${term.id}"
            title="Remove" aria-label="Remove term">✕</button>
        </div>
        <div class="mf-opts">${opts}</div>
        <div class="mf-count">${countLabel}</div>
      </div>`;
  }

  private renderSnippets(): string {
    const total = this.result.total;
    if (total === 0) return `<div class="mf-note">No matches.</div>`;
    const limit = Math.min(total, 100);
    const colorFor = (id: string): string =>
      this.snapshot.terms.find((t) => t.id === id)?.color ?? '#ffd54f';
    let html = `<div class="mf-section"><h3>Matches (${total})</h3><div class="mf-snippets">`;
    for (let i = 0; i < limit; i += 1) {
      const snippet = this.engine.snippetAt(i);
      if (!snippet) continue;
      const termId = this.engine.termIdAt(i) ?? '';
      const color = colorFor(termId);
      const active = i === this.engine.activeMatchIndex;
      html += `<button class="mf-snippet" data-action="jump" data-index="${i}" aria-current="${active}">
        <span class="mf-dim">…${escapeHtml(snippet.before)}</span><mark style="background:${color}">${escapeHtml(snippet.match)}</mark><span class="mf-dim">${escapeHtml(snippet.after)}…</span>
      </button>`;
    }
    if (total > limit) html += `<div class="mf-note">+${total - limit} more…</div>`;
    html += `</div></div>`;
    return html;
  }

  private renderSets(): string {
    const items =
      this.sets.length === 0
        ? `<div class="mf-note">No saved sets yet.</div>`
        : this.sets
            .map(
              (s) => `<div class="mf-list-item">
                <span class="mf-name">${escapeHtml(s.name)} <span class="mf-dim">(${s.terms.length})</span></span>
                <button class="mf-btn" data-action="apply-set" data-id="${s.id}">Apply</button>
                <button class="mf-icon-btn mf-danger" data-action="delete-set" data-id="${s.id}" aria-label="Delete set">✕</button>
              </div>`,
            )
            .join('');
    return `
      <div class="mf-section">
        <h3>Saved sets</h3>
        <div class="mf-row">
          <input class="mf-input" data-field="set-name" data-focus="set-name" placeholder="Name this set…" aria-label="Set name" />
          <button class="mf-btn mf-btn-primary" data-action="save-set">Save current</button>
        </div>
        <div class="mf-list">${items}</div>
      </div>`;
  }

  private renderWatchlists(): string {
    const host = currentHost();
    const relevant = this.watchlists.filter(
      (w) => w.domain === null || w.domain === host,
    );
    const items =
      relevant.length === 0
        ? `<div class="mf-note">No watchlists for this page.</div>`
        : relevant
            .map(
              (w) => `<div class="mf-list-item">
                <span class="mf-name">${escapeHtml(w.name)} <span class="mf-dim">${w.domain ? escapeHtml(w.domain) : 'all sites'} · ${w.terms.length}</span></span>
                <button class="mf-btn" data-action="apply-watchlist" data-id="${w.id}">Apply</button>
                <button class="mf-icon-btn mf-danger" data-action="delete-watchlist" data-id="${w.id}" aria-label="Delete watchlist">✕</button>
              </div>`,
            )
            .join('');
    return `
      <div class="mf-section">
        <h3>Watchlists</h3>
        <div class="mf-row">
          <input class="mf-input" data-field="wl-name" data-focus="wl-name" placeholder="Name…" aria-label="Watchlist name" />
        </div>
        <div class="mf-row">
          <label class="mf-check"><input type="radio" name="wl-scope" value="domain" data-field="wl-scope" checked /> This site (${escapeHtml(host || 'unknown')})</label>
          <label class="mf-check"><input type="radio" name="wl-scope" value="global" data-field="wl-scope" /> All sites</label>
          <button class="mf-btn mf-btn-primary" data-action="save-watchlist">Save current</button>
        </div>
        <div class="mf-list">${items}</div>
      </div>`;
  }

  private renderSettings(): string {
    const s = this.settings;
    return `
      <div class="mf-section">
        <h3>Settings</h3>
        <div class="mf-row">
          <span class="mf-label">Max matches</span>
          <input class="mf-num" type="number" min="100" step="100" value="${s.maxMatchesPerPage}" data-field="max-matches" />
        </div>
        <div class="mf-row">
          <span class="mf-label">Max nodes</span>
          <input class="mf-num" type="number" min="1000" step="1000" value="${s.maxNodes}" data-field="max-nodes" />
        </div>
        <div class="mf-row">
          <span class="mf-label">Rescan delay (ms)</span>
          <input class="mf-num" type="number" min="0" step="50" value="${s.rescanDebounceMs}" data-field="rescan-ms" />
        </div>
        <div class="mf-row">
          <button class="mf-btn mf-btn-primary" data-action="save-settings">Save settings</button>
          <button class="mf-btn" data-action="export">Export JSON</button>
          <button class="mf-btn" data-action="import">Import JSON</button>
          <input type="file" accept="application/json,.json" data-field="import-file" style="display:none" />
        </div>
      </div>`;
  }

  private renderFooter(): string {
    const pos = this.result.position;
    const posText = pos.total === 0 ? 'No matches' : `${pos.index} / ${pos.total}`;
    const navDisabled = pos.total === 0 ? 'disabled' : '';
    const tab = (mode: PanelMode, label: string): string =>
      `<button class="mf-btn" data-action="mode" data-mode="${mode}" aria-pressed="${this.mode === mode}">${label}</button>`;
    return `
      <div class="mf-footer">
        <span class="mf-pos" aria-live="polite">${posText}</span>
        <button class="mf-icon-btn" data-action="prev" title="Previous (Shift+Enter)" aria-label="Previous match" ${navDisabled}>▲</button>
        <button class="mf-icon-btn" data-action="next" title="Next (Enter)" aria-label="Next match" ${navDisabled}>▼</button>
        ${tab('sets', 'Sets')}
        ${tab('watchlists', 'Lists')}
        ${tab('settings', '⚙')}
        <button class="mf-btn" data-action="clear" title="Remove all terms">Clear</button>
      </div>`;
  }

  private renderMinimap(): string {
    if (this.snapshot.viewMode !== 'panel' && this.snapshot.viewMode !== 'overview') {
      return '';
    }
    if (this.result.total === 0) return '';
    const colorFor = (id: string): string =>
      this.snapshot.terms.find((t) => t.id === id)?.color ?? '#ffd54f';
    if (this.cachedMarksTotal !== this.result.total) {
      this.cachedMarks = this.engine.minimapMarks(160, colorFor);
      this.cachedMarksTotal = this.result.total;
    }
    const docHeight =
      document.documentElement.scrollHeight || document.body.scrollHeight || 1;
    const cursorRatio = Math.min(1, (window.scrollY + window.innerHeight / 2) / docHeight);
    const marks = this.cachedMarks
      .map(
        (m) =>
          `<div class="mf-minimap-mark" style="top:${(m.ratio * 100).toFixed(2)}%;background:${m.color}"></div>`,
      )
      .join('');
    return `<div class="mf-minimap" data-action="minimap" title="Match density — click to jump" role="presentation">
      ${marks}
      <div class="mf-minimap-cursor" style="top:${(cursorRatio * 100).toFixed(2)}%"></div>
    </div>`;
  }

  // ---- focus preservation -------------------------------------------------

  private captureFocus(): { key: string; start: number; end: number } | null {
    const active = this.shadow.activeElement as HTMLInputElement | null;
    if (!active || !active.dataset.focus) return null;
    const isText = active.type === 'text' || active.type === 'search' || active.type === 'number';
    return {
      key: active.dataset.focus,
      start: isText ? (active.selectionStart ?? 0) : 0,
      end: isText ? (active.selectionEnd ?? 0) : 0,
    };
  }

  private restoreFocus(state: { key: string; start: number; end: number } | null): void {
    if (!state) return;
    const el = this.shadow.querySelector<HTMLInputElement>(
      `[data-focus="${state.key.replace(/"/g, '\\"')}"]`,
    );
    if (!el) return;
    el.focus();
    try {
      el.setSelectionRange(state.start, state.end);
    } catch {
      /* not a text field */
    }
  }

  // ---- event handlers -----------------------------------------------------

  private onClick = (event: Event): void => {
    const target = (event.target as HTMLElement).closest('[data-action]');
    if (!(target instanceof HTMLElement)) {
      // Minimap clicks land on the container or marks.
      return;
    }
    const action = target.dataset.action;
    const id = target.dataset.id;
    switch (action) {
      case 'close':
        this.close();
        break;
      case 'toggle-view':
        this.session.toggleViewMode();
        break;
      case 'add-term':
        this.addFromInput();
        break;
      case 'remove':
        if (id) this.session.removeTerm(id);
        break;
      case 'toggle-enabled':
        if (id) this.session.toggleEnabled(id);
        break;
      case 'opt':
        if (id && target.dataset.opt) {
          const key = target.dataset.opt as keyof TermOptions;
          const term = this.snapshot.terms.find((t) => t.id === id);
          if (term) this.session.setOption(id, key, !term.options[key]);
        }
        break;
      case 'next':
        this.engine.next();
        break;
      case 'prev':
        this.engine.prev();
        break;
      case 'jump':
        if (target.dataset.index) this.engine.jumpTo(Number(target.dataset.index));
        break;
      case 'clear':
        this.session.clear();
        break;
      case 'mode':
        void this.switchMode(target.dataset.mode as PanelMode);
        break;
      case 'save-set':
        void this.saveSet();
        break;
      case 'apply-set':
        if (id) this.applySet(id);
        break;
      case 'delete-set':
        if (id) void this.deleteSet(id);
        break;
      case 'save-watchlist':
        void this.saveWatchlist();
        break;
      case 'apply-watchlist':
        if (id) this.applyWatchlist(id);
        break;
      case 'delete-watchlist':
        if (id) void this.deleteWatchlist(id);
        break;
      case 'save-settings':
        void this.saveSettingsFromForm();
        break;
      case 'export':
        void this.exportJson();
        break;
      case 'import':
        this.shadow.querySelector<HTMLInputElement>('[data-field="import-file"]')?.click();
        break;
      case 'minimap':
        this.onMinimapClick(event as MouseEvent);
        break;
      default:
        break;
    }
  };

  private onInput = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    const field = target.dataset.field;
    if (field === 'query' && target.dataset.id) {
      this.session.setQuery(target.dataset.id, target.value);
    }
  };

  private onChange = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    const action = target.dataset.action;
    if (action === 'color' && target.dataset.id) {
      this.session.updateTerm(target.dataset.id, { color: target.value });
    }
    if (target.dataset.field === 'import-file') {
      const file = target.files?.[0];
      if (file) void this.importJson(file);
    }
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.close();
      return;
    }
    const target = event.target as HTMLInputElement;
    if (event.key === 'Enter') {
      if (target.dataset.field === 'add') {
        event.preventDefault();
        this.addFromInput();
      } else if (target.dataset.field === 'query') {
        event.preventDefault();
        if (event.shiftKey) this.engine.prev();
        else this.engine.next();
      }
    }
  };

  private onScroll = (): void => {
    if (this.visible && this.result.total > 0) {
      // Cheap update of the minimap cursor only.
      const cursor = this.shadow.querySelector<HTMLElement>('.mf-minimap-cursor');
      if (cursor) {
        const docHeight =
          document.documentElement.scrollHeight || document.body.scrollHeight || 1;
        const ratio = Math.min(1, (window.scrollY + window.innerHeight / 2) / docHeight);
        cursor.style.top = `${(ratio * 100).toFixed(2)}%`;
      }
    }
  };

  private onMinimapClick(event: MouseEvent): void {
    const minimap = this.shadow.querySelector<HTMLElement>('.mf-minimap');
    if (!minimap || this.result.total === 0) return;
    const rect = minimap.getBoundingClientRect();
    const ratio = (event.clientY - rect.top) / rect.height;
    const index = Math.min(
      this.result.total - 1,
      Math.max(0, Math.round(ratio * (this.result.total - 1))),
    );
    this.engine.jumpTo(index);
  }

  // ---- actions ------------------------------------------------------------

  private addFromInput(): void {
    const input = this.shadow.querySelector<HTMLInputElement>('[data-field="add"]');
    const value = input?.value.trim() ?? '';
    if (value === '') {
      this.session.addTerm('');
    } else {
      this.session.addTerm(value);
      if (input) input.value = '';
    }
    this.focusFirstInput();
  }

  private async switchMode(mode: PanelMode): Promise<void> {
    this.mode = this.mode === mode ? 'main' : mode;
    if (this.mode === 'sets') this.sets = await store.loadSets();
    if (this.mode === 'watchlists') this.watchlists = await store.loadWatchlists();
    this.render();
  }

  private async saveSet(): Promise<void> {
    const name = this.fieldValue('set-name') || `Set ${this.sets.length + 1}`;
    await store.saveSet(name, this.session.serializeTerms());
    this.sets = await store.loadSets();
    this.render();
  }

  private applySet(id: string): void {
    const set = this.sets.find((s) => s.id === id);
    if (set) {
      this.session.loadTerms(set.terms);
      this.mode = 'main';
      this.render();
    }
  }

  private async deleteSet(id: string): Promise<void> {
    await store.deleteSet(id);
    this.sets = await store.loadSets();
    this.render();
  }

  private async saveWatchlist(): Promise<void> {
    const name = this.fieldValue('wl-name') || `List ${this.watchlists.length + 1}`;
    const scope = this.shadow.querySelector<HTMLInputElement>(
      'input[name="wl-scope"]:checked',
    )?.value;
    const domain = scope === 'global' ? null : currentHost();
    await store.saveWatchlist(name, domain, this.session.serializeTerms());
    this.watchlists = await store.loadWatchlists();
    this.render();
  }

  private applyWatchlist(id: string): void {
    const list = this.watchlists.find((w) => w.id === id);
    if (list) {
      this.session.loadTerms(list.terms);
      this.mode = 'main';
      this.render();
    }
  }

  private async deleteWatchlist(id: string): Promise<void> {
    await store.deleteWatchlist(id);
    this.watchlists = await store.loadWatchlists();
    this.render();
  }

  private async saveSettingsFromForm(): Promise<void> {
    const next: Settings = {
      ...this.settings,
      maxMatchesPerPage: this.numField('max-matches', this.settings.maxMatchesPerPage),
      maxNodes: this.numField('max-nodes', this.settings.maxNodes),
      rescanDebounceMs: this.numField('rescan-ms', this.settings.rescanDebounceMs),
      view: this.snapshot.viewMode,
    };
    this.settings = next;
    await store.saveSettings(next);
    this.render();
  }

  private async exportJson(): Promise<void> {
    const [settings, sets, watchlists] = await Promise.all([
      store.loadSettings(),
      store.loadSets(),
      store.loadWatchlists(),
    ]);
    const bundle = store.buildExportBundle(settings, sets, watchlists);
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'multi-find-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  private async importJson(file: File): Promise<void> {
    try {
      const text = await file.text();
      const parsed = store.parseImportBundle(text);
      await store.applyImport(parsed);
      if (parsed.settings) {
        this.settings = await store.loadSettings();
      }
      this.sets = await store.loadSets();
      this.watchlists = await store.loadWatchlists();
      this.render();
    } catch (err) {
      this.showImportError(err instanceof Error ? err.message : 'Import failed.');
    }
  }

  private showImportError(message: string): void {
    const body = this.shadow.querySelector('.mf-body');
    if (!body) return;
    const note = document.createElement('div');
    note.className = 'mf-warn';
    note.textContent = `Import error: ${message}`;
    body.prepend(note);
  }

  private fieldValue(field: string): string {
    return (
      this.shadow
        .querySelector<HTMLInputElement>(`[data-field="${field}"]`)
        ?.value.trim() ?? ''
    );
  }

  private numField(field: string, fallback: number): number {
    const raw = this.shadow.querySelector<HTMLInputElement>(`[data-field="${field}"]`)?.value;
    const num = raw ? Number(raw) : NaN;
    return Number.isFinite(num) && num >= 0 ? num : fallback;
  }

  destroy(): void {
    window.removeEventListener('scroll', this.onScroll, true);
    this.host.remove();
  }
}
