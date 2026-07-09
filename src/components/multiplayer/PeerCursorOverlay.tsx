import React, { useLayoutEffect, useRef, useState } from 'react';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import { useTypingStore } from '../../store/useTypingStore';
import { useThemeStore } from '../../store/useThemeStore';
import { resolvePlayerColor } from '../../data/playerColors';
import { resolveCaretAnchor, caretAnchorX } from '../../utils/multiplayerCursor';
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
  // 🆕 Bug #4 — tracks whether each player's most recent position update
  // was a same-line move (smooth-animate it) or a line wrap / first-seen
  // (snap instantly, no transition). Kept in a ref (not state) since it's
  // read only inside the effect/render, never needs to trigger a re-render
  // on its own.
  const [noTransition, setNoTransition] = useState<Record<string, boolean>>({});
  const prevPositionsRef = useRef<Record<string, CaretPos>>({});

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
      // 🐛 FIX (Bug #1) — see resolveCaretAnchor's doc comment in
      // multiplayerCursor.ts: anchor to the last character's RIGHT edge
      // once charsIntoWord reaches the word's length, instead of falling
      // back to the word wrapper's LEFT edge (which put peers' cursors at
      // the front of the word they'd just finished instead of the end).
      const wordLen = words[progress.wordIndex]?.chars.length ?? 0;
      const anchor = resolveCaretAnchor(wordEl, charsIntoWord, wordLen);
      const targetRect = anchor.el.getBoundingClientRect();
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
        x: caretAnchorX(anchor, targetRect) - containerRect.left + container.scrollLeft,
        y: targetRect.top - containerRect.top + container.scrollTop,
      };
    }

    // 🆕 Bug #4 — decide, per player, whether this update is a same-line
    // move (smooth-transition it) or a line wrap / first appearance (snap
    // instantly). Comparing against the PREVIOUS render's position (not
    // just "did wordIndex change") correctly handles the common case of
    // moving between two words that happen to sit on the same visual row.
    const nextNoTransition: Record<string, boolean> = {};
    for (const userId of Object.keys(next)) {
      const prev = prevPositionsRef.current[userId];
      const wrappedOrNew = !prev || Math.abs(prev.y - next[userId].y) > 1;
      nextNoTransition[userId] = wrappedOrNew;
    }
    prevPositionsRef.current = next;
    setNoTransition(nextNoTransition);
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
                // 🐛 FIX (Bug #4, revised) — Parts 2/9 previously removed
                // ALL transitions to stop a diagonal glide on line wraps
                // (animating left+top together made the cursor visibly
                // slide across the screen when a peer's caret jumped to
                // the next row). That fixed the glide but made every
                // cursor move look jerky, even smooth within-line
                // progress. Now: only `left` ever animates (top NEVER
                // does, so a line wrap can't glide diagonally no matter
                // what), and even that horizontal animation is skipped
                // (snap instantly) whenever THIS update was itself a line
                // wrap or the player's first appearance — see
                // `noTransition` above. Net effect: smooth interpolation
                // while typing along one line, instant snap across a
                // line/word wrap.
                transition: noTransition[p.userId] ? 'none' : 'left 160ms linear',
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
