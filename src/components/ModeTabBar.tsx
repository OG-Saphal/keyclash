import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Keyboard, Swords, Lock, LogOut, X } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useMultiplayerStore } from '../store/useMultiplayerStore';
import MultiplayerAuthModal from './multiplayer/MultiplayerAuthModal';

const ModeTabBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentRoom = useMultiplayerStore((s) => s.currentRoom);
  const leaveRoom = useMultiplayerStore((s) => s.leaveRoom); // ✅ added
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const isMultiplayer = location.pathname.startsWith('/multiplayer');

  const handleSingleplayerClick = () => {
    // Always show the modal when leaving any multiplayer page
    if (isMultiplayer) {
      setShowExitConfirm(true);
    } else {
      navigate('/');
    }
  };

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    // If we're in a room, leave it before navigating away
    if (currentRoom) {
      leaveRoom(); // ✅ added
    }
    navigate('/');
  };

  const handleMultiplayerClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      setAuthModalOpen(true);
      return;
    }
    if (!isMultiplayer) navigate('/multiplayer');
  };

  return (
    <>
      <div className="flex justify-center py-3">
        <div className="inline-flex bg-bg-secondary rounded-full p-1 gap-1 shadow-sm">
          <button
            onClick={handleSingleplayerClick}
            className={`flex items-center gap-2 px-4 py-2 cursor-pointer rounded-full text-sm font-medium transition-colors ${!isMultiplayer
              ? 'bg-accent-primary text-white'
              : 'text-text-muted hover:text-text-primary hover:bg-bg-primary/50'
              }`}
          >
            <Keyboard className="w-4 h-4 " />
            Singleplayer
          </button>

          <button
            onClick={handleMultiplayerClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer text-sm font-medium transition-colors ${isMultiplayer
              ? 'bg-accent-primary text-white'
              : isAuthenticated
                ? 'text-text-muted hover:text-text-primary hover:bg-bg-primary/50'
                : 'text-text-muted/50 cursor-pointer'
              }`}
            title={!isAuthenticated ? 'Sign in to play multiplayer' : undefined}
          >
            <Swords className="w-4 h-4" />
            Multiplayer
            {!isAuthenticated && <Lock className="w-3 h-3 ml-0.5" />}
          </button>
        </div>
      </div>

      <MultiplayerAuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      {/* Custom Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-bg-secondary/90 backdrop-blur-sm rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2 text-lg">
                <LogOut className="w-5 h-5 text-red-400" /> Leave Multiplayer?
              </h2>
              <button
                onClick={() => setShowExitConfirm(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-bg-primary/50"
              >
                <X className="w-5 h-5 cursor-pointer" />
              </button>
            </div>

            <p className="text-text-muted text-sm mb-6">
              {currentRoom
                ? 'You are currently in a multiplayer room. Exiting will disconnect you from the race.'
                : 'You are leaving the multiplayer section. Continue to singleplayer?'}
            </p>

            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2 rounded-lg cursor-pointer bg-bg-primary/40 text-text-muted hover:bg-bg-primary/60 transition-colors text-center"
                onClick={() => setShowExitConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-lg cursor-pointer bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors shadow-sm text-center"
                onClick={handleConfirmExit}
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ModeTabBar;