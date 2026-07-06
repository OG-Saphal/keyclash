import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useFriendsStore } from '../store/useFriendsStore';
import { useTypingStore } from '../store/useTypingStore';
import { useMultiplayerStore } from '../store/useMultiplayerStore';
import UserMenu from './auth/UserMenu';
import VerificationBanner from './auth/VerificationBanner';
import ThemeToggle from './ThemeToggle';

const Header: React.FC = () => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const user = useAuthStore(s => s.user);
  const toggleSidebar = useFriendsStore(s => s.toggleSidebar);
  const incoming = useFriendsStore(s => s.incoming);
  const loadAll = useFriendsStore(s => s.loadAll);

  const location = useLocation();
  const navigate = useNavigate();
  const isHomepage = location.pathname === '/';
  const isMultiplayer = location.pathname.startsWith('/multiplayer');

  const initTest = useTypingStore(s => s.initTest);
  const requestNavigation = useMultiplayerStore(s => s.requestNavigation);

  // Keep the incoming-request badge fresh
  useEffect(() => {
    if (user) loadAll(user.id);
  }, [user, loadAll]);

  // Handle logo click
  const handleLogoClick = (e: React.MouseEvent) => {
    if (isHomepage) {
      e.preventDefault();
      initTest();
      return;
    }
    // If we're on any multiplayer page, show exit modal
    if (isMultiplayer) {
      e.preventDefault();
      requestNavigation('/');
    } else {
      // Otherwise just navigate to home
      navigate('/');
    }
  };

  return (
    <>
      <header className="flex items-center justify-between px-8 py-4 select-none border-b border-bg-tertiary/40">
        <Link
          to="/"
          onClick={handleLogoClick}
          className="flex items-center gap-0.5"
          style={{ textDecoration: 'none' }}
        >
          <span className="text-accent-primary font-mono font-bold text-xl tracking-tight">key</span>
          <span className="text-text-primary font-mono font-bold text-xl tracking-tight">Clash</span>
        </Link>

        {/* Right side: friends button, theme toggle, auth */}
        <div className="flex items-center gap-3">
          {/* Friends button – hidden on homepage AND on multiplayer pages */}
          {isAuthenticated && user && !isHomepage && !isMultiplayer && (
            <button
              onClick={toggleSidebar}
              className="relative text-text-muted hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-bg-tertiary/30"
              title="Friends"
            >
              <Users size={18} />
              {incoming.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent-primary text-[9px] font-mono font-bold text-bg-primary flex items-center justify-center">
                  {incoming.length}
                </span>
              )}
            </button>
          )}

          <ThemeToggle />

          {isAuthenticated && user ? (
            <UserMenu />
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="font-mono text-sm px-3 py-1.5 rounded-lg text-text-muted hover:text-text-primary transition-colors"
                style={{ textDecoration: 'none' }}
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="font-mono text-sm px-3 py-1.5 rounded-lg bg-accent-primary text-bg-primary hover:opacity-90 transition-opacity"
                style={{ textDecoration: 'none' }}
              >
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