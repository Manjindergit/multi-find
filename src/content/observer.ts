/**
 * PageObserver — triggers rescans when the page changes.
 * Combines a debounced MutationObserver with SPA route-change detection
 * (history API patch + popstate/hashchange).
 */
import { debounce, onIdle } from '../utils/index';

const LOCATION_EVENT = 'mf:locationchange';

/** Patch history.pushState/replaceState once to emit a location-change event. */
function installHistoryHook(): void {
  const w = window as unknown as { __mfHistoryHooked?: boolean };
  if (w.__mfHistoryHooked) return;
  w.__mfHistoryHooked = true;

  const fire = (): void => {
    window.dispatchEvent(new Event(LOCATION_EVENT));
  };
  const wrap = <T extends typeof history.pushState>(original: T): T =>
    function (this: History, ...args: Parameters<T>) {
      const result = original.apply(this, args);
      fire();
      return result;
    } as T;

  history.pushState = wrap(history.pushState);
  history.replaceState = wrap(history.replaceState);
}

export class PageObserver {
  private mutationObserver: MutationObserver | null = null;
  private debouncedChange: (() => void) & { cancel: () => void };
  private excludeHosts: Element[];

  constructor(
    private readonly onChange: () => void,
    debounceMs: number,
    excludeHosts: Element[] = [],
  ) {
    this.excludeHosts = excludeHosts;
    this.debouncedChange = debounce(() => onIdle(() => this.onChange()), debounceMs);
  }

  setExcludeHosts(hosts: Element[]): void {
    this.excludeHosts = hosts;
  }

  start(): void {
    if (!document.body) return;
    installHistoryHook();

    this.mutationObserver = new MutationObserver((mutations) => {
      if (this.isRelevant(mutations)) this.debouncedChange();
    });
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    window.addEventListener('popstate', this.onRoute);
    window.addEventListener('hashchange', this.onRoute);
    window.addEventListener(LOCATION_EVENT, this.onRoute);
  }

  stop(): void {
    this.debouncedChange.cancel();
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
    window.removeEventListener('popstate', this.onRoute);
    window.removeEventListener('hashchange', this.onRoute);
    window.removeEventListener(LOCATION_EVENT, this.onRoute);
  }

  private onRoute = (): void => {
    this.debouncedChange();
  };

  /** Ignore mutations that only touch our own injected UI hosts. */
  private isRelevant(mutations: MutationRecord[]): boolean {
    if (this.excludeHosts.length === 0) return true;
    for (const mutation of mutations) {
      const target = mutation.target as Node;
      const insideHost = this.excludeHosts.some(
        (host) => host === target || host.contains(target),
      );
      if (!insideHost) return true;
    }
    return false;
  }
}
