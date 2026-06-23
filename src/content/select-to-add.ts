/**
 * SelectToAdd — when the user selects page text, offer a floating chip to add
 * it as a search term. Also exposes addCurrentSelection() for the keyboard
 * command. The chip lives in its own shadow root so page styles can't affect it.
 */
const MAX_SELECTION_LENGTH = 200;

export class SelectToAdd {
  private host: HTMLDivElement | null = null;
  private button: HTMLButtonElement | null = null;
  private running = false;

  constructor(private readonly onAdd: (text: string) => void) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    document.addEventListener('mouseup', this.onMouseUp, true);
    document.addEventListener('scroll', this.hide, true);
    document.addEventListener('keydown', this.onKeyDown, true);
  }

  stop(): void {
    this.running = false;
    document.removeEventListener('mouseup', this.onMouseUp, true);
    document.removeEventListener('scroll', this.hide, true);
    document.removeEventListener('keydown', this.onKeyDown, true);
    this.host?.remove();
    this.host = null;
    this.button = null;
  }

  /** Read the current selection and add it as a term, if any. */
  addCurrentSelection(): boolean {
    const text = this.selectedText();
    if (!text) return false;
    this.onAdd(text);
    this.hide();
    return true;
  }

  get host_element(): Element | null {
    return this.host;
  }

  private selectedText(): string | null {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return null;
    const text = selection.toString().trim();
    if (text === '' || text.length > MAX_SELECTION_LENGTH) return null;
    return text;
  }

  private onMouseUp = (event: MouseEvent): void => {
    // Ignore clicks on our own chip.
    if (this.host && event.composedPath().includes(this.host)) return;
    const text = this.selectedText();
    if (!text) {
      this.hide();
      return;
    }
    const selection = window.getSelection();
    const rect = selection?.getRangeAt(0).getBoundingClientRect();
    if (!rect) return;
    this.show(rect, text);
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') this.hide();
  };

  private ensureHost(): HTMLButtonElement {
    if (this.button && this.host?.isConnected) return this.button;
    const host = document.createElement('div');
    host.setAttribute('data-multi-find-chip', '');
    host.style.cssText = 'position:absolute;z-index:2147483646;top:0;left:0;';
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      button{font:600 12px/1 system-ui,sans-serif;color:#fff;background:#1a73e8;
        border:none;border-radius:6px;padding:6px 10px;cursor:pointer;
        box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;gap:6px;align-items:center;}
      button:hover{background:#1666d0;}
      button:focus-visible{outline:2px solid #fff;outline-offset:1px;}
    `;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '+ Multi-Find';
    button.setAttribute('aria-label', 'Add selection as a Multi-Find term');
    button.addEventListener('mousedown', (e) => e.preventDefault());
    button.addEventListener('click', () => {
      const text = this.selectedText();
      if (text) this.onAdd(text);
      this.hide();
    });
    shadow.append(style, button);
    document.documentElement.appendChild(host);
    this.host = host;
    this.button = button;
    return button;
  }

  private show(rect: DOMRect, _text: string): void {
    this.ensureHost();
    if (!this.host) return;
    const top = rect.bottom + window.scrollY + 6;
    const left = rect.left + window.scrollX;
    this.host.style.top = `${Math.max(0, top)}px`;
    this.host.style.left = `${Math.max(0, left)}px`;
    this.host.style.display = 'block';
  }

  private hide = (): void => {
    if (this.host) this.host.style.display = 'none';
  };
}
