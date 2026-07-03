import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import AuthLayout from '../components/layout/AuthLayout';
import { Input, Button, Alert } from '../components/ui/FormElements';

const ForgotPasswordPage: React.FC = () => {
  const resetPassword = useAuthStore(s => s.resetPassword);

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const emailRef = useRef<HTMLInputElement>(null);
  useEffect(() => { emailRef.current?.focus(); }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(v => v - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email address.'); return; }
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
      setCooldown(60);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset password"
      subtitle="We'll send you a link to reset your password."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <Alert type="error">{error}</Alert>}
        {sent && (
          <Alert type="success">
            Reset link sent! Check your inbox. The link expires in 1 hour.
          </Alert>
        )}

        <Input
          ref={emailRef}
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
        />

        <Button
          type="submit"
          loading={loading}
          disabled={cooldown > 0}
          className="w-full"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : sent ? 'Resend link' : 'Send reset link'}
        </Button>

        <Link
          to="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors mt-1"
        >
          <ArrowLeft size={14} />
          Back to login
        </Link>
      </form>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
