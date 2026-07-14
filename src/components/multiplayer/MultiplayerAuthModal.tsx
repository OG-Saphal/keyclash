import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, LogIn, UserPlus } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const MultiplayerAuthModal: React.FC<Props> = ({ open, onClose }) => {
  const navigate = useNavigate();

  // Close modal on Escape key press
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow Escape to close
      if (e.key === 'Escape') {
        onClose();
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // If the event target is inside the modal, let it handle normally (for buttons, etc.)
      const modalElement = document.querySelector('.multiplayer-auth-modal-container');
      if (modalElement && modalElement.contains(e.target as Node)) {
        return; // allow default behavior (e.g., Enter to click button)
      }

      // Otherwise, block the key from reaching the typing test
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener('keydown', handleKeyDown, true); // capture phase
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-bg-secondary/95 backdrop-blur-md border border-white/10 rounded-2xl p-8 max-w-sm w-full flex flex-col items-center text-center gap-6 shadow-2xl shadow-black/30"
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7 text-accent drop-shadow-[0_0_8px_rgba(139,92,246,0.4)]" />
              </div>
              <div className="absolute inset-0 rounded-full ring-1 ring-accent/30 scale-110 -z-10 animate-pulse mx-auto" />
            </div>

            {/* Text */}
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-text-primary">Join the Race</h2>
              <p className="text-sm text-text-muted leading-relaxed">
                Compete against real typists. Create a free account to unlock multiplayer mode.
              </p>
            </div>

            {/* Buttons - Explicitly centered, same height, solid purple */}
            <div className="w-full space-y-3 flex flex-col items-center">
              <button
                onClick={() => {
                  onClose();
                  navigate('/login?redirect=/multiplayer');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 h-8 rounded-xl bg-accent-primary text-white font-semibold hover:brightness-110 transition-all shadow-lg shadow-accent/25 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                Log In
              </button>

              <button
                onClick={() => {
                  onClose();
                  navigate('/signup?redirect=/multiplayer');
                }}
                // bg-[rgb(var(--accent-darker))] creates a solid, true darker shade, NOT an opacity mix.
                className="w-full flex items-center justify-center gap-2 px-4 py-3 h-5 rounded-xl border-solid border border-accent-primary  text-accent-primary font-semibold hover:brightness-110 transition-all shadow-lg shadow-accent/25 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Create Account
              </button>
            </div>

            {/* Not now */}
            <button
              onClick={onClose}
              className="text-xs text-text-muted hover:text-text-primary transition-colors underline underline-offset-2 cursor-pointer mt-1"
            >
              Not now
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MultiplayerAuthModal;