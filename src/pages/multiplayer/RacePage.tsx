import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTypingStore } from '../../store/useTypingStore';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useTimer } from '../../hooks/useTimer';
import Header from '../../components/Header';
import Timer from '../../components/Timer';
import LiveStats from '../../components/LiveStats';
import WordProgress from '../../components/WordProgress';
import WordDisplay from '../../components/WordDisplay';
import PlayerProgressBar from '../../components/multiplayer/PlayerProgressBar';
import PeerCursorOverlay from '../../components/multiplayer/PeerCursorOverlay';
import SelfCursorOverlay from '../../components/multiplayer/SelfCursorOverlay';
import RaceLeaderboard from '../../components/multiplayer/RaceLeaderboard';

/**
 * Multiplayer race view. Reuses the EXISTING typing engine wholesale for the
 * local player — this component never reimplements typing logic, it only:
 *  1. Feeds server-generated race text into useTypingStore (loadExternalWords)
 *  2. Starts the test at the server's startTimestamp (synced countdown),
 *     not on the player's first keystroke
 *  3. Reports the local player's own progress to the server (throttled,
 *     via useMultiplayerStore.beginProgressReporting)
 *  4. Renders everyone else's progress as race-track bars + a live cursor
 *     overlay + a full leaderboard (Part 5), plus (Part 10) the same
 *     Timer/WordProgress + LiveStats HUD solo mode shows, and (Part 6) a
 *     drift-free server-synced match timer for time-mode races.
 */
const RacePage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const theme = useThemeStore((s) => s.theme);
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
  const localAccuracy = useTypingStore((s) => s.metrics.accuracy);
  useTimer();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showGo, setShowGo] = useState(false);
  const wordsLoadedRef = useRef(false);
  const raceStartedRef = useRef(false);
  const finishSubmittedRef = useRef(false);
  const timeoutFinishRef = useRef(false);
  const wordDisplayContainerRef = useRef<HTMLDivElement>(null);
  const prevRankRef = useRef<Record<string, number>>({});

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
          setShowGo(true);
          setTimeout(() => setShowGo(false), 500);
          startTest();
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

  // Part 6 — server-synced match countdown (time mode only).
  useEffect(() => {
    if (!raceStartTimestamp || !room || room.settings.mode !== 'time') return;
    const syncInterval = setInterval(() => {
      if (useTypingStore.getState().phase !== 'running') return;
      const endsAt = raceStartTimestamp + room.settings.duration * 1000;
      const synced = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      if (synced <= 0) {
        if (!timeoutFinishRef.current) {
          timeoutFinishRef.current = true;
          useTypingStore.setState({ timeLeft: 0 });
          useTypingStore.getState().finishTest();
        }
        return;
      }
      if (useTypingStore.getState().timeLeft !== synced) {
        useTypingStore.setState({ timeLeft: synced });
      }
    }, 100);
    return () => clearInterval(syncInterval);
  }, [raceStartTimestamp, room]);

  // Local player finished -> submit authoritative result to server, then move on.
  useEffect(() => {
    if (phase === 'finished' && raceStartedRef.current && !finishSubmittedRef.current) {
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
  const selfPlayer = activePlayers.find((p) => p.userId === currentUser.id);
  const totalWords = words.length;

  // Rank tracking for overtake arrows
  const ranked = activePlayers
    .map((p) => {
      const isSelf = p.userId === currentUser.id;
      const live = isSelf ? { wordIndex: currentWordIndex, wpm: localWpm } : otherPlayersProgress[p.userId];
      return { ...p, liveWordIndex: live?.wordIndex ?? 0, liveWpm: live?.wpm ?? 0 };
    })
    .sort((a, b) => b.liveWordIndex - a.liveWordIndex || b.liveWpm - a.liveWpm);
  const rankDeltas: Record<string, -1 | 0 | 1> = {};
  ranked.forEach((p, i) => {
    const prev = prevRankRef.current[p.userId];
    if (prev !== undefined && prev !== i) rankDeltas[p.userId] = prev > i ? 1 : -1;
    prevRankRef.current[p.userId] = i;
  });

  const showCountdown = countdown !== null && countdown > 0;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 overflow-hidden">
        <AnimatePresence mode="wait">
          {showCountdown ? (
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.4, opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="text-7xl font-bold text-accent"
            >
              {countdown}
            </motion.div>
          ) : showGo ? (
            <motion.div
              key="go"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="text-7xl font-bold text-status-success"
            >
              GO
            </motion.div>
          ) : (
            <motion.div
              key="race"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-6xl flex flex-col lg:flex-row gap-4"
            >
              {/* Left Column - Race Dashboard & Typing Area */}
              <div className="flex-1 flex flex-col gap-4 overflow-hidden">

                {/* Unified HUD Bar */}
                <div className="bg-bg-secondary/80 rounded-xl px-6 py-3 border border-bg-primary/20 flex items-center justify-between shadow-sm shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-muted">
                      {room.settings.name}
                    </span>
                    <span className="w-px h-5 bg-bg-primary/20 mx-1" />
                    <span className="text-xs text-text-muted bg-bg-primary/40 px-2 py-0.5 rounded-full">
                      {room.settings.mode === 'time' ? `${room.settings.duration}s` : `${room.settings.wordCount} words`}
                    </span>
                  </div>
                  <div className="flex items-center gap-5">
                    {room.settings.mode === 'time' ? <Timer /> : <WordProgress />}
                    <div className="w-px h-5 bg-bg-primary/20" />
                    <LiveStats />
                  </div>
                </div>

                {/* Unified Race Cockpit Card */}
                <div className="bg-bg-secondary/80 rounded-xl p-5 border border-bg-primary/20 flex flex-col gap-5 flex-1 overflow-hidden shadow-sm">

                  {/* 1. Player Progress Track */}
                  <div className="flex flex-col gap-2">
                    {activePlayers.map((p) => {
                      const isSelf = p.userId === currentUser.id;
                      const live = isSelf
                        ? { wordIndex: currentWordIndex, wpm: localWpm }
                        : otherPlayersProgress[p.userId];
                      return (
                        <PlayerProgressBar
                          key={p.userId}
                          username={p.username}
                          avatarUrl={p.avatarUrl}
                          colorId={p.colorId}
                          isSelf={isSelf}
                          wordIndex={live?.wordIndex ?? 0}
                          totalWords={totalWords}
                          wpm={live?.wpm ?? 0}
                          connection={p.connection}
                          rankDelta={rankDeltas[p.userId] ?? 0}
                        />
                      );
                    })}
                  </div>

                  {/* Divider */}
                  <hr className="border-bg-primary/20" />

                  {/* 2. Typing Area with Cursor Overlays */}
                  <div
                    className="relative bg-bg-primary/30 rounded-lg p-4 flex-1 min-h-[120px]"
                    ref={wordDisplayContainerRef}
                    style={{ '--text-cursor': theme === 'dark' ? '255 255 255' : '0 0 0' } as React.CSSProperties}
                  >
                    <WordDisplay />
                    <PeerCursorOverlay
                      containerRef={wordDisplayContainerRef}
                      players={activePlayers}
                      selfUserId={currentUser.id}
                    />
                    {selfPlayer && (
                      <SelfCursorOverlay containerRef={wordDisplayContainerRef} colorId={selfPlayer.colorId} />
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Leaderboard */}
              <div className="w-full lg:w-80 shrink-0">
                <div className="sticky top-4">
                  <RaceLeaderboard
                    players={activePlayers}
                    currentUserId={currentUser.id}
                    localWordIndex={currentWordIndex}
                    localWpm={localWpm}
                    localAccuracy={localAccuracy}
                    otherPlayersProgress={otherPlayersProgress}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default RacePage;