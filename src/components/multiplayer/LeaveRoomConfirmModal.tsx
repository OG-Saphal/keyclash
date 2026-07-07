import React from 'react';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import { LogOut, X } from 'lucide-react';

const LeaveRoomConfirmModal: React.FC = () => {
  const pendingTarget = useMultiplayerStore((s) => s.pendingNavigationTarget);
  const confirmNavigation = useMultiplayerStore((s) => s.confirmNavigation);
  const cancelNavigation = useMultiplayerStore((s) => s.cancelNavigation);

  if (!pendingTarget) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
      <div className="bg-bg-secondary/90 backdrop-blur-sm rounded-xl p-6 max-w-sm w-full shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2 text-lg">
            <LogOut className="w-5 h-5 text-red-400" /> Leave Multiplayer?
          </h2>
          <button
            onClick={cancelNavigation}
            className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-bg-primary/50"
          >
            <X className="w-5 h-5 cursor-pointer" />
          </button>
        </div>

        <p className="text-text-muted text-sm mb-6">
          You are currently in a multiplayer room. Exiting will disconnect you from the race.
        </p>

        <div className="flex gap-3">
          <button
            className="flex-1 px-4 py-2 rounded-lg cursor-pointer bg-bg-primary/40 text-text-muted hover:bg-bg-primary/60 transition-colors text-center"
            onClick={cancelNavigation}
          >
            Cancel
          </button>
          <button
            className="flex-1 px-4 py-2 rounded-lg cursor-pointer bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors shadow-sm text-center"
            onClick={confirmNavigation}
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveRoomConfirmModal;