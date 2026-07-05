import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface AuthLayoutProps {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Shared layout for Login, SignUp, ForgotPassword pages.
 * Matches the dark/light theme via CSS variables.
 */
const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-bg-tertiary/40">
        <Link to="/" className="flex items-center gap-0.5">
          <span className="text-accent-primary font-mono font-bold text-xl tracking-tight">key</span>
          <span className="text-text-primary font-mono font-bold text-xl tracking-tight">Clash</span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-md"
        >
          {/* Card */}
          <div className="bg-bg-secondary border border-bg-tertiary/60 rounded-2xl p-8 shadow-xl">
            <h1 className="font-mono font-bold text-2xl text-text-primary mb-1">{title}</h1>
            {subtitle && <p className="text-sm text-text-muted mb-6">{subtitle}</p>}
            {children}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AuthLayout;
