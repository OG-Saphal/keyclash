import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';

const LeaveRoomConfirmModal: React.FC = () => {
  const pendingTarget = useMultiplayerStore((s) => s.pendingNavigationTarget);
  const confirmNavigation = useMultiplayerStore((s) => s.confirmNavigation);
  const cancelNavigation = useMultiplayerStore((s) => s.cancelNavigation);
  const room = useMultiplayerStore((s) => s.currentRoom);
  const navigate = useNavigate();

  const isRacing = room?.status === 'racing' || room?.status === 'countdown';

  const handleConfirm = () => {
    const target = pendingTarget ?? '/';
    confirmNavigation();
    navigate(target);
  };

  return (
    <AnimatePresence>
      {pendingTarget !== null && (
        <motion.div
          className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-bg-secondary border border-border rounded-2xl p-6 max-w-sm w-full flex flex-col gap-4"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <h2 className="font-semibold text-lg">Leave this room?</h2>
            </div>
            <p className="text-sm text-text-muted">
              {isRacing
                ? "You're mid-race — leaving now counts as a DNF and your seat won't be saved."
                : "You'll lose your spot in the lobby. Anyone else in the room stays put."}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 rounded-lg border border-border text-sm"
                onClick={cancelNavigation}
              >
                Stay
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-500/90 hover:bg-red-500 text-white text-sm font-semibold"
                onClick={handleConfirm}
              >
                Leave Room
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LeaveRoomConfirmModal;
