// src/components/RequireAuth.tsx
import { useState, useEffect, type ReactNode } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { upsertUser, fetchUser } from '../api';

interface RequireAuthProps {
  children: ReactNode;
  pageName?: string;
}

// ── Gmail prompt shown once per wallet address when email is missing ─────────
function GmailPrompt({ address, onSuccess }: { address: string; onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      // Read existing nickname / color from localStorage
      const nickname = localStorage.getItem(`nickname-${address}`) || '';
      const avatarColor = localStorage.getItem(`avatarColor-${address}`) || '#9F9DF3';
      await upsertUser(address, nickname || address.slice(0, 8), avatarColor, trimmed);
      localStorage.setItem(`email-${address}`, trimmed);
    } catch {
      // save locally even if backend is offline
      localStorage.setItem(`email-${address}`, trimmed);
    } finally {
      setSaving(false);
      onSuccess();
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 24,
          border: '1px solid var(--border)',
          boxShadow: '0 16px 64px rgba(0,0,0,0.2)',
          padding: '2rem',
          width: '100%',
          maxWidth: 380,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        {/* Icon */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--lavender), var(--mint))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
              stroke="var(--deep)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>
              Link your Gmail
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
              So friends can find and pay you by email. This is required to use Community &amp; Friends.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            className="input"
            type="email"
            placeholder="yourname@gmail.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            autoFocus
            required
            style={{ fontSize: '0.95rem' }}
          />
          {error && (
            <p style={{ fontSize: '0.8rem', color: '#c0392b', fontWeight: 500, margin: 0 }}>
              {error}
            </p>
          )}
          <button
            className="btn btn-primary"
            type="submit"
            disabled={saving}
            style={{ marginTop: 4 }}
          >
            {saving ? 'Saving…' : 'Continue →'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main guard ────────────────────────────────────────────────────────────────
export function RequireAuth({ children, pageName = 'this page' }: RequireAuthProps) {
  const account = useCurrentAccount();
  const [emailMissing, setEmailMissing] = useState(false);

  // Check localStorage and backend for email
  useEffect(() => {
    if (!account) {
      setEmailMissing(false);
      return;
    }

    let active = true;
    const checkEmail = async () => {
      const saved = localStorage.getItem(`email-${account.address}`);
      if (saved && saved.trim()) {
        if (active) setEmailMissing(false);
        return;
      }

      // Check if user already entered their email in backend previously
      try {
        const u = await fetchUser(account.address);
        if (!active) return;
        if (u && u.email && u.email.trim()) {
          localStorage.setItem(`email-${account.address}`, u.email.trim());
          setEmailMissing(false);
          return;
        }
      } catch {
        // Backend offline or user not found
      }

      if (active) {
        setEmailMissing(true);
      }
    };

    checkEmail();
    const onStorage = (e: StorageEvent) => {
      if (e.key === `email-${account.address}`) {
        checkEmail();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      active = false;
      window.removeEventListener('storage', onStorage);
    };
  }, [account?.address]);

  // ── Not connected → show wallet connect prompt ──────────────────────────
  if (!account) {
    return (
      <main className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
        <div
          style={{
            textAlign: 'center',
            maxWidth: 360,
            width: '100%',
            padding: '2.5rem 2rem',
            background: 'var(--surface)',
            borderRadius: 24,
            border: '1px solid var(--border)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
          }}
        >
          {/* Lock icon */}
          <div
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--lavender) 0%, var(--mint) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="var(--deep)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>
              Connect to view {pageName}
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
              Connect your Sui wallet to access this page.
            </p>
          </div>

          <div style={{ width: '100%' }}>
            <ConnectButton />
          </div>
        </div>
      </main>
    );
  }

  // ── Connected but email missing → show Gmail prompt overlay ────────────
  return (
    <>
      {children}
      {emailMissing && (
        <GmailPrompt
          address={account.address}
          onSuccess={() => setEmailMissing(false)}
        />
      )}
    </>
  );
}
