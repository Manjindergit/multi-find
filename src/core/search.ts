/**
 * Search matching engine — DOM-free and unit-testable.
 * Turns a term (query + options) into a compiled RegExp and finds match ranges
 * within plain strings.
 */
import type { TermOptions } from '../types/index';

export interface MatchRange {
  start: number;
  end: number;
}

/** Escape a string for literal use inside a RegExp. */
export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Build the raw regex source string for a term. */
export function buildPattern(query: string, options: TermOptions): string {
  let pattern = options.regex ? query : escapeRegExp(query);
  if (options.wholeWord) {
    // Use lookarounds so word boundaries work even when the query starts/ends
    // with non-word characters.
    pattern = `(?<![\\w])(?:${pattern})(?![\\w])`;
  }
  return pattern;
}

/**
 * Compile a term into a global RegExp, or return an Error describing why it
 * could not be compiled. Returns null for empty queries (no-op term).
 */
export function compileMatcher(
  query: string,
  options: TermOptions,
): RegExp | Error | null {
  if (query === '') return null;
  const flags = options.caseSensitive ? 'g' : 'gi';
  try {
    return new RegExp(buildPattern(query, options), flags);
  } catch (err) {
    return err instanceof Error ? err : new Error('Invalid pattern');
  }
}

/** Human-readable error for an invalid term, or null if it compiles. */
export function matcherError(query: string, options: TermOptions): string | null {
  const compiled = compileMatcher(query, options);
  return compiled instanceof Error ? compiled.message : null;
}

/**
 * Find all non-overlapping match ranges of `regex` within `text`.
 * Safely advances past zero-length matches to avoid infinite loops.
 */
export function findMatches(text: string, regex: RegExp): MatchRange[] {
  const ranges: MatchRange[] = [];
  // Always operate on a fresh, global copy so callers can reuse the regex.
  const re = new RegExp(
    regex.source,
    regex.flags.includes('g') ? regex.flags : regex.flags + 'g',
  );
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (match[0].length === 0) {
      re.lastIndex += 1; // avoid stalling on zero-width matches
      continue;
    }
    ranges.push({ start, end });
  }
  return ranges;
}
