import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AuthLayout from '../components/layout/AuthLayout';

/**
 * Supabase redirects here after the user clicks the email verification link.
 * The URL hash contains #access_token & #type=signup — Supabase JS picks these
 * up automatically and creates a session. We poll until the session appears,
 * then read email_confirmed_at off the auth user (no DB write needed).
 */
const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 12;

    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (data.session) {
        // email_confirmed_at is set by Supabase when the user clicks the link.
        // Cast via unknown to avoid the strict TS typing on the session user shape.
        const confirmedAt = (data.session.user as unknown as { email_confirmed_at?: string })
          .email_confirmed_at;

        if (confirmedAt) {
          setStatus('success');
          setTimeout(() => navigate('/'), 2500);
        } else {
          // Session exists but email not yet confirmed — keep polling
          attempts++;
          if (attempts >= MAX_ATTEMPTS) {
            setStatus('error');
          } else {
            setTimeout(check, 1500);
          }
        }
      } else {
        attempts++;
        if (attempts >= MAX_ATTEMPTS) {
          setStatus('error');
        } else {
          setTimeout(check, 1500);
        }
      }
    };

    check();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <AuthLayout title="Email verification">
      <div className="flex flex-col items-center gap-6 py-4 text-center">
        {status === 'checking' && (
          <>
            <Loader size={48} className="text-accent-primary animate-spin" />
            <p className="text-text-muted text-sm">Verifying your email…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={48} className="text-green-400" />
            <div>
              <p className="text-text-primary font-medium">Email verified!</p>
              <p className="text-text-muted text-sm mt-1">Redirecting you to the app…</p>
            </div>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={48} className="text-red-400" />
            <div>
              <p className="text-text-primary font-medium">Verification failed</p>
              <p className="text-text-muted text-sm mt-1">
                The link may have expired.{' '}
                <Link to="/login" className="text-accent-primary hover:underline">
                  Sign in
                </Link>{' '}
                to resend.
              </p>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
};

export default VerifyEmailPage;
