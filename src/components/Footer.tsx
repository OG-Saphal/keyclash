import React from 'react';
import { useLocation } from 'react-router-dom';

const Footer: React.FC = () => {
  const location = useLocation();
  const isMultiplayer = location.pathname.startsWith('/multiplayer');

  return (
    <footer className="text-center py-6 text-text-muted text-xs font-mono select-none">
      {isMultiplayer ? (
        // On multiplayer pages: just the brand name
        <span>keyClash</span>
      ) : (
        // On single-player / typing arena: full message
        <>
          keyClash · press <kbd className="bg-bg-secondary px-1.5 py-0.5 rounded border border-bg-tertiary">tab</kbd> to restart
        </>
      )}
    </footer>
  );
};

export default Footer;