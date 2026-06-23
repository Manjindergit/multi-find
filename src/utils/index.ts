/** Small shared, side-effect-free helpers. */

/** Debounce a function by `wait` ms (leading edge off, trailing edge on). */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number,
): ((...args: A) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: A): void => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, wait);
  };
  debounced.cancel = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return debounced;
}

/** requestIdleCallback with a setTimeout fallback for unsupported envs. */
export function onIdle(
  cb: (deadline: { timeRemaining: () => number }) => void,
  timeout = 200,
): void {
  const ric = (globalThis as { requestIdleCallback?: typeof requestIdleCallback })
    .requestIdleCallback;
  if (typeof ric === 'function') {
    ric(cb as IdleRequestCallback, { timeout });
  } else {
    setTimeout(() => cb({ timeRemaining: () => 16 }), 0);
  }
}

/** Clamp a number into the inclusive [min, max] range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Current page hostname, or empty string if unavailable. */
export function currentHost(): string {
  try {
    return location.hostname;
  } catch {
    return '';
  }
}

/** Create an element with attributes and children in one call. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) {
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}
