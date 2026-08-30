// src/pages/ProfilePage.tsx
import { useState } from 'react';
import { useCurrentAccount, useCurrentClient } from '@mysten/dapp-kit-react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Avatar } from '../components/Avatar';
import {
  WalletIcon, ShieldIcon, GlobeIcon, CheckCircleIcon,
  AlertCircleIcon, CopyIcon, EditIcon, HistoryIcon,
  LinkIcon, EmptyBoxIcon, LockIcon,
} from '../components/Icons';
import { Logo } from '../components/Logo';
import { AVATAR_COLORS } from '../constants';

function shortAddr(addr: string) {
  return addr.slice(0, 10) + '…' + addr.slice(-8);
}

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
  const client = useCurrentClient();
  const [displayName, setDisplayName] = useState('');
  const [editing, setEditing] = useState(false);
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [copied, setCopied] = useState(false);

  const { data: txHistory, isLoading: txLoading } = useQuery({
    queryKey: ['tx-history', account?.address],
    enabled: !!account,
    queryFn: async () => {
      if (!account || !client) return [];
      try {
        const result = await client.queryTransactionBlocks({
          filter: { FromAddress: account.address },
          options: { showEffects: true, showInput: true },
          limit: 10,
          order: 'descending',
        });
        return result.data ?? [];
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
  });

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
            {editing ? (
              <div className="flex gap-8 w-full" style={{ maxWidth: 280 }}>
                <input
                  className="input"
                  placeholder="Display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary btn-sm" onClick={() => setEditing(false)}>
                  Save
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ marginBottom: 6 }}>{displayName || 'Anonymous'}</h3>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setEditing(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <EditIcon size={13} color="var(--text-2)" strokeWidth={2} />
                  {displayName ? 'Edit name' : 'Set display name'}
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

        {/* Transaction history */}
        <div className="flex items-center gap-8 mb-12">
          <HistoryIcon size={16} color="var(--text-3)" strokeWidth={2} />
          <p className="section-title" style={{ margin: 0 }}>TRANSACTION HISTORY</p>
        </div>

        {txLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map((n) => (
              <div key={n} className="skeleton" style={{ height: 64, borderRadius: 18 }} />
            ))}
          </div>
        )}

        {!txLoading && txHistory && txHistory.length > 0 && (
          <div>
            {txHistory.map((tx, i) => {
              const digest = tx.digest;
              const shortDigest = digest.slice(0, 8) + '…' + digest.slice(-6);
              const ts = tx.timestampMs
                ? new Date(Number(tx.timestampMs)).toLocaleDateString('en-MY', {
                  month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })
                : 'Unknown time';
              const status = tx.effects?.status?.status ?? 'unknown';
              const success = status === 'success';
              return (
                <motion.a
                  key={digest}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  href={`https://testnet.suivision.xyz/txblock/${digest}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="list-row"
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    width: 40, height: 40,
                    borderRadius: 14,
                    background: success ? 'rgba(201,235,202,0.4)' : 'rgba(255,155,179,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {success
                      ? <CheckCircleIcon size={20} color="#3a7a3c" strokeWidth={2} />
                      : <AlertCircleIcon size={20} color="#c0446b" strokeWidth={2} />}
                  </div>
                  <div className="list-row-content">
                    <div className="list-row-title" style={{ fontSize: '0.88rem', fontFamily: 'monospace' }}>
                      {shortDigest}
                    </div>
                    <div className="list-row-sub">{ts}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`badge ${success ? 'badge-green' : 'badge-pink'}`}>{status}</span>
                    <LinkIcon size={14} color="var(--text-3)" strokeWidth={2} />
                  </div>
                </motion.a>
              );
            })}
          </div>
        )}

        {!txLoading && (!txHistory || txHistory.length === 0) && (
          <div
            className="clay-card flat"
            style={{ padding: '36px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
          >
            <EmptyBoxIcon size={48} color="var(--lavender)" strokeWidth={1.3} />
            <h3>No transactions yet</h3>
            <p className="text-sm color-text3">Your on-chain payment history will appear here</p>
          </div>
        )}
      </motion.div>
    </main>
  );
}
