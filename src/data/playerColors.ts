// 🆕 Theme-aware color pairs for player cursors/avatars in multiplayer.
// Each pair is hand-tuned for similar contrast against this app's
// --bg-primary in both themes (see index.css tokens) and chosen to vary in
// lightness/saturation, not just hue, so they stay distinguishable without
// relying on hue alone. Every cursor ALSO gets a label + dual-tone outline
// (see PeerCursorOverlay.tsx) as the non-color differentiator required by
// the colorblind-safety requirement — this palette is one layer of that,
// not the whole solution.

export const PLAYER_COLORS = {
  crimson: { light: '#C7264E', dark: '#FF6B81' },
  amber:   { light: '#B7791F', dark: '#FFC94D' },
  emerald: { light: '#0E8F6E', dark: '#4ECDC4' },
  sky:     { light: '#1D74C7', dark: '#5EC2FF' },
  violet:  { light: '#6B4FCC', dark: '#9D8CFF' },
  magenta: { light: '#B0298C', dark: '#FF7BD1' },
  slate:   { light: '#3F5468', dark: '#9FB4C7' },
  lime:    { light: '#5C8A1B', dark: '#B4E066' },
} as const;

export type ColorId = keyof typeof PLAYER_COLORS;
export const COLOR_IDS = Object.keys(PLAYER_COLORS) as ColorId[];

export function resolvePlayerColor(colorId: ColorId, theme: 'light' | 'dark'): string {
  return PLAYER_COLORS[colorId][theme];
}
