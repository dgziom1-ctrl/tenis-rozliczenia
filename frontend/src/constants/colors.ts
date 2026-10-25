import type { PlayerColor } from '@/types/ui';

const HUE_COUNT = 360;
const SLOT_STEP = 137;
const TARGET_LUMINANCE = [0.16, 0.18, 0.2] as const;
const COLOR_SLOT_COUNT = HUE_COUNT * TARGET_LUMINANCE.length;
const SATURATION = 0.74;

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

function colorForSlot(slot: number): PlayerColor {
  const hue = slot % HUE_COUNT;
  const luminanceTarget = TARGET_LUMINANCE[Math.floor(slot / HUE_COUNT)];
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

/**
 * Assigns one deterministic, distinct color to every name in the roster.
 * Names are sorted before resolving any hash collisions, so UI sort order
 * never changes the color assignment.
 */
export function createPlayerColorMap(playerNames: readonly string[]): Map<string, PlayerColor> {
  const names = [...new Set(playerNames.filter(name => name.trim().length > 0))]
    .sort((a, b) => a.localeCompare(b, 'pl'));
  const colors = new Map<string, PlayerColor>();
  const usedColors = new Set<string>();

  for (const name of names) {
    const start = hashName(name) % COLOR_SLOT_COUNT;
    for (let attempt = 0; attempt < COLOR_SLOT_COUNT; attempt++) {
      const slot = (start + attempt * SLOT_STEP) % COLOR_SLOT_COUNT;
      const color = colorForSlot(slot);
      if (usedColors.has(color.border)) continue;
      usedColors.add(color.border);
      colors.set(name, color);
      break;
    }
  }

  return colors;
}
