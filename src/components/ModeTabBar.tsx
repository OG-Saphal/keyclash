import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Keyboard, Swords, Lock } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import MultiplayerAuthModal from './multiplayer/MultiplayerAuthModal';

// Optional: import a custom confirmation modal if you have one
// import LeaveRoomModal from './multiplayer/LeaveRoomModal';

const ModeTabBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const isMultiplayer = location.pathname.startsWith('/multiplayer');

  const handleSingleplayerClick = () => {
    // If we're already on a multiplayer page, ask for confirmation
    if (isMultiplayer) {
      // Use a native confirm for simplicity, or replace with a custom modal
      if (window.confirm('Leave the multiplayer room and go to singleplayer?')) {
        navigate('/');
      }
    } else {
      // Already on singleplayer – just stay (or reload if you want)
      // You could also do: navigate('/') to force a reload
      // For now, do nothing (like the logo)
    }
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
        <div className="inline-flex bg-bg-secondary border border-border rounded-full p-1 gap-1">
          {/* Singleplayer */}
          <button
            onClick={handleSingleplayerClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !isMultiplayer
                ? 'bg-accent-primary text-white'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            Singleplayer
          </button>

          {/* Multiplayer */}
          <button
            onClick={handleMultiplayerClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              isMultiplayer
                ? 'bg-accent-primary text-white'
                : isAuthenticated
                  ? 'text-text-muted hover:text-text-primary'
                  : 'text-text-muted/50 cursor-pointer'
            }`}
            title={!isAuthenticated ? 'Sign in to play multiplayer' : undefined}
          >
            <Swords className="w-4 h-4" />
            Multiplayer
            {!isAuthenticated && <Lock className="w-3 h-3" />}
          </button>
        </div>
      </div>

      <MultiplayerAuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      {/* If you have a custom LeaveRoomModal, use it here */}
      {/* <LeaveRoomModal
        open={showLeaveConfirm}
        onConfirm={() => { setShowLeaveConfirm(false); navigate('/'); }}
        onCancel={() => setShowLeaveConfirm(false)}
      /> */}
    </>
  );
};

export default ModeTabBar;