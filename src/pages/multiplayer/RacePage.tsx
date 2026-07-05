import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTypingStore } from '../../store/useTypingStore';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useTimer } from '../../hooks/useTimer';
import Header from '../../components/Header';
import WordDisplay from '../../components/WordDisplay';
import PlayerProgressBar from '../../components/multiplayer/PlayerProgressBar';

/**
 * Multiplayer race view. Reuses the EXISTING typing engine wholesale for the
 * local player — this component never reimplements typing logic, it only:
 *  1. Feeds server-generated race text into useTypingStore (loadExternalWords)
 *  2. Starts the test at the server's startTimestamp (synced countdown),
 *     not on the player's first keystroke
 *  3. Reports the local player's own progress to the server (throttled,
 *     via useMultiplayerStore.beginProgressReporting)
 *  4. Renders everyone else's progress as an overlay of thin bars
 */
const RacePage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const room = useMultiplayerStore((s) => s.currentRoom);
  const raceWords = useMultiplayerStore((s) => s.raceWords);
  const raceStartTimestamp = useMultiplayerStore((s) => s.raceStartTimestamp ?? room?.startTimestamp ?? null);
  const otherPlayersProgress = useMultiplayerStore((s) => s.otherPlayersProgress);
  const beginProgressReporting = useMultiplayerStore((s) => s.beginProgressReporting);
  const stopProgressReporting = useMultiplayerStore((s) => s.stopProgressReporting);
  const submitFinalResult = useMultiplayerStore((s) => s.submitFinalResult);

  const loadExternalWords = useTypingStore((s) => s.loadExternalWords);
  const startTest = useTypingStore((s) => s.startTest);
  const phase = useTypingStore((s) => s.phase);
  const words = useTypingStore((s) => s.words);
  const currentWordIndex = useTypingStore((s) => s.currentWordIndex);
  const localWpm = useTypingStore((s) => s.metrics.wpm);

  useTimer(); // existing hook — ticks the engine every second while running

  const [countdown, setCountdown] = useState<number | null>(null);
  const wordsLoadedRef = useRef(false);
  const raceStartedRef = useRef(false);
  const finishSubmittedRef = useRef(false);

  // Load server race text into the existing engine, once, as soon as it arrives.
  useEffect(() => {
    if (raceWords && !wordsLoadedRef.current && room) {
      wordsLoadedRef.current = true;
      loadExternalWords(raceWords, room.settings.mode, { duration: room.settings.duration });
    }
  }, [raceWords, room, loadExternalWords]);

  // Synced countdown, driven by server clock, not local timers.
  useEffect(() => {
    if (!raceStartTimestamp) return;
    const tick = () => {
      const msLeft = raceStartTimestamp - Date.now();
      if (msLeft <= 0) {
        setCountdown(0);
        if (!raceStartedRef.current && wordsLoadedRef.current) {
          raceStartedRef.current = true;
          startTest(); // start exactly on server time, not on first keystroke
          beginProgressReporting();
        }
      } else {
        setCountdown(Math.ceil(msLeft / 1000));
      }
    };
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [raceStartTimestamp, startTest, beginProgressReporting]);

  // Local player finished -> submit authoritative result to server, then move on.
  useEffect(() => {
    if (phase === 'finished' && !finishSubmittedRef.current) {
      finishSubmittedRef.current = true;
      stopProgressReporting();
      submitFinalResult().then(() => navigate('/multiplayer/results'));
    }
  }, [phase, stopProgressReporting, submitFinalResult, navigate]);

  useEffect(() => {
    if (!room) navigate('/multiplayer');
  }, [room, navigate]);

  if (!room || !currentUser) return null;

  const activePlayers = room.players.filter((p) => !p.isSpectator);
  const totalWords = words.length;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
        {countdown !== null && countdown > 0 ? (
          <div className="text-7xl font-bold text-accent animate-pulse">{countdown}</div>
        ) : (
          <div className="w-full max-w-3xl flex flex-col gap-6">
            <div className="bg-bg-secondary border border-border rounded-xl p-4 flex flex-col gap-2">
              {activePlayers.map((p) => {
                const isSelf = p.userId === currentUser.id;
                const live = isSelf
                  ? { wordIndex: currentWordIndex, wpm: localWpm }
                  : otherPlayersProgress[p.userId];
                return (
                  <PlayerProgressBar
                    key={p.userId}
                    username={p.username}
                    isSelf={isSelf}
                    wordIndex={live?.wordIndex ?? 0}
                    totalWords={totalWords}
                    wpm={live?.wpm ?? 0}
                    connection={p.connection}
                  />
                );
              })}
            </div>

            <WordDisplay />
          </div>
        )}
      </main>
    </div>
  );
};

export default RacePage;
