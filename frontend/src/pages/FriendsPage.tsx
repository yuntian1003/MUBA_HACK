// src/pages/FriendsPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../components/Avatar';
import {
  FriendsIcon, SearchIcon, TransferIcon, ReceiveIcon,
  ViewProfileIcon, PayIcon, ChevronRightIcon, EmptyBoxIcon,
} from '../components/Icons';
import { fetchUsers } from '../api';
import { apiUserToMember } from '../types';
import type { Member } from '../types';

export function FriendsPage() {
  const navigate = useNavigate();
  const [selectedFriend, setSelectedFriend] = useState<Member | null>(null);
  const [search, setSearch] = useState('');

  // ── Fetch all users from backend ────────────────────────────
  const { data: rawUsers = [], isLoading, isError } = useQuery({
    queryKey: ['users', search],
    queryFn: () => fetchUsers(search),
    staleTime: 20_000,
  });

  const friends: Member[] = rawUsers.map(apiUserToMember);

  function handleAction(action: 'profile' | 'transfer' | 'request') {
    setSelectedFriend(null);
    if (action === 'transfer' || action === 'request') navigate('/split');
  }

  return (
    <main className="page">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        {/* Page header */}
        <div className="flex items-center gap-12 mb-20">
          <div style={{
            width: 42, height: 42, borderRadius: 14,
            background: 'linear-gradient(135deg, var(--pink), #e0607e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(255,155,179,0.35)',
          }}>
            <FriendsIcon size={22} color="#fff" strokeWidth={1.8} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem' }}>Friends</h2>
            <p className="color-text3 text-sm">{friends.length} contacts</p>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 24 }}>
          <SearchIcon
            size={17}
            color="var(--text-3)"
            strokeWidth={2}
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
          <input
            className="input"
            placeholder="Search by name or address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 40 }}
          />
        </div>

        {/* Loading state */}
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map((n) => (
              <div key={n} className="skeleton" style={{ height: 64, borderRadius: 18 }} />
            ))}
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="clay-card flat" style={{ padding: '24px', textAlign: 'center' }}>
            <p className="color-text3 text-sm">⚠️ Could not connect to server. Make sure the backend is running on port 3000.</p>
          </div>
        )}

        {/* Avatar grid */}
        {!isLoading && !isError && friends.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
            {friends.map((m, i) => (
              <motion.button
                key={m.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06, type: 'spring', bounce: 0.4 }}
                onClick={() => setSelectedFriend(m)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                }}
              >
                <Avatar
                  member={m}
                  size="lg"
                  style={{
                    width: 68, height: 68, fontSize: '1.3rem',
                    boxShadow: `0 6px 18px ${m.avatarColor}55`,
                    transition: 'transform 220ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 220ms',
                  }}
                />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)', textAlign: 'center' }}>
                  {m.name.split(' ')[0]}
                </span>
              </motion.button>
            ))}
          </div>
        )}

        {/* List view */}
        {!isLoading && !isError && (
          <>
            <p className="section-title" style={{ marginBottom: 10 }}>ALL CONTACTS</p>
            {friends.length > 0 ? (
              friends.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="list-row"
                  onClick={() => setSelectedFriend(m)}
                >
                  <Avatar member={m} />
                  <div className="list-row-content">
                    <div className="list-row-title">{m.name}</div>
                    <div className="list-row-sub" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {m.walletAddress.slice(0, 20)}…
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={(e) => { e.stopPropagation(); navigate('/split'); }}
                    style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <PayIcon size={13} color="#fff" strokeWidth={2} />
                    Pay
                  </button>
                </motion.div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <EmptyBoxIcon size={48} color="var(--lavender)" strokeWidth={1.3} />
                {search
                  ? <p className="color-text3">No users found for "{search}"</p>
                  : <p className="color-text3">No users yet. Save your profile to appear here!</p>
                }
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Friend action popup */}
      <AnimatePresence mode="wait">
        {selectedFriend && (
          <motion.div
            key="friend-overlay"
            className="modal-overlay centered"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1, ease: 'linear' }}
            onClick={(e) => e.target === e.currentTarget && setSelectedFriend(null)}
          >
            <motion.div
              className="modal-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
            >
              {/* Friend info */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <Avatar
                  member={selectedFriend}
                  size="xl"
                  style={{
                    width: 80, height: 80, fontSize: '1.6rem',
                    boxShadow: `0 8px 32px ${selectedFriend.avatarColor}66`,
                  }}
                />
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ marginBottom: 4 }}>{selectedFriend.name}</h3>
                  <p
                    className="text-xs color-text3 truncate"
                    style={{ maxWidth: 220, margin: '4px auto 0', fontFamily: 'monospace' }}
                  >
                    {selectedFriend.walletAddress}
                  </p>
                </div>
              </div>

              <div className="divider" style={{ margin: '0 0 16px' }} />

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  {
                    action: 'profile' as const,
                    Icon: ViewProfileIcon,
                    label: 'View Profile',
                    sub: 'See transaction history',
                    bg: 'rgba(213,214,242,0.4)',
                    border: 'rgba(159,157,243,0.2)',
                    labelColor: 'var(--text-1)',
                  },
                  {
                    action: 'transfer' as const,
                    Icon: TransferIcon,
                    label: 'Transfer Money',
                    sub: `Send SUI to ${selectedFriend.name.split(' ')[0]}`,
                    bg: 'rgba(159,157,243,0.12)',
                    border: 'rgba(159,157,243,0.28)',
                    labelColor: 'var(--deep)',
                  },
                  {
                    action: 'request' as const,
                    Icon: ReceiveIcon,
                    label: 'Request Payment',
                    sub: `Ask ${selectedFriend.name.split(' ')[0]} to pay you`,
                    bg: 'rgba(255,155,179,0.12)',
                    border: 'rgba(255,155,179,0.28)',
                    labelColor: '#c0446b',
                  },
                ].map(({ action, Icon, label, sub, bg, border, labelColor }) => (
                  <button
                    key={action}
                    onClick={() => handleAction(action)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px',
                      background: bg,
                      border: `1.5px solid ${border}`,
                      borderRadius: 16,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'Outfit, sans-serif',
                      width: '100%',
                      transition: 'transform 200ms cubic-bezier(0.34,1.56,0.64,1)',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: bg, border: `1.5px solid ${border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={20} color={labelColor} strokeWidth={1.8} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: labelColor }}>{label}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{sub}</div>
                    </div>
                    <ChevronRightIcon size={16} color="var(--text-3)" strokeWidth={2} style={{ marginLeft: 'auto' }} />
                  </button>
                ))}
              </div>

              <button
                className="btn btn-ghost w-full mt-12 text-sm"
                onClick={() => setSelectedFriend(null)}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
