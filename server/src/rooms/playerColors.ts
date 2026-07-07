// 🆕 Mirrors the key set of src/data/playerColors.ts on the frontend. The
// server never renders colors — it only needs to know which IDs exist so it
// can assign/validate them as the source of truth for color ownership.
export const COLOR_IDS = [
  'crimson', 'amber', 'emerald', 'sky', 'violet', 'magenta', 'slate', 'lime',
] as const;

export type ColorId = (typeof COLOR_IDS)[number];
