import React, { useLayoutEffect, useState } from 'react';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import { useTypingStore } from '../../store/useTypingStore';
import { useThemeStore } from '../../store/useThemeStore';
import { resolvePlayerColor } from '../../data/playerColors';
import type { RoomPlayerDTO } from '../../types/multiplayer';

interface Props {
  containerRef: React.RefObject<HTMLDivElement>;
  players: RoomPlayerDTO[]; // active players in the room (self included; filtered internally)
  selfUserId: string;
}

interface CaretPos { x: number; y: number; }

/**
 * 🆕 Part 2 — absolutely-positioned overlay for peer cursors during a race.
 * pointer-events: none throughout, so it never intercepts typing input.
 * Reuses the per-character <span> structure WordDisplay.tsx already renders
 * (via the data-word-index / data-char-index attributes added there) rather
 * than re-deriving word layout independently — this component only reads
 * DOM positions, it never recomputes word/char state itself.
 *
 * Mounted only on RacePage.tsx, never on the solo TypingView, since solo
 * mode has no peers (see RacePage.tsx diff).
 */
const PeerCursorOverlay: React.FC<Props> = ({ containerRef, players, selfUserId }) => {
  const otherPlayersProgress = useMultiplayerStore((s) => s.otherPlayersProgress);
  const words = useTypingStore((s) => s.words);
  const theme = useThemeStore((s) => s.theme);
  const [positions, setPositions] = useState<Record<string, CaretPos>>({});

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // 🆕 Part 3 — the scrollable word box lives INSIDE WordDisplay.tsx (its
    // own internal ref, not this one); we need ITS bounding rect, not the
    // outer wrapper's, to know what's actually visible right now, since the
    // outer wrapper passed in as `containerRef` never scrolls itself. See
    // the `data-word-scroll-container` attribute added in WordDisplay.tsx.
    const scrollEl = container.querySelector<HTMLElement>('[data-word-scroll-container]');
    const scrollRect = scrollEl?.getBoundingClientRect() ?? null;
    const next: Record<string, CaretPos> = {};
    for (const player of players) {
      if (player.userId === selfUserId) continue;
      // 🆕 Part 4 — a finished player's cursor is hidden entirely; their
      // placement shows on the leaderboard instead (see RaceLeaderboard.tsx).
      if (player.finalStats) continue;
      const progress = otherPlayersProgress[player.userId];
      if (!progress) continue;
      // Work out how far into the target WORD this player is: subtract off
      // the (length + trailing space) of every word before it from the
      // absolute completedChars offset.
      let charsIntoWord = progress.completedChars;
      for (let i = 0; i < progress.wordIndex && i < words.length; i++) {
        charsIntoWord -= words[i].chars.length + 1;
      }
      const wordEl = container.querySelector<HTMLElement>(`[data-word-index="${progress.wordIndex}"]`);
      if (!wordEl) continue;
      const charEl =
        wordEl.querySelector<HTMLElement>(`[data-char-index="${Math.max(0, charsIntoWord)}"]`) ?? wordEl;
      const targetRect = charEl.getBoundingClientRect();
      // 🐛 FIX (Part 3) — previously there was no visibility check at all,
      // so a peer several lines ahead of the local player's auto-scrolled
      // view rendered floating above the visible text box instead of being
      // hidden. Now: if the target word's row isn't within the scroll
      // container's currently visible band, skip it entirely (don't add it
      // to `next`) rather than clamping its position into view.
      if (scrollRect && (targetRect.top < scrollRect.top - 2 || targetRect.bottom > scrollRect.bottom + 2)) {
        continue;
      }
      const containerRect = container.getBoundingClientRect();
      next[player.userId] = {
        x: targetRect.left - containerRect.left + container.scrollLeft,
        y: targetRect.top - containerRect.top + container.scrollTop,
      };
    }
    setPositions(next);
  }, [otherPlayersProgress, words, players, selfUserId, containerRef]);

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {players
        .filter((p) => p.userId !== selfUserId && !p.finalStats && positions[p.userId])
        .map((p) => {
          const pos = positions[p.userId];
          const color = resolvePlayerColor(p.colorId, theme);
          return (
            <div
              key={p.userId}
              style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                transform: 'translateX(-1px)',
                // 🐛 FIX (Parts 2/9) — this used to carry
                // `transition: 'left 250ms ease-out, top 250ms ease-out'`,
                // which is exactly what produced the diagonal glide on a
                // line wrap: x resets to line-start and y drops by one line
                // height in the SAME animation, so the two transitions
                // blend into one diagonal path across the screen. Per spec,
                // replaced with a near-instant "key-strike" snap — no tween
                // at all; the cursor just appears at its new spot on the
                // next ~350ms progress tick, same cadence as before, just
                // without the glide.
              }}
            >
              {/* Caret shape — dual-tone outline so it never fully
                  disappears against either theme background, regardless of
                  the assigned hue. */}
              <div
                style={{
                  width: 2,
                  height: '1.4em',
                  background: color,
                  boxShadow: `0 0 0 1px rgb(var(--bg-primary)), 0 0 4px ${color}`,
                }}
              />
              {/* Non-color differentiator: name label attached to the caret */}
              <span
                style={{
                  position: 'absolute',
                  top: -18,
                  left: -2,
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '1px 4px',
                  borderRadius: 4,
                  background: color,
                  color: '#0a0a0f',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.username}
              </span>
            </div>
          );
        })}
    </div>
  );
};

export default PeerCursorOverlay;
