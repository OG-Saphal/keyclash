import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Target, BookOpen, PartyPopper } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      <Header />
      <ModeTabBar />
      <main className="flex-1 flex flex-col items-center justify-center gap-5">
        {status === 'found' ? (
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <PartyPopper className="w-12 h-12 text-accent" />
            <h1 className="text-4xl font-bold text-accent">Match Found!</h1>
          </motion.div>
        ) : (
          <>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
              <Loader2 className="w-12 h-12 text-accent" />
            </motion.div>
            <h1 className="text-2xl font-bold">Searching for an opponent…</h1>

            <div className="bg-bg-secondary border border-border rounded-full px-5 py-2 font-mono text-lg">
              {elapsed}s
            </div>

            <div className="flex gap-2 bg-bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-text-muted">
              <span className="flex items-center gap-1.5">
                <Target className="w-4 h-4" /> {settings?.mode === 'words' ? 'Words Mode' : 'Time Mode'}
              </span>
              <span className="opacity-40">·</span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                {{ english200: 'English 200', english1k: 'English 1k', common: 'Common' }[settings?.wordSet ?? 'english200']}
              </span>
            </div>

            <button
              className="px-5 py-2 rounded-lg border border-border text-sm font-medium hover:border-red-400/60 hover:text-red-400 transition-colors"
              onClick={() => { cancelQuickMatch(); navigate('/multiplayer'); }}
            >
              Cancel
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
