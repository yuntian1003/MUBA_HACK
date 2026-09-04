// src/pages/ProfilePage.tsx
import { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Avatar } from '../components/Avatar';
import {
  WalletIcon, ShieldIcon, GlobeIcon, CheckCircleIcon,
  CopyIcon, EditIcon, HistoryIcon,
  LinkIcon, EmptyBoxIcon, EmailIcon,
} from '../components/Icons';
import { AVATAR_COLORS } from '../constants';
import { upsertUser, fetchUser } from '../api';
import { useSuiNSName } from '../hooks/useSuiNS';
import { useZkLogin } from '../hooks/useZkLogin';

function GoogleLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

export function ProfilePage() {
  const walletAccount = useCurrentAccount();
  const { zkAccount, loginWithGoogle, isLoading: isZkLoading } = useZkLogin();

  const account = walletAccount
    ? { address: walletAccount.address, label: walletAccount.label, isZk: false }
    : zkAccount
    ? { address: zkAccount.address, label: zkAccount.name, isZk: true }
    : null;

  const queryClient = useQueryClient();
  const [linkedZkAddress, setLinkedZkAddress] = useState<string>(() => {
    return localStorage.getItem('linkedZkAddress') || '';
  });
  const [linkedWalletAddress, setLinkedWalletAddress] = useState<string>(() => {
    const raw = localStorage.getItem('linkedWalletAddress') || '';
    return raw.toLowerCase().startsWith('0xa91cf') ? '' : raw;
  });
  const [savedSuiNS, setSavedSuiNS] = useState<string>('');

  const effectiveWalletAddr = walletAccount?.address || (account?.isZk ? linkedWalletAddress : account?.address);
  const { data: suinsDomainName } = useSuiNSName(effectiveWalletAddr, account?.address);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [editing, setEditing] = useState(false);
  const [attemptedSaveName, setAttemptedSaveName] = useState(false);
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [copied, setCopied] = useState(false);
  const [copiedLinked, setCopiedLinked] = useState(false);
  const [saveMsg, setSaveMsg] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const userHandle = displayName?.trim() || (email ? email.split('@')[0] : '') || zkAccount?.name || '';
  // Real on-chain resolved name or database registered .sui domain only, no spaces or fake domains
  const effectiveSuiNS = suinsDomainName || savedSuiNS || (userHandle?.toLowerCase().endsWith('.sui') && !userHandle.includes(' ') ? userHandle.toLowerCase() : null);

  useEffect(() => {
    if (!account) return;

    // Purge any stale test wallet address from previous sessions
    if (localStorage.getItem('linkedWalletAddress')?.toLowerCase().startsWith('0xa91cf')) {
      localStorage.removeItem('linkedWalletAddress');
    }

    const localNick = localStorage.getItem(`nickname-${account.address}`);
    const localEmail = localStorage.getItem(`email-${account.address}`);
    const userEmailVal = localEmail || zkAccount?.email || '';

    // If nickname/email not set on this wallet address yet, inherit from Google zkAccount!
    const initialName = localNick || zkAccount?.name || account.label || (userEmailVal ? userEmailVal.split('@')[0] : '');
    const initialEmail = userEmailVal;

    setDisplayName(initialName);
    setEmail(initialEmail);

    // Sync from backend
    fetchUser(account.address).then(async (u) => {
      let currentEmail = initialEmail;

      if (u) {
        if (u.nickname) setDisplayName(u.nickname);
        else if (initialName) setDisplayName(initialName);

        if (u.email) {
          setEmail(u.email);
          currentEmail = u.email;
        } else if (initialEmail) setEmail(initialEmail);

        if (u.avatarColor) setSelectedColor(u.avatarColor);
        if (u.suins) setSavedSuiNS(u.suins);
      }

      const activeWallet = walletAccount?.address || '';
      const realZk = zkAccount?.address || u?.linkedZkAddress || localStorage.getItem('linkedZkAddress') || '';
      let backendWallet = u?.linkedWalletAddress && !u.linkedWalletAddress.toLowerCase().startsWith('0xa91cf') ? u.linkedWalletAddress : '';

      // If zkLogin user has no linked wallet yet, find wallet with same email that has suins
      if (account.isZk && !backendWallet && !activeWallet && currentEmail) {
        try {
          const users = await fetchUsers(currentEmail);
          const match = users.find((mu: any) =>
            mu.email?.toLowerCase() === currentEmail.toLowerCase() &&
            mu.address?.toLowerCase() !== account.address.toLowerCase() &&
            !mu.address?.toLowerCase().startsWith('0xa91cf')
          );
          if (match?.address) {
            backendWallet = match.address;
            if (match.suins) setSavedSuiNS(match.suins);
          }
        } catch (e) {}
      }

      const rawStoredWallet = localStorage.getItem('linkedWalletAddress') || '';
      const storedWallet = rawStoredWallet.toLowerCase().startsWith('0xa91cf') ? '' : rawStoredWallet;
      const realWallet = activeWallet || backendWallet || storedWallet;

      if (activeWallet) {
        localStorage.setItem('linkedWalletAddress', activeWallet);
      } else if (realWallet) {
        localStorage.setItem('linkedWalletAddress', realWallet);
      }

      setLinkedZkAddress(realZk);
      setLinkedWalletAddress(realWallet);

      if (realZk) localStorage.setItem('linkedZkAddress', realZk);

      // Save real connected addresses to backend profile
      // Only pass linked addresses that are DIFFERENT from the current account to avoid self-loops
      if (account.address) {
        const linkPayload: { linkedWalletAddress?: string; linkedZkAddress?: string } = {};
        if (account.isZk) {
          // zkLogin user: only set linkedWalletAddress (the Slush wallet link)
          if (realWallet && realWallet.toLowerCase() !== account.address.toLowerCase()) {
            linkPayload.linkedWalletAddress = realWallet;
          }
        } else {
          // Wallet user: only set linkedZkAddress (the Google account link)
          if (realZk && realZk.toLowerCase() !== account.address.toLowerCase()) {
            linkPayload.linkedZkAddress = realZk;
          }
        }
        upsertUser(account.address, displayName || initialName || 'Friend', selectedColor, currentEmail, linkPayload).catch(console.error);
      }
    }).catch(console.error);
  }, [account?.address, zkAccount, walletAccount?.address]);

  async function handleSave() {
    setAttemptedSaveName(true);
    if (!displayName.trim()) return;
    if (!account) { setEditing(false); return; }
    setSaveMsg('saving');
    try {
      localStorage.setItem(`nickname-${account.address}`, displayName.trim());
      if (email.trim()) localStorage.setItem(`email-${account.address}`, email.trim());
      
      const finalZk = account.isZk ? undefined : (zkAccount?.address || linkedZkAddress);
      const finalWallet = account.isZk ? (walletAccount?.address || linkedWalletAddress) : undefined;
      await upsertUser(account.address, displayName.trim(), selectedColor, email.trim(), {
        linkedZkAddress: finalZk,
        linkedWalletAddress: finalWallet,
      });
      if (finalWallet) localStorage.setItem('linkedWalletAddress', finalWallet);
      if (finalZk) localStorage.setItem('linkedZkAddress', finalZk);

      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      setSaveMsg('saved');
      setTimeout(() => setSaveMsg('idle'), 2500);
    } catch {
      setSaveMsg('error');
      setTimeout(() => setSaveMsg('idle'), 2500);
    }
    setEditing(false);
  }

  async function copyAddress() {
    if (!account) return;
    await navigator.clipboard.writeText(account.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Not connected ────────────────────────────────────────────
  if (!account) {
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
          <div
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--lavender) 0%, var(--mint) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <WalletIcon size={28} color="var(--deep)" strokeWidth={1.9} />
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>
              Connect Your Account
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
              Sign in with Google zkLogin or connect your Sui wallet (Slush / Sui Wallet) to view your profile.
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

  // ── Connected ────────────────────────────────────────────────
  return (
    <main className="page">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-12 mb-20">
          <div style={{
            width: 42, height: 42, borderRadius: 14,
            background: 'linear-gradient(135deg, #D5D6F2, #9F9DF3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(159,157,243,0.3)',
          }}>
            <WalletIcon size={22} color="var(--deep)" strokeWidth={1.9} />
          </div>
          <h2 style={{ fontSize: '1.25rem' }}>Profile</h2>
        </div>

        {/* Profile card */}
        <div className="clay-card" style={{ padding: '28px 24px', marginBottom: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            {/* Avatar */}
            <div style={{ position: 'relative' }}>
              {zkAccount?.picture ? (
                <img
                  src={zkAccount.picture}
                  alt="Avatar"
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: '50%',
                    boxShadow: `0 8px 32px ${selectedColor}66`,
                    border: `3.5px solid ${selectedColor}`,
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <Avatar
                  name={displayName || zkAccount?.name || suinsDomainName || account.address}
                  color={selectedColor}
                  size="xl"
                  style={{
                    width: 88,
                    height: 88,
                    fontSize: '1.8rem',
                    boxShadow: `0 8px 32px ${selectedColor}66`,
                  }}
                />
              )}
              <button
                onClick={() => setEditing(true)}
                style={{
                  position: 'absolute', bottom: -4, right: -4,
                  width: 30, height: 30,
                  background: 'white',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'var(--shadow-sm)',
                  border: '1.5px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                <EditIcon size={14} color="var(--deep)" strokeWidth={2} />
              </button>
            </div>

            {/* Color picker */}
            {editing && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: c,
                      border: selectedColor === c
                        ? '3px solid var(--deep)'
                        : '2.5px solid white',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {selectedColor === c && (
                      <CheckCircleIcon size={14} color="white" strokeWidth={2.5} />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Display name & Email */}
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 280 }}>
                <div>
                  <label className="text-xs color-text3 font-semibold mb-2 block">Display Name *</label>
                  <input
                    className="input"
                    placeholder="Display name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    autoFocus
                  />
                  {attemptedSaveName && !displayName.trim() && (
                    <p className="text-xs" style={{ color: '#c0392b', margin: '2px 0 0 2px', fontWeight: 500 }}>
                      * Display name cannot be empty
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs color-text3 font-semibold mb-2 block">Gmail / Email</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="e.g. yourname@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="text-xs color-text3" style={{ marginTop: 4 }}>
                    Allows friends to find you by email
                  </p>
                </div>

                <div className="flex gap-8 mt-4">
                  <button
                    className="btn btn-ghost btn-sm flex-1"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary btn-sm flex-1"
                    disabled={saveMsg === 'saving'}
                    onClick={handleSave}
                  >
                    {saveMsg === 'saving' ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ marginBottom: 4 }}>{effectiveSuiNS || displayName || zkAccount?.name || userHandle || 'Anonymous'}</h3>
                {effectiveSuiNS && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                    <span
                      className="badge badge-purple"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontWeight: 700,
                        fontSize: '0.86rem',
                        padding: '4px 14px',
                        borderRadius: 20,
                        background: 'linear-gradient(135deg, rgba(159,157,243,0.18), rgba(159,157,243,0.32))',
                        color: 'var(--deep)',
                        border: '1px solid rgba(159,157,243,0.4)',
                      }}
                    >
                      🌐 {effectiveSuiNS}
                    </span>
                  </div>
                )}
                {(email || zkAccount?.email) ? (
                  <p className="text-xs color-text3" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <EmailIcon size={13} color="var(--text-3)" />
                    {email || zkAccount?.email}
                  </p>
                ) : (
                  <p className="text-xs color-text3" style={{ marginBottom: 8, fontStyle: 'italic' }}>
                    No email linked
                  </p>
                )}
                {saveMsg === 'saved' && (
                  <p className="text-sm" style={{ color: '#3a7a3c', marginBottom: 6 }}>✅ Profile saved to server!</p>
                )}
                {saveMsg === 'error' && (
                  <p className="text-sm" style={{ color: '#c0446b', marginBottom: 6 }}>⚠️ Saved locally only (server offline)</p>
                )}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setEditing(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, margin: '0 auto' }}
                >
                  <EditIcon size={13} color="var(--text-2)" strokeWidth={2} />
                  {displayName ? 'Edit profile' : 'Set profile details'}
                </button>
              </div>
            )}
          </div>

          <div className="divider" />

          {/* Wallet details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="flex items-center justify-between">
              <span className="text-sm color-text3 font-medium">
                {account.isZk ? 'zkLogin Address (Connected)' : 'Sui Wallet Address (Connected)'}
              </span>
              <span
                className="badge badge-green"
                style={{ display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#4caf50', display: 'inline-block',
                }} />
                Connected
              </span>
            </div>

            <button
              onClick={copyAddress}
              style={{
                background: 'rgba(159,157,243,0.08)',
                borderRadius: 12,
                padding: '10px 14px',
                fontFamily: 'monospace',
                fontSize: '0.82rem',
                color: 'var(--deep)',
                wordBreak: 'break-all',
                letterSpacing: '0.04em',
                cursor: 'pointer',
                border: '1.5px solid rgba(159,157,243,0.18)',
                width: '100%',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                transition: 'background 200ms',
              }}
            >
              <span style={{ flex: 1 }}>{account.address}</span>
              {copied
                ? <CheckCircleIcon size={16} color="#3a7a3c" strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
                : <CopyIcon size={16} color="var(--text-3)" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />}
            </button>

            <div className="flex items-center justify-between">
              <span className="text-sm color-text3 font-medium">SuiNS Domain</span>
              {effectiveSuiNS ? (
                <span
                  className="badge badge-purple"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700 }}
                >
                  🌐 {effectiveSuiNS}
                </span>
              ) : (
                <span className="text-xs color-text3" style={{ fontStyle: 'italic' }}>
                  No .sui domain registered for address
                </span>
              )}
            </div>

            {/* ── Linked Identity Card (Swaps depending on whether logged in via zkLogin or Wallet) ── */}
            {account.isZk ? (
              /* When in zkLogin mode: show Linked Sui Wallet (Slush Wallet) */
              <div
                style={{
                  marginTop: 4,
                  padding: '14px 16px',
                  borderRadius: 16,
                  background: (walletAccount?.address || linkedWalletAddress) ? 'rgba(201, 235, 202, 0.25)' : 'rgba(0, 0, 0, 0.02)',
                  border: (walletAccount?.address || linkedWalletAddress) ? '1.5px solid rgba(58, 122, 60, 0.3)' : '1px dashed var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div className="flex items-center justify-between">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <WalletIcon size={17} color="var(--deep)" />
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--deep)' }}>
                      Sui Wallet (Slush Wallet)
                    </span>
                  </div>
                  {(walletAccount?.address || linkedWalletAddress) ? (
                    <span
                      className="badge badge-green"
                      style={{ fontSize: '0.74rem', padding: '3px 8px', fontWeight: 700 }}
                    >
                      🔗 Linked
                    </span>
                  ) : (
                    <span
                      className="badge"
                      style={{ fontSize: '0.74rem', padding: '3px 8px', background: 'rgba(0,0,0,0.06)', color: 'var(--text-3)' }}
                    >
                      Not linked
                    </span>
                  )}
                </div>

                {(walletAccount?.address || linkedWalletAddress) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="text-xs color-text3">Slush Wallet On-Chain Address</span>
                    <button
                      type="button"
                      onClick={async () => {
                        const targetAddr = walletAccount?.address || linkedWalletAddress;
                        await navigator.clipboard.writeText(targetAddr);
                        setCopiedLinked(true);
                        setTimeout(() => setCopiedLinked(false), 2000);
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.85)',
                        borderRadius: 10,
                        padding: '8px 12px',
                        fontFamily: 'monospace',
                        fontSize: '0.78rem',
                        color: 'var(--deep)',
                        wordBreak: 'break-all',
                        cursor: 'pointer',
                        border: '1.5px solid rgba(58, 122, 60, 0.25)',
                        width: '100%',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 6,
                      }}
                    >
                      <span style={{ flex: 1 }}>{walletAccount?.address || linkedWalletAddress}</span>
                      {copiedLinked
                        ? <CheckCircleIcon size={14} color="#3a7a3c" strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
                        : <CopyIcon size={14} color="var(--text-3)" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p className="text-xs color-text3" style={{ margin: 0, lineHeight: 1.4 }}>
                      Connect your Slush wallet while signed in to link them. Your SuiNS domain and on-chain contacts will be shared across both logins.
                    </p>
                    <div style={{ alignSelf: 'flex-start' }}>
                      <ConnectButton />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* When in Wallet mode: show Linked Google zkLogin Identity */
              <div
                style={{
                  marginTop: 4,
                  padding: '14px 16px',
                  borderRadius: 16,
                  background: (zkAccount?.address || linkedZkAddress) ? 'rgba(159, 157, 243, 0.08)' : 'rgba(0, 0, 0, 0.02)',
                  border: (zkAccount?.address || linkedZkAddress) ? '1.5px solid rgba(159, 157, 243, 0.25)' : '1px dashed var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div className="flex items-center justify-between">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <GoogleLogo size={17} />
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--deep)' }}>
                      Google zkLogin Identity
                    </span>
                  </div>
                  {(zkAccount?.address || linkedZkAddress) ? (
                    <span
                      className="badge badge-green"
                      style={{ fontSize: '0.74rem', padding: '3px 8px', fontWeight: 700 }}
                    >
                      🔗 Linked
                    </span>
                  ) : (
                    <span
                      className="badge"
                      style={{ fontSize: '0.74rem', padding: '3px 8px', background: 'rgba(0,0,0,0.06)', color: 'var(--text-3)' }}
                    >
                      Not linked
                    </span>
                  )}
                </div>

                {(zkAccount?.address || linkedZkAddress) ? (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span className="text-xs color-text3">Google Account</span>
                      <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--deep)' }}>
                        {email || zkAccount?.email} {displayName ? `(${displayName})` : ''}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span className="text-xs color-text3">zkLogin On-Chain Address</span>
                      <button
                        type="button"
                        onClick={async () => {
                          const targetAddr = zkAccount?.address || linkedZkAddress;
                          if (targetAddr) {
                            await navigator.clipboard.writeText(targetAddr);
                            setCopiedLinked(true);
                            setTimeout(() => setCopiedLinked(false), 2000);
                          }
                        }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.85)',
                          borderRadius: 10,
                          padding: '8px 12px',
                          fontFamily: 'monospace',
                          fontSize: '0.78rem',
                          color: 'var(--deep)',
                          wordBreak: 'break-all',
                          cursor: 'pointer',
                          border: '1px solid rgba(159, 157, 243, 0.2)',
                          width: '100%',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 6,
                        }}
                      >
                        <span style={{ flex: 1 }}>{zkAccount?.address || linkedZkAddress}</span>
                        {copiedLinked
                          ? <CheckCircleIcon size={14} color="#3a7a3c" strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
                          : <CopyIcon size={14} color="var(--text-3)" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />}
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p className="text-xs color-text3" style={{ margin: 0, lineHeight: 1.4 }}>
                      Link your Google account so your Gmail is tied to this wallet. Friends will be able to find and split expenses with you by email.
                    </p>
                    <button
                      type="button"
                      onClick={() => loginWithGoogle()}
                      disabled={isZkLoading}
                      className="btn btn-sm"
                      style={{
                        background: 'white',
                        border: '1.5px solid var(--border)',
                        color: 'var(--deep)',
                        fontWeight: 700,
                        alignSelf: 'flex-start',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 14px',
                        borderRadius: 12,
                        boxShadow: 'var(--shadow-sm)',
                        cursor: 'pointer',
                      }}
                    >
                      <GoogleLogo size={14} />
                      {isZkLoading ? 'Connecting Google…' : 'Link with Google'}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between" style={{ marginTop: 2 }}>
              <span className="text-sm color-text3 font-medium">Network</span>
              <span
                className="badge badge-purple"
                style={{ display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <GlobeIcon size={12} color="var(--deep)" strokeWidth={2.2} />
                Sui Testnet
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm color-text3 font-medium">Security</span>
              <span
                className="badge badge-green"
                style={{ display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <ShieldIcon size={12} color="#3a7a3c" strokeWidth={2.2} />
                Non-custodial
              </span>
            </div>
          </div>
        </div>

        {/* Transaction history link */}
        <div className="flex items-center gap-8 mb-12">
          <HistoryIcon size={16} color="var(--text-3)" strokeWidth={2} />
          <p className="section-title" style={{ margin: 0 }}>TRANSACTION HISTORY</p>
        </div>

        <div
          className="clay-card flat"
          style={{ padding: '36px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
        >
          <EmptyBoxIcon size={48} color="var(--lavender)" strokeWidth={1.3} />
          <h3>View on Explorer</h3>
          <p className="text-sm color-text3">Tap below to see your full transaction history on SuiVision</p>
          <a
            href={`https://testnet.suivision.xyz/account/${account?.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <LinkIcon size={14} color="var(--deep)" strokeWidth={2} />
            Open SuiVision
          </a>
        </div>
      </motion.div>
    </main>
  );
}
