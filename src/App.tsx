import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTypingStore } from './store/useTypingStore';
import { useTimer } from './hooks/useTimer';

import Header from './components/Header';
import Settings from './components/Settings';
import Timer from './components/Timer';
import LiveStats from './components/LiveStats';
import WordDisplay from './components/WordDisplay';
import RestartButton from './components/RestartButton';
import Results from './components/Results';
import Footer from './components/Footer';

/**
 * WordProgress – shows "12 / 25" in words mode instead of a countdown timer.
 * Styled to match Timer.tsx so swapping between them looks seamless.
 */
const WordProgress: React.FC = () => {
  const currentWordIndex = useTypingStore(s => s.currentWordIndex);
  const wordCount        = useTypingStore(s => s.wordCount);
  const phase            = useTypingStore(s => s.phase);

  const colorClass =
    phase === 'idle'
      ? 'text-text-muted'
      : 'text-text-primary';

  return (
    <div className={`text-4xl font-mono font-bold tracking-tight ${colorClass}`}>
      {currentWordIndex}
      <span className="text-text-muted text-2xl"> / {wordCount}</span>
    </div>
  );
};

const App: React.FC = () => {
  const initTest = useTypingStore(s => s.initTest);
  const phase    = useTypingStore(s => s.phase);
  const mode     = useTypingStore(s => s.mode);

  useTimer();

  useEffect(() => {
    initTest();
  }, [initTest]);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-3xl">
          <AnimatePresence mode="wait">
            {phase !== 'finished' ? (
              <motion.div
                key="test"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Settings />

                <div className="flex flex-col items-center mb-2">
                  {/* Show countdown in time mode, word progress in words mode */}
                  <AnimatePresence mode="wait">
                    {mode === 'time' ? (
                      <motion.div
                        key="timer"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Timer />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="word-progress"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <WordProgress />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <LiveStats />
                </div>

                <WordDisplay />
                <RestartButton />
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Results />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default App;
