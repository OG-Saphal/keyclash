import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Target, BookOpen, PartyPopper, X } from 'lucide-react';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import Header from '../../components/Header';
import ModeTabBar from '../../components/ModeTabBar';
import Footer from '../../components/Footer';

const QuickMatchSearchingPage: React.FC = () => {
  const status = useMultiplayerStore((s) => s.quickMatchStatus);
  const queuedAt = useMultiplayerStore((s) => s.quickMatchQueuedAt);
  const settings = useMultiplayerStore((s) => s.quickMatchSettings);
  const cancelQuickMatch = useMultiplayerStore((s) => s.cancelQuickMatch);
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status === 'idle') {
      navigate('/multiplayer');
      return;
    }
    if (status === 'found') {
      const t = setTimeout(() => navigate('/multiplayer/race'), 900);
      return () => clearTimeout(t);
    }
  }, [status, navigate]);

  useEffect(() => {
    if (!queuedAt) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - queuedAt) / 1000)), 500);
    return () => clearInterval(t);
  }, [queuedAt]);

  const estimatedWait = Math.max(1, 10 - elapsed);

  const wordSetLabel =
    { english200: 'English 200', english1k: 'English 1k', common: 'Common' }[settings?.wordSet ?? 'english200'];

  return (
    <div className="h-screen bg-bg-primary text-text-primary flex flex-col overflow-hidden">
      <Header />
      <ModeTabBar />

      <main className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
        {status === 'found' ? (
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-16 h-16 rounded-full bg-accent-primary/20 flex items-center justify-center">
              <PartyPopper className="w-8 h-8 text-accent-primary" />
            </div>
            <h1 className="text-3xl font-bold text-accent-primary">Match Found!</h1>
            <p className="text-text-muted text-sm">Redirecting to race…</p>
          </motion.div>
        ) : (
          <>
            {/* Spinner with pulse */}
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                className="w-14 h-14"
              >
                <Loader2 className="w-full h-full text-accent-primary" />
              </motion.div>
              <div className="absolute inset-0 rounded-full bg-accent-primary/10 animate-pulse" />
            </div>

            <h1 className="text-2xl font-bold">Searching for an opponent…</h1>

            {/* Timer – clean card */}
            <div className="bg-bg-secondary/80 rounded-xl px-6 py-3 shadow-sm font-mono text-xl font-semibold text-accent-primary">
              {elapsed}s
            </div>

            {/* Settings summary – no border, subtle background */}
            <div className="flex items-center gap-4 bg-bg-secondary/80 rounded-xl px-5 py-3 shadow-sm text-sm text-text-muted">
              <span className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-accent-primary" />
                {settings?.mode === 'words' ? 'Words Mode' : 'Time Mode'}
              </span>
              <span className="w-px h-4 bg-border/30" />
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-accent-primary" />
                {wordSetLabel}
              </span>
            </div>

            {/* Cancel button – subtle but clear */}
            <button
              className="flex items-center cursor-pointer gap-2 px-5 py-2 rounded-lg bg-bg-secondary/80 text-text-muted hover:text-red-400 hover:bg-red-500/10 shadow-sm transition-colors"
              onClick={() => {
                cancelQuickMatch();
                navigate('/multiplayer');
              }}
            >
              <X className="w-4 h-4" /> Cancel
            </button>

            <p className="text-xs text-text-muted">Estimated wait: ~{estimatedWait}s</p>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default QuickMatchSearchingPage;