import React from 'react';

/**
 * Header – minimal top bar with the KeyClash logo.
 */
const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-between px-8 py-5 select-none">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <span className="text-accent-primary font-mono font-semibold text-xl tracking-tight">
          key
        </span>
        <span className="text-text-primary font-mono font-semibold text-xl tracking-tight">
          clash
        </span>
      </div>

      {/* Subtle tagline */}
      <span className="text-text-muted text-xs font-mono hidden sm:block">

      </span>
    </header>
  );
};

export default Header;
