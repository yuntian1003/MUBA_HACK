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
  LinkIcon, EmptyBoxIcon, LockIcon, EmailIcon,
} from '../components/Icons';
import { AVATAR_COLORS } from '../constants';
import { upsertUser, fetchUser } from '../api';
import { useSuiNSName } from '../hooks/useSuiNS';


// Inline 2-D illustration for the connect screen
function ConnectIllustration() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Wallet body */}
      <rect x="8" y="20" width="56" height="36" rx="10" fill="white" fillOpacity="0.3" stroke="white" strokeWidth="2.5" />
      {/* Card slot */}
      <rect x="8" y="28" width="56" height="2.5" fill="white" fillOpacity="0.6" />
      {/* Coin circle */}
      <circle cx="52" cy="40" r="8" fill="white" fillOpacity="0.4" stroke="white" strokeWidth="2" />
      <circle cx="52" cy="40" r="4" fill="white" fillOpacity="0.7" />
      {/* Lock icon on left */}
      <rect x="20" y="36" width="12" height="9" rx="2.5" fill="white" fillOpacity="0.6" />
      <path d="M22.5 36v-3a3.5 3.5 0 017 0v3" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ProfilePage() {
  const account = useCurrentAccount();
  const queryClient = useQueryClient();
  const { data: suinsDomainName } = useSuiNSName(account?.address);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [editing, setEditing] = useState(false);
  const [attemptedSaveName, setAttemptedSaveName] = useState(false);
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [copied, setCopied] = useState(false);
  const [saveMsg, setSaveMsg] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (account) {
      setDisplayName(localStorage.getItem(`nickname-${account.address}`) || account.label || '');
      setEmail(localStorage.getItem(`email-${account.address}`) || '');
      // Also sync from backend
      fetchUser(account.address).then((u) => {
        if (u) {
          if (u.nickname) setDisplayName(u.nickname);
          if (u.email) setEmail(u.email);
          if (u.avatarColor) setSelectedColor(u.avatarColor);
        }
      }).catch(console.error);
    }
  }, [account]);

  async function handleSave() {
    setAttemptedSaveName(true);
    if (!displayName.trim()) return;
    if (!account) { setEditing(false); return; }
    setSaveMsg('saving');
    try {
      // Save to localStorage for instant offline reads
      localStorage.setItem(`nickname-${account.address}`, displayName.trim());
      if (email.trim()) localStorage.setItem(`email-${account.address}`, email.trim());
      // Sync to backend so others can see the user in Friends/Communities
      await upsertUser(account.address, displayName.trim(), selectedColor, email.trim());
      queryClient.invalidateQueries({ queryKey: ['users'] });
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
      <main className="page">
        <div className="connect-hero">
          <div className="connect-blob">
            <ConnectIllustration />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ marginBottom: 6 }}>Connect Your Sui Wallet</h2>
          </div>
          <ConnectButton />
          <div className="clay-card flat" style={{ padding: '10px 20px', width: 'fit-content', alignSelf: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { Icon: LockIcon, color: '#9F9DF3', text: 'Non-custodial' },
                { Icon: WalletIcon, color: '#FF9BB3', text: 'Sign transactions directly' },
                { Icon: GlobeIcon, color: '#C9EBCA', text: 'Works with Sui Wallet' },
              ].map(({ Icon, color, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 9,
                    background: `${color}22`, border: `1.5px solid ${color}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={15} color={color} strokeWidth={1.9} />
                  </div>
                  <span className="text-sm color-text2" style={{ whiteSpace: 'nowrap' }}>{text}</span>
                </div>
              ))}
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
              <Avatar
                name={account.address}
                color={selectedColor}
                size="xl"
                style={{
                  width: 88, height: 88, fontSize: '1.8rem',
                  boxShadow: `0 8px 32px ${selectedColor}66`,
                }}
              />
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

            {/* Display name */}
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
                <h3 style={{ marginBottom: 4 }}>{displayName || 'Anonymous'}</h3>
                {email ? (
                  <p className="text-xs color-text3" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <EmailIcon size={13} color="var(--text-3)" />
                    {email}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="flex items-center justify-between">
              <span className="text-sm color-text3">Wallet Address</span>
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

            {suinsDomainName && (
              <div className="flex items-center justify-between">
                <span className="text-sm color-text3">SuiNS Domain</span>
                <span
                  className="badge badge-purple"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700 }}
                >
                  🌐 {suinsDomainName}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm color-text3">Network</span>
              <span
                className="badge badge-purple"
                style={{ display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <GlobeIcon size={12} color="var(--deep)" strokeWidth={2.2} />
                Sui Testnet
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm color-text3">Security</span>
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
