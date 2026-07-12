import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, X } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import AuthLayout from '../components/layout/AuthLayout';
import { Input, Button, Alert } from '../components/ui/FormElements';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore(s => s.login);
  const authLoading = useAuthStore(s => s.authLoading);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  useEffect(() => { emailRef.current?.focus(); }, []);

  // Listen for Escape key globally
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password, rememberMe);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle={
        <>
          Don't have an account?{' '}
          <Link to="/signup" className="text-accent-primary hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      {/* Form container is relative, button is absolute at top-right */}
      <form onSubmit={handleSubmit} className="relative flex flex-col gap-4">
        {/* Close button positioned at the card's top-right corner */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="absolute -top-14 cursor-pointer hover:text-red-500 right-0 flex items-center gap-1 px-3 py-1.5 text-sm rounded-full border border-border-light bg-background-secondary text-text-muted hover:text-text-primary hover:border-accent-primary hover:bg-background-hover transition-all duration-200 z-10"
          aria-label="Close and go to home (Esc)"
        >
          <X size={16} strokeWidth={2} />
          <span className="font-mono text-xs font-medium">Esc</span>
        </button>

        {error && <Alert type="error">{error}</Alert>}

        <Input
          ref={emailRef}
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
        />

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 bottom-2.5 text-text-muted hover:text-text-primary transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-text-muted">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              className="accent-accent-primary"
            />
            Remember me
          </label>
          <Link
            to="/forgot-password"
            className="text-sm text-text-muted hover:text-accent-primary transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          loading={loading || authLoading}
          className="w-full mt-2"
        >
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;