/**
 * Results.tsx — drop-in replacement that adds Supabase result saving.
 *
 * USAGE: Replace your existing src/components/Results.tsx with this file.
 * It keeps the same structure/style but auto-saves results and shows a
 * SaveResultIndicator below the stats.
 *
 * If you already have custom JSX in your Results component, simply merge
 * the three additions marked with "// 🆕" below into your existing file.
 */

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { useTypingStore } from '../store/useTypingStore';
import { useSaveResult } from '../hooks/useSaveResult';       // 🆕
import SaveResultIndicator from './auth/SaveResultIndicator'; // 🆕

const Results: React.FC = () => {
  const result  = useTypingStore(s => s.result);
  const restart = useTypingStore(s => s.restart);
  const { save, status, isAuthenticated } = useSaveResult(); // 🆕

  // 🆕 Auto-save when result appears
  useEffect(() => {
    if (result) save(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  if (!result) return null;

  const stats = [
    { label: 'wpm',      value: result.wpm.toFixed(0) },
    { label: 'raw wpm',  value: result.rawWpm.toFixed(0) },
    { label: 'accuracy', value: `${result.accuracy.toFixed(1)}%` },
  ];

  return (
    <motion.div
      className="flex flex-col items-center gap-8 py-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Stats row */}
      <div className="flex gap-12">
        {stats.map(s => (
          <div key={s.label} className="flex flex-col items-center gap-1">
            <span className="text-5xl font-mono font-bold text-accent-primary">
              {s.value}
            </span>
            <span className="text-xs font-mono text-text-muted uppercase tracking-widest">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* 🆕 Save indicator */}
      <SaveResultIndicator status={status} isAuthenticated={isAuthenticated} />

      {/* Restart */}
      <button
        onClick={restart}
        className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors font-mono text-sm"
      >
        <RotateCcw size={15} />
        restart
      </button>
    </motion.div>
  );
};

export default Results;
