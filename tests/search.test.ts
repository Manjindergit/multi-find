import { describe, it, expect } from 'vitest';
import {
  escapeRegExp,
  buildPattern,
  compileMatcher,
  matcherError,
  findMatches,
} from '../src/core/search';
import type { TermOptions } from '../src/types/index';

const opts = (o: Partial<TermOptions> = {}): TermOptions => ({
  caseSensitive: false,
  wholeWord: false,
  regex: false,
  ...o,
});

const find = (text: string, query: string, o: Partial<TermOptions> = {}) => {
  const re = compileMatcher(query, opts(o));
  if (!(re instanceof RegExp)) throw new Error('expected regex');
  return findMatches(text, re);
};

describe('escapeRegExp', () => {
  it('escapes regex metacharacters', () => {
    expect(escapeRegExp('a.b*c+')).toBe('a\\.b\\*c\\+');
    expect(escapeRegExp('(x)[y]')).toBe('\\(x\\)\\[y\\]');
  });
});

describe('buildPattern', () => {
  it('escapes plain queries', () => {
    expect(buildPattern('a.b', opts())).toBe('a\\.b');
  });
  it('passes regex queries through', () => {
    expect(buildPattern('a.b', opts({ regex: true }))).toBe('a.b');
  });
  it('wraps whole-word with lookarounds', () => {
    expect(buildPattern('cat', opts({ wholeWord: true }))).toBe(
      '(?<![\\w])(?:cat)(?![\\w])',
    );
  });
});

describe('compileMatcher', () => {
  it('returns null for empty query', () => {
    expect(compileMatcher('', opts())).toBeNull();
  });
  it('returns an Error for invalid regex', () => {
    expect(compileMatcher('(', opts({ regex: true }))).toBeInstanceOf(Error);
  });
  it('respects case sensitivity flag', () => {
    const ci = compileMatcher('a', opts());
    const cs = compileMatcher('a', opts({ caseSensitive: true }));
    expect((ci as RegExp).flags).toContain('i');
    expect((cs as RegExp).flags).not.toContain('i');
  });
});

describe('matcherError', () => {
  it('is null for valid patterns', () => {
    expect(matcherError('abc', opts())).toBeNull();
  });
  it('is a message for invalid regex', () => {
    expect(matcherError('(', opts({ regex: true }))).toBeTypeOf('string');
  });
});

describe('findMatches', () => {
  it('finds case-insensitive matches by default', () => {
    expect(find('Cat cat CAT', 'cat')).toHaveLength(3);
  });
  it('respects case sensitivity', () => {
    expect(find('Cat cat CAT', 'cat', { caseSensitive: true })).toHaveLength(1);
  });
  it('matches whole words only', () => {
    expect(find('cat category cat', 'cat', { wholeWord: true })).toHaveLength(2);
  });
  it('supports regex', () => {
    const matches = find('a1 b2 c3', '[a-z]\\d', { regex: true });
    expect(matches).toHaveLength(3);
  });
  it('returns correct ranges', () => {
    const [first] = find('xx cat xx', 'cat');
    expect(first).toEqual({ start: 3, end: 6 });
  });
  it('does not stall on zero-width regex', () => {
    const matches = find('abc', 'x*', { regex: true });
    expect(Array.isArray(matches)).toBe(true);
    expect(matches).toHaveLength(0);
  });
});
