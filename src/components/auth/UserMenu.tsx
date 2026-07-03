import React, { useRef, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, BarChart2, Settings, LogOut, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import UserAvatar from './UserAvatar';

const UserMenu: React.FC = () => {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) return null;

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/');
  };

  const menuItems = [
    { icon: <User size={15} />, label: 'Profile', to: '/profile' },
    { icon: <Settings size={15} />, label: 'Account settings', to: '/account' },
  ];

  return (
    <div ref={menuRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <UserAvatar user={user} size={32} />
        {!user.emailVerified && (
          <span
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-400 border-2 border-bg-primary"
            title="Email not verified"
          />
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-2 w-52 bg-bg-secondary border border-bg-tertiary/60 rounded-xl shadow-2xl overflow-hidden z-50"
          >
            {/* User info header */}
            <div className="px-4 py-3 border-b border-bg-tertiary/40">
              <p className="font-mono font-medium text-sm text-text-primary truncate">
                {user.displayName}
              </p>
              <p className="text-xs text-text-muted truncate">@{user.username}</p>
              {!user.emailVerified && (
                <p className="text-xs text-yellow-400 mt-0.5 flex items-center gap-1">
                  <ShieldAlert size={11} />
                  Email not verified
                </p>
              )}
            </div>

            {/* Menu items */}
            <ul className="py-1">
              {menuItems.map(item => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-text-muted hover:text-text-primary hover:bg-bg-tertiary/30 transition-colors"
                  >
                    <span className="text-text-muted">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              ))}

              <li className="border-t border-bg-tertiary/40 mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserMenu;
