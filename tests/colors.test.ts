import { describe, it, expect } from 'vitest';
import {
  PALETTE,
  hexToRgb,
  relativeLuminance,
  contrastColor,
  assignColor,
} from '../src/core/colors';

describe('hexToRgb', () => {
  it('parses 6-digit hex', () => {
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
    expect(hexToRgb('#1a73e8')).toEqual([26, 115, 232]);
  });
  it('expands 3-digit hex', () => {
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
    expect(hexToRgb('#0a0')).toEqual([0, 170, 0]);
  });
  it('falls back to grey for invalid input', () => {
    expect(hexToRgb('nope')).toEqual([128, 128, 128]);
  });
});

describe('relativeLuminance', () => {
  it('is 1 for white and 0 for black', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
  });
});

describe('contrastColor', () => {
  it('uses dark text on light backgrounds', () => {
    expect(contrastColor('#ffffff')).toBe('#1a1a1a');
    expect(contrastColor('#fff176')).toBe('#1a1a1a');
  });
  it('uses light text on dark backgrounds', () => {
    expect(contrastColor('#000000')).toBe('#ffffff');
    expect(contrastColor('#1a73e8')).toBe('#ffffff');
  });
});

describe('assignColor', () => {
  it('returns the first palette color when none used', () => {
    expect(assignColor([])).toBe(PALETTE[0]);
  });
  it('skips already-used colors', () => {
    expect(assignColor([PALETTE[0]!])).toBe(PALETTE[1]);
  });
  it('cycles once the palette is exhausted', () => {
    const all = [...PALETTE];
    expect(assignColor(all)).toBe(PALETTE[all.length % PALETTE.length]);
  });
});
