import type { PlayerColor } from '@/types/ui';

const HUE_COUNT = 360;
const SATURATION = 0.74;
const TARGET_LUMINANCE = [0.18, 0.16, 0.2] as const;

function hashName(name: string): number {
  let hash = 2166136261;
  for (let i = 0; i < name.length; i++) {
    hash = Math.imul(hash ^ name.charCodeAt(i), 16777619);
  }
  return hash >>> 0;
}

function hslToRgb(hue: number, saturation: number, lightness: number): [number, number, number] {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const hueSector = hue / 60;
  const x = chroma * (1 - Math.abs((hueSector % 2) - 1));
  const offset = lightness - chroma / 2;
  const sector = Math.floor(hueSector);
  const rgb = sector === 0 ? [chroma, x, 0]
    : sector === 1 ? [x, chroma, 0]
      : sector === 2 ? [0, chroma, x]
        : sector === 3 ? [0, x, chroma]
          : sector === 4 ? [x, 0, chroma]
            : [chroma, 0, x];

  return rgb.map(channel => Math.round((channel + offset) * 255)) as [number, number, number];
}

function relativeLuminance(rgb: readonly number[]): number {
  const linear = rgb.map(channel => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function toHex(channel: number): string {
  return channel.toString(16).padStart(2, '0').toUpperCase();
}

function colorForHue(hue: number, luminanceTarget: number): PlayerColor {
  let low = 0;
  let high = 1;

  // Keep every identity color readable on both light and dark surfaces.
  for (let i = 0; i < 22; i++) {
    const lightness = (low + high) / 2;
    if (relativeLuminance(hslToRgb(hue, SATURATION, lightness)) < luminanceTarget) {
      low = lightness;
    } else {
      high = lightness;
    }
  }

  const rgb = hslToRgb(hue, SATURATION, (low + high) / 2);
  const border = `#${rgb.map(toHex).join('')}`;
  return { bg: `${border}18`, border, text: border };
}

const COLOR_CANDIDATES = TARGET_LUMINANCE.flatMap((luminance, variant) =>
  Array.from({ length: HUE_COUNT }, (_, hue) => ({
    hue,
    variant,
    color: colorForHue(hue, luminance),
  })),
);

function hueDistance(a: number, b: number): number {
  const distance = Math.abs(a - b);
  return Math.min(distance, HUE_COUNT - distance);
}

/**
 * Assigns colors for the whole roster together. It spreads hues as far apart
 * as possible, using the name hash only to break ties. This avoids both exact
 * collisions and groups of near-identical colors, independent of UI sort order.
 */
export function createPlayerColorMap(playerNames: readonly string[]): Map<string, PlayerColor> {
  const names = [...new Set(playerNames.filter(name => name.trim().length > 0))]
    .sort((a, b) => a.localeCompare(b, 'pl'));
  const colors = new Map<string, PlayerColor>();
  const usedColors = new Set<string>();
  const usedHues: number[] = [];

  for (const name of names) {
    const preferredHue = hashName(name) % HUE_COUNT;
    let bestCandidate: (typeof COLOR_CANDIDATES)[number] | undefined;
    let bestSpacing = -1;
    let bestVariant = Number.POSITIVE_INFINITY;
    let bestHashDistance = Number.POSITIVE_INFINITY;

    for (const candidate of COLOR_CANDIDATES) {
      if (usedColors.has(candidate.color.border)) continue;

      const spacing = usedHues.length === 0
        ? HUE_COUNT / 2
        : Math.min(...usedHues.map(hue => hueDistance(candidate.hue, hue)));
      const hashDistance = hueDistance(candidate.hue, preferredHue);
      if (
        spacing > bestSpacing
        || (spacing === bestSpacing && candidate.variant < bestVariant)
        || (spacing === bestSpacing && candidate.variant === bestVariant && hashDistance < bestHashDistance)
        || (spacing === bestSpacing && candidate.variant === bestVariant && hashDistance === bestHashDistance && candidate.hue < (bestCandidate?.hue ?? HUE_COUNT))
      ) {
        bestCandidate = candidate;
        bestSpacing = spacing;
        bestVariant = candidate.variant;
        bestHashDistance = hashDistance;
      }
    }

    if (bestCandidate) {
      usedColors.add(bestCandidate.color.border);
      usedHues.push(bestCandidate.hue);
      colors.set(name, bestCandidate.color);
    }
  }

  return colors;
}
