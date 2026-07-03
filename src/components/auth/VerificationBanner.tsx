import React, { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

const VerificationBanner: React.FC = () => {
  const user = useAuthStore(s => s.user);
  const resend = useAuthStore(s => s.resendVerificationEmail);
  const [dismissed, setDismissed] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);

  if (!user || user.emailVerified || dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      await resend();
      setCooldown(60);
      const t = setInterval(() => {
        setCooldown(v => {
          if (v <= 1) { clearInterval(t); return 0; }
          return v - 1;
        });
      }, 1000);
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 flex items-center justify-between gap-4 text-sm">
      <div className="flex items-center gap-2 text-yellow-400">
        <ShieldAlert size={14} />
        <span>Please verify your email to unlock all features.</span>
        <button
          onClick={handleResend}
          disabled={cooldown > 0 || sending}
          className="underline underline-offset-2 hover:text-yellow-300 transition-colors disabled:opacity-50"
        >
          {sending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
        </button>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-yellow-400/60 hover:text-yellow-400 transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default VerificationBanner;
