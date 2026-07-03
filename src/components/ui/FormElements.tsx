import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
        {label}
      </label>
      <input
        ref={ref}
        className={`
          w-full bg-bg-secondary border border-bg-tertiary rounded-lg px-4 py-2.5
          text-text-primary placeholder:text-text-muted font-mono text-sm
          focus:outline-none focus:border-accent-primary transition-colors
          ${error ? 'border-red-500 focus:border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-red-400"
          >
            {error}
          </motion.p>
        ) : hint ? (
          <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {hint}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
);
Input.displayName = 'Input';

// ─── Button ───────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const base = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-mono text-sm font-medium transition-all duration-150 select-none';
  const variants = {
    primary: 'bg-accent-primary text-bg-primary hover:opacity-90 disabled:opacity-50',
    ghost: 'text-text-muted hover:text-text-primary hover:bg-bg-secondary disabled:opacity-50',
    danger: 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 disabled:opacity-50',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </button>
  );
};

// ─── Alert ────────────────────────────────────────────────────────────────────

interface AlertProps {
  type: 'error' | 'success' | 'info' | 'warning';
  children: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({ type, children }) => {
  const styles = {
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
    info: 'bg-accent-primary/10 border-accent-primary/30 text-accent-primary',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border px-4 py-3 text-sm ${styles[type]}`}
    >
      {children}
    </motion.div>
  );
};

// ─── Divider ──────────────────────────────────────────────────────────────────

export const Divider: React.FC<{ label?: string }> = ({ label }) => (
  <div className="relative flex items-center gap-3 my-2">
    <div className="flex-1 h-px bg-bg-tertiary" />
    {label && <span className="text-xs text-text-muted shrink-0">{label}</span>}
    <div className="flex-1 h-px bg-bg-tertiary" />
  </div>
);

// ─── Password strength indicator ──────────────────────────────────────────────

export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score <= 3) return { score, label: 'Moderate', color: 'bg-yellow-500' };
  return { score, label: 'Strong', color: 'bg-green-500' };
}

export const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
  const { score, label, color } = getPasswordStrength(password);
  if (!password) return null;

  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= score ? color : 'bg-bg-tertiary'
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-text-muted">{label}</span>
    </div>
  );
};
