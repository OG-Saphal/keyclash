import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Check, X, Loader } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useUsernameChecker } from '../hooks/useUsernameChecker';
import AuthLayout from '../components/layout/AuthLayout';
import { Input, Button, Alert, PasswordStrength, getPasswordStrength } from '../components/ui/FormElements';

const SignUpPage: React.FC = () => {
  const signUp = useAuthStore(s => s.signUp);

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  useEffect(() => { emailRef.current?.focus(); }, []);

  const usernameStatus = useUsernameChecker(username);

  const usernameHint = () => {
    if (!username) return null;
    const map = {
      checking: <span className="flex items-center gap-1 text-xs text-text-muted"><Loader size={12} className="animate-spin" /> Checking…</span>,
      available: <span className="flex items-center gap-1 text-xs text-green-400"><Check size={12} /> Available</span>,
      taken: <span className="flex items-center gap-1 text-xs text-red-400"><X size={12} /> Already taken</span>,
      invalid: <span className="text-xs text-yellow-400">3–20 chars, letters/numbers/underscores only</span>,
      idle: null,
    };
    return map[usernameStatus];
  };

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const validate = () => {
    if (!email || !username || !displayName || !password || !confirmPassword) {
      return 'Please fill in all fields.';
    }
    if (usernameStatus !== 'available') return 'Choose a valid, available username.';
    if (passwordStrength.score < 3) return 'Please choose a stronger password.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    if (!agreedToTerms) return 'Please accept the terms and conditions.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setError('');
    setLoading(true);
    try {
      await signUp(email, password, username, displayName);
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title="Check your email">
        <div className="flex flex-col gap-6 text-center">
          <div className="text-5xl">📬</div>
          <p className="text-text-muted text-sm">
            We sent a verification link to <span className="text-text-primary font-mono">{email}</span>.
            Click it to activate your account.
          </p>
          <p className="text-xs text-text-muted">
            Didn't get it?{' '}
            <Link to="/login" className="text-accent-primary hover:underline">
              Go to login
            </Link>{' '}
            and use the resend option.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create account"
      subtitle={
        <>
          Already have one?{' '}
          <Link to="/login" className="text-accent-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

        <Input
          label="Username"
          type="text"
          placeholder="cool_typist"
          value={username}
          onChange={e => setUsername(e.target.value.slice(0, 20))}
          autoComplete="username"
          hint={usernameHint()}
        />

        <Input
          label="Display name"
          type="text"
          placeholder="Your Name"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          autoComplete="name"
        />

        <div>
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 bottom-2.5 text-text-muted hover:text-text-primary transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {password && <PasswordStrength password={password} />}
        </div>

        <Input
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          error={confirmPassword && !passwordsMatch ? 'Passwords do not match' : undefined}
        />

        <label className="flex items-start gap-2 cursor-pointer select-none text-sm text-text-muted mt-1">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={e => setAgreedToTerms(e.target.checked)}
            className="accent-accent-primary mt-0.5"
          />
          I agree to the{' '}
          <a href="/terms" className="text-accent-primary hover:underline" target="_blank" rel="noreferrer">
            terms & conditions
          </a>
        </label>

        <Button type="submit" loading={loading} className="w-full mt-2">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
};

export default SignUpPage;
