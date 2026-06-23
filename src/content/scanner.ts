/**
 * Scanner — walks page text nodes and produces match Ranges per term.
 * Time-sliced via requestIdleCallback and bounded by large-page safeguards.
 */
import type { Term } from '../types/index';
import { compileMatcher, findMatches } from '../core/search';
import { onIdle } from '../utils/index';

export interface OrderedMatch {
  termId: string;
  range: Range;
}

export interface ScanResult {
  rangesByTerm: Map<string, Range[]>;
  counts: Map<string, number>;
  ordered: OrderedMatch[];
  truncated: boolean;
}

export interface ScanOptions {
  maxNodes: number;
  maxMatches: number;
  /** Our injected UI host(s) to exclude from scanning. */
  excludeHosts: Element[];
}

export interface ScanToken {
  cancelled: boolean;
}

const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEXTAREA',
  'TITLE',
  'TEMPLATE',
]);

/** Collect candidate text nodes in document order, bounded by maxNodes. */
function collectTextNodes(maxNodes: number, excludeHosts: Element[]): Text[] {
  const nodes: Text[] = [];
  const root = document.body;
  if (!root) return nodes;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node: Node): number {
      const text = node.nodeValue;
      if (!text || text.trim() === '') return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      for (const host of excludeHosts) {
        if (host.contains(node)) return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
    if (nodes.length >= maxNodes) break;
  }
  return nodes;
}

/**
 * Scan the page for all enabled terms. Resolves once scanning completes or is
 * cancelled (via the returned token being marked cancelled by the caller).
 */
export function scan(
  terms: Term[],
  options: ScanOptions,
  token: ScanToken,
): Promise<ScanResult> {
  const rangesByTerm = new Map<string, Range[]>();
  const counts = new Map<string, number>();
  const ordered: OrderedMatch[] = [];

  // Compile matchers once for enabled, valid, non-empty terms.
  const matchers: { termId: string; regex: RegExp }[] = [];
  for (const term of terms) {
    if (!term.enabled || term.query === '') continue;
    const compiled = compileMatcher(term.query, term.options);
    if (compiled instanceof RegExp) {
      matchers.push({ termId: term.id, regex: compiled });
      rangesByTerm.set(term.id, []);
      counts.set(term.id, 0);
    }
  }

  if (matchers.length === 0) {
    return Promise.resolve({ rangesByTerm, counts, ordered, truncated: false });
  }

  const nodes = collectTextNodes(options.maxNodes, options.excludeHosts);
  let truncated = nodes.length >= options.maxNodes;
  let total = 0;

  return new Promise<ScanResult>((resolve) => {
    let cursor = 0;

    const finish = (): void =>
      resolve({ rangesByTerm, counts, ordered, truncated });

    const processChunk = (deadline: { timeRemaining: () => number }): void => {
      if (token.cancelled) {
        finish();
        return;
      }
      while (cursor < nodes.length) {
        const node = nodes[cursor]!;
        cursor += 1;
        const text = node.nodeValue ?? '';

        // Gather matches from all terms in this node, then sort by position so
        // navigation order follows the document.
        const local: OrderedMatch[] = [];
        for (const { termId, regex } of matchers) {
          for (const m of findMatches(text, regex)) {
            const range = document.createRange();
            try {
              range.setStart(node, m.start);
              range.setEnd(node, m.end);
            } catch {
              continue;
            }
            local.push({ termId, range });
          }
        }
        local.sort((a, b) => a.range.startOffset - b.range.startOffset);

        for (const match of local) {
          if (total >= options.maxMatches) {
            truncated = true;
            finish();
            return;
          }
          rangesByTerm.get(match.termId)!.push(match.range);
          counts.set(match.termId, (counts.get(match.termId) ?? 0) + 1);
          ordered.push(match);
          total += 1;
        }

        // Yield back to the browser when our idle slice is exhausted.
        if (cursor < nodes.length && deadline.timeRemaining() <= 1) {
          onIdle(processChunk);
          return;
        }
      }
      finish();
    };

    onIdle(processChunk);
  });
}
