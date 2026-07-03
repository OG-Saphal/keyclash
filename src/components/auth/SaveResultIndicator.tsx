import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Loader, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SaveStatus } from '../../hooks/useSaveResult';

interface SaveResultIndicatorProps {
  status: SaveStatus;
  isAuthenticated: boolean;
}

const SaveResultIndicator: React.FC<SaveResultIndicatorProps> = ({
  status,
  isAuthenticated,
}) => {
  return (
    <AnimatePresence mode="wait">
      {status === 'saving' && (
        <motion.span
          key="saving"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-1.5 text-xs text-text-muted"
        >
          <Loader size={12} className="animate-spin" />
          Saving…
        </motion.span>
      )}

      {status === 'saved' && isAuthenticated && (
        <motion.span
          key="saved"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-1.5 text-xs text-green-400"
        >
          <Check size={12} />
          Saved to profile
        </motion.span>
      )}

      {status === 'error' && (
        <motion.span
          key="error"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-1.5 text-xs text-red-400"
        >
          <AlertCircle size={12} />
          Save failed
        </motion.span>
      )}

      {status === 'idle' && !isAuthenticated && (
        <motion.span
          key="guest"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="text-xs text-text-muted"
        >
          <Link to="/login" className="text-accent-primary hover:underline">
            Sign in
          </Link>{' '}
          to save your results
        </motion.span>
      )}
    </AnimatePresence>
  );
};

export default SaveResultIndicator;
