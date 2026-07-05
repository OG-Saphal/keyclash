import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, Zap } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const MultiplayerAuthModal: React.FC<Props> = ({ open, onClose }) => {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-bg-secondary border border-border rounded-2xl p-7 max-w-sm w-full flex flex-col items-center text-center gap-4"
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center relative">
              <Zap className="w-7 h-7 text-accent" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-bg-secondary border border-border flex items-center justify-center">
                <Lock className="w-3 h-3 text-text-muted" />
              </div>
            </div>
            <div>
              <h2 className="font-bold text-lg">Sign in to play Multiplayer</h2>
              <p className="text-sm text-text-muted mt-1">
                Racing against other typists in real time needs a free KeyClash account.
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium"
                onClick={() => { onClose(); navigate('/signup?redirect=/multiplayer'); }}
              >
                Sign Up
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-lg bg-accent text-bg-primary text-sm font-semibold"
                onClick={() => { onClose(); navigate('/login?redirect=/multiplayer'); }}
              >
                Log In
              </button>
            </div>
            <button className="text-xs text-text-muted underline" onClick={onClose}>
              Maybe later
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MultiplayerAuthModal;
