export interface FinalSubmission {
  /** Words completed correctly (client's own count — never trusted directly) */
  completedCorrectWords: number;
  totalKeystrokes: number;
  totalCorrectChars: number;
  totalIncorrectChars: number;
  /** ms since race start, per the CLIENT's clock */
  clientElapsedMs: number;
}

export interface RecomputedResult {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  outlierFlag: boolean;
}

const MAX_PLAUSIBLE_WPM = 250; // ~world-record territory; higher is almost certainly cheating/bugged
const MAX_PLAUSIBLE_RAW_WPM = 350;

/**
 * Recomputes final stats using the SERVER's own elapsed time (startTimestamp
 * to the time the server received the finish event), not the client-reported
 * elapsed. The formula itself mirrors utils/typing.ts computeMetrics exactly
 * so client-side live numbers and server-side final numbers never disagree
 * in normal (non-cheating) play.
 *
 * Per spec: never trust client-submitted numbers directly. We still use the
 * client's raw counters (correct/incorrect chars, keystrokes, completed
 * words) as INPUT — the server has no cheaper way to get true per-keystroke
 * data without duplicating the entire typing engine server-side, which is
 * explicitly out of scope (spec says reuse the engine, don't replace it).
 * What the server does NOT trust is the client's derived wpm/accuracy or its
 * elapsed time — those are recomputed here from server time + raw counts,
 * and implausible results are flagged rather than silently accepted.
 */
export function recomputeFinalStats(
  submission: FinalSubmission,
  serverElapsedMs: number,
): RecomputedResult {
  const minutesElapsed = Math.max(serverElapsedMs, 1) / 60000;

  const wpm = Math.round(submission.completedCorrectWords / minutesElapsed);
  const rawWpm = Math.round(submission.totalKeystrokes / 5 / minutesElapsed);

  const total = submission.totalCorrectChars + submission.totalIncorrectChars;
  const accuracy = total > 0 ? Math.round((submission.totalCorrectChars / total) * 100) : 100;

  // Outlier heuristics — flagged silently for review, never blocked, per spec.
  const impossibleSpeed = wpm > MAX_PLAUSIBLE_WPM || rawWpm > MAX_PLAUSIBLE_RAW_WPM;
  const suspiciousPerfection = accuracy === 100 && wpm > 150;
  // Client and server elapsed time drifting a lot suggests clock tampering
  // or a paused/throttled tab being used to game the timer.
  const clockDrift = Math.abs(submission.clientElapsedMs - serverElapsedMs) > 4000;

  return {
    wpm,
    rawWpm,
    accuracy,
    correctChars: submission.totalCorrectChars,
    incorrectChars: submission.totalIncorrectChars,
    outlierFlag: impossibleSpeed || suspiciousPerfection || clockDrift,
  };
}
