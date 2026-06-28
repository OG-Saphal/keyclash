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
 * App – root component that wires everything together.
 *
 * Layout:
 *   Header
 *   ─────────────────────────────────────
 *   Settings bar
 *   Timer  |  Live metrics
 *   Word display area
 *   Restart hint
 *   ─────────────────────────────────────
 *   Footer
 */
const App: React.FC = () => {
  const initTest = useTypingStore(s => s.initTest);
  const phase = useTypingStore(s => s.phase);

  // Start the timer hook (watches phase)
  useTimer();

  // Initialise word list on mount
  useEffect(() => {
    initTest();
  }, [initTest]);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      <Header />

      {/* Main content */}
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
                {/* Settings */}
                <Settings />

                {/* Timer + live stats */}
                <div className="flex flex-col items-center mb-2">
                  <Timer />
                  <LiveStats />
                </div>

                {/* Word display + hidden input */}
                <WordDisplay />

                {/* Restart hint */}
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
