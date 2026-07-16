import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { useUsernameChecker } from '../hooks/useUsernameChecker';
import { Input, Button, Alert, PasswordStrength } from '../components/ui/FormElements';

const BIO_MAX = 200;

// ─── Section wrapper ──────────────────────────────────────────────────────────

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-bg-secondary border border-bg-tertiary/60 rounded-2xl p-6 flex flex-col gap-4">
    <h2 className="font-mono font-semibold text-sm text-text-muted uppercase tracking-wider">{title}</h2>
    {children}
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────

const AccountPage: React.FC = () => {
  const user = useAuthStore(s => s.user);
  const updateProfile = useAuthStore(s => s.updateProfile);
  const updatePassword = useAuthStore(s => s.updatePassword);
  const updateEmail = useAuthStore(s => s.updateEmail);
  const deleteAccount = useAuthStore(s => s.deleteAccount);
  const exportUserData = useAuthStore(s => s.exportUserData);
  const navigate = useNavigate();

  // ── Edit profile ────────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const usernameStatus = useUsernameChecker(
    username !== user?.username ? username : '' // only check if changed
  );

  // 🆕 Feature 5 — bio / about me
  const [bio, setBio] = useState(user?.bio ?? '');
  const [bioLoading, setBioLoading] = useState(false);
  const [bioMsg, setBioMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Change password ─────────────────────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Change email ────────────────────────────────────────────────────────────
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Delete account ──────────────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Export ──────────────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <p className="text-text-muted">
          <Link to="/login" className="text-accent-primary hover:underline">Sign in</Link> to access account settings.
        </p>
      </div>
    );
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username !== user.username && usernameStatus !== 'available') {
      setProfileMsg({ type: 'error', text: 'Choose a valid, available username.' });
      return;
    }
    setProfileLoading(true);
    setProfileMsg(null);
    try {
      await updateProfile({ displayName, username });
      setProfileMsg({ type: 'success', text: 'Profile updated.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: (err as Error).message });
    } finally {
      setProfileLoading(false);
    }
  };

  // 🆕 Feature 5 — save bio
  const handleBioSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBioLoading(true);
    setBioMsg(null);
    try {
      await updateProfile({ bio: bio.trim() ? bio.trim() : null });
      setBioMsg({ type: 'success', text: 'Bio updated.' });
    } catch (err) {
      setBioMsg({ type: 'error', text: (err as Error).message });
    } finally {
      setBioLoading(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) { setPwMsg({ type: 'error', text: 'Passwords do not match.' }); return; }
    if (newPw.length < 8) { setPwMsg({ type: 'error', text: 'Password must be at least 8 characters.' }); return; }
    setPwLoading(true);
    setPwMsg(null);
    try {
      await updatePassword(currentPw, newPw);
      setPwMsg({ type: 'success', text: 'Password changed.' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      setPwMsg({ type: 'error', text: (err as Error).message });
    } finally {
      setPwLoading(false);
    }
  };

  const handleEmailSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    setEmailLoading(true);
    setEmailMsg(null);
    try {
      await updateEmail(newEmail);
      setEmailMsg({ type: 'success', text: 'Confirmation sent to your new email address.' });
      setNewEmail('');
    } catch (err) {
      setEmailMsg({ type: 'error', text: (err as Error).message });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const json = await exportUserData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `keyclash-data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
    finally { setExporting(false); }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleteLoading(true);
    try {
      await deleteAccount(deleteReason || undefined);
      navigate('/');
    } catch (err) {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <header className="flex items-center justify-between px-8 py-4 border-b border-bg-tertiary/40">
        <Link to="/" className="flex items-center gap-0.5">
          <span className="text-accent-primary font-mono font-bold text-xl">key</span>
          <span className="text-text-primary font-mono font-bold text-xl">Clash</span>
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-6">
        <Link to="/profile" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft size={14} />
          Back to profile
        </Link>

        <h1 className="font-mono font-bold text-2xl">Account settings</h1>

        {/* ── Edit Profile ── */}
        <Section title="Profile">
          <form onSubmit={handleProfileSave} className="flex flex-col gap-4">
            {profileMsg && <Alert type={profileMsg.type}>{profileMsg.text}</Alert>}
            <Input
              label="Display name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
            <Input
              label="Username"
              value={username}
              onChange={e => setUsername(e.target.value.slice(0, 20))}
              hint={
                username !== user.username && username
                  ? usernameStatus === 'available'
                    ? <span className="text-xs text-green-400">✓ Available</span>
                    : usernameStatus === 'taken'
                      ? <span className="text-xs text-red-400">✗ Already taken</span>
                      : usernameStatus === 'checking'
                        ? <span className="text-xs text-text-muted">Checking…</span>
                        : <span className="text-xs text-yellow-400">Invalid format</span>
                  : undefined
              }
            />
            <Button type="submit" loading={profileLoading} className="self-start">
              Save changes
            </Button>
          </form>
        </Section>

        {/* 🆕 ── Bio / About me (Feature 5) ── */}
        <Section title="About me">
          <form onSubmit={handleBioSave} className="flex flex-col gap-2">
            {bioMsg && <Alert type={bioMsg.type}>{bioMsg.text}</Alert>}
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value.slice(0, BIO_MAX))}
              rows={3}
              placeholder="Tell people a bit about yourself…"
              className="w-full bg-bg-secondary border border-bg-tertiary rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted font-mono text-sm focus:outline-none focus:border-accent-primary transition-colors resize-none"
            />
            <div className="flex items-center justify-between">
              <span className={`text-xs font-mono ${bio.length >= BIO_MAX ? 'text-red-400' : 'text-text-muted'}`}>
                {bio.length}/{BIO_MAX}
              </span>
              <Button type="submit" loading={bioLoading} className="self-end">
                Save bio
              </Button>
            </div>
          </form>
        </Section>

        {/* ── Change Email ── */}
        <Section title="Email address">
          <p className="text-sm text-text-muted">
            Current: <span className="text-text-primary font-mono">{user.email}</span>
          </p>
          <form onSubmit={handleEmailSave} className="flex flex-col gap-4">
            {emailMsg && <Alert type={emailMsg.type}>{emailMsg.text}</Alert>}
            <Input
              label="New email address"
              type="email"
              placeholder="new@example.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
            />
            <Button type="submit" loading={emailLoading} className="self-start">
              Update email
            </Button>
          </form>
        </Section>

        {/* ── Change Password ── */}
        <Section title="Password">
          <form onSubmit={handlePasswordSave} className="flex flex-col gap-4">
            {pwMsg && <Alert type={pwMsg.type}>{pwMsg.text}</Alert>}
            <Input
              label="Current password"
              type="password"
              placeholder="••••••••"
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              autoComplete="current-password"
            />
            <div>
              <Input
                label="New password"
                type="password"
                placeholder="••••••••"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                autoComplete="new-password"
              />
              {newPw && <PasswordStrength password={newPw} />}
            </div>
            <Input
              label="Confirm new password"
              type="password"
              placeholder="••••••••"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              autoComplete="new-password"
              error={confirmPw && confirmPw !== newPw ? 'Passwords do not match' : undefined}
            />
            <Button type="submit" loading={pwLoading} className="self-start">
              Change password
            </Button>
          </form>
        </Section>

        {/* ── Export ── */}
        <Section title="Data export">
          <p className="text-sm text-text-muted">
            Download all your typing results and profile data as a JSON file.
          </p>
          <Button
            variant="ghost"
            onClick={handleExport}
            loading={exporting}
            className="self-start flex items-center gap-2"
          >
            <Download size={15} />
            Export my data
          </Button>
        </Section>

        {/* ── Danger zone ── */}
        <Section title="Danger zone">
          <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-text-primary font-medium">Delete account</p>
              <p className="text-xs text-text-muted mt-0.5">
                Permanently deletes your account and all associated data. This cannot be undone.
              </p>
            </div>
            <Button variant="danger" onClick={() => setShowDeleteModal(true)} className="shrink-0">
              Delete
            </Button>
          </div>
        </Section>
      </main>

      {/* ── Delete confirmation modal ── */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-secondary border border-bg-tertiary/60 rounded-2xl p-6 w-full max-w-md flex flex-col gap-4"
            >
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle size={20} />
                <h2 className="font-mono font-bold text-lg">Delete account</h2>
              </div>

              <p className="text-sm text-text-muted">
                This will permanently delete your account and all your typing history.
                You can export your data first.
              </p>

              <Button
                variant="ghost"
                onClick={handleExport}
                loading={exporting}
                className="self-start text-xs flex items-center gap-1.5"
              >
                <Download size={13} /> Export data first
              </Button>

              <div>
                <label className="text-xs text-text-muted mb-1 block">
                  Reason for leaving (optional)
                </label>
                <select
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  className="w-full bg-bg-primary border border-bg-tertiary rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
                >
                  <option value="">Prefer not to say</option>
                  <option value="not-useful">Not useful enough</option>
                  <option value="privacy">Privacy concerns</option>
                  <option value="switching">Switching to another app</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <Input
                label='Type "DELETE" to confirm'
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
              />

              <div className="flex gap-3 mt-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  loading={deleteLoading}
                  disabled={deleteConfirmText !== 'DELETE'}
                  className="flex-1"
                >
                  Delete account
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AccountPage;
