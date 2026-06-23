/**
 * Color utilities — palette, automatic assignment, and auto-contrast text color.
 * Pure and DOM-free so it is unit-testable.
 */

/** Distinct, reasonably high-contrast highlight backgrounds. */
export const PALETTE: readonly string[] = [
  '#ffd54f', // amber
  '#4fc3f7', // light blue
  '#81c784', // green
  '#ff8a65', // deep orange
  '#ba68c8', // purple
  '#f06292', // pink
  '#4db6ac', // teal
  '#fff176', // yellow
  '#9575cd', // deep purple
  '#7986cb', // indigo
  '#a1887f', // brown
  '#90a4ae', // blue grey
];

/** Parse a #rgb or #rrggbb hex string into [r, g, b] (0–255). */
export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) {
    // Fall back to mid-grey for invalid input rather than throwing.
    return [128, 128, 128];
  }
  const num = parseInt(h, 16);
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
}

/** Relative luminance per WCAG 2.x (0 = black, 1 = white). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Choose black or white text for best contrast against `bg`. */
export function contrastColor(bg: string): string {
  return relativeLuminance(bg) > 0.45 ? '#1a1a1a' : '#ffffff';
}

/**
 * Pick the next highlight color, preferring palette entries not already used.
 * Falls back to cycling through the palette by count when all are taken.
 */
export function assignColor(usedColors: readonly string[]): string {
  const used = new Set(usedColors.map((c) => c.toLowerCase()));
  for (const color of PALETTE) {
    if (!used.has(color.toLowerCase())) return color;
  }
  return PALETTE[usedColors.length % PALETTE.length]!;
}
