// src/components/RequireAuth.tsx
import { useState, useEffect, type ReactNode } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { upsertUser, fetchUser } from '../api';
import { useZkLogin } from '../hooks/useZkLogin';

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
  const walletAccount = useCurrentAccount();
  const { zkAccount, loginWithGoogle, isLoading: isZkLoading } = useZkLogin();

  const activeAddress = walletAccount?.address ?? zkAccount?.address ?? null;
  const isZk = !walletAccount && !!zkAccount;
  const [emailMissing, setEmailMissing] = useState(false);

  // Check email
  useEffect(() => {
    if (!activeAddress) {
      setEmailMissing(false);
      return;
    }

    // zkLogin users already have their email verified by Google
    if (isZk && zkAccount?.email) {
      localStorage.setItem(`email-${activeAddress}`, zkAccount.email);
      setEmailMissing(false);
      return;
    }

    let active = true;
    const checkEmail = async () => {
      const saved = localStorage.getItem(`email-${activeAddress}`);
      if (saved && saved.trim()) {
        if (active) setEmailMissing(false);
        return;
      }

      try {
        const u = await fetchUser(activeAddress);
        if (!active) return;
        if (u && u.email && u.email.trim()) {
          localStorage.setItem(`email-${activeAddress}`, u.email.trim());
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
      if (e.key === `email-${activeAddress}`) {
        checkEmail();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      active = false;
      window.removeEventListener('storage', onStorage);
    };
  }, [activeAddress, isZk, zkAccount?.email]);

  // ── Not connected → show login options ──────────────────────────
  if (!activeAddress) {
    return (
      <main className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
        <div
          style={{
            textAlign: 'center',
            maxWidth: 380,
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
              Sign in with Google zkLogin or connect your Sui wallet to access this page.
            </p>
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              className="btn btn-primary"
              onClick={loginWithGoogle}
              disabled={isZkLoading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: '#fff',
                color: '#3c4043',
                border: '1px solid #dadce0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                fontWeight: 600,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              {isZkLoading ? 'Connecting…' : 'Sign in with Google'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', textTransform: 'uppercase' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <ConnectButton />
            </div>
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
          address={activeAddress}
          onSuccess={() => setEmailMissing(false)}
        />
      )}
    </>
  );
}
