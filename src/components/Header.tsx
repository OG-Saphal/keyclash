import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import UserMenu from './auth/UserMenu';
import VerificationBanner from './auth/VerificationBanner';
import ThemeToggle from './ThemeToggle'; // 🆕

const Header: React.FC = () => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const user = useAuthStore(s => s.user);

  return (
    <>
      <header className="flex items-center justify-between px-8 py-4 select-none border-b border-bg-tertiary/40">
        <Link to="/" className="flex items-center gap-0.5" style={{ textDecoration: 'none' }}>
          <span className="text-accent-primary font-mono font-bold text-xl tracking-tight">keys</span>
          <span className="text-text-primary font-mono font-bold text-xl tracking-tight">clash</span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle /> {/* 🆕 */}

          {isAuthenticated && user ? (
            <UserMenu />
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="font-mono text-sm px-3 py-1.5 rounded-lg text-text-muted hover:text-text-primary transition-colors" style={{ textDecoration: 'none' }}>
                Login
              </Link>
              <Link to="/signup" className="font-mono text-sm px-3 py-1.5 rounded-lg bg-accent-primary text-bg-primary hover:opacity-90 transition-opacity" style={{ textDecoration: 'none' }}>
                Sign up
              </Link>
            </div>
          )}
        </div>
      </header>

      <VerificationBanner />
    </>
  );
};

export default Header;