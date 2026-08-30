// src/pages/CommunityPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../components/Avatar';
import {
  CommunityIcon, SplitIcon, PlusIcon, BackIcon,
  ChevronRightIcon, CheckIcon, GroupIcon, EmptyBoxIcon,
} from '../components/Icons';
import { DEMO_COMMUNITIES, DEMO_MEMBERS } from '../constants';
import type { Community, Member } from '../types';

// Small avatar-cluster illustration for community rows
function AvatarCluster({ members }: { members: Member[] }) {
  const shown = members.slice(0, 3);
  const extra = members.length - 3;
  // Each avatar is 32px wide, spaced 22px apart; +badge sits after slot 3
  const containerW = shown.length * 22 + 32 + (extra > 0 ? 22 : 0);
  return (
    <div style={{
      position: 'relative',
      width: containerW,
      minWidth: containerW,
      height: 34,
      flexShrink: 0,
      alignSelf: 'center',
    }}>
      {shown.map((m, idx) => (
        <Avatar
          key={m.id}
          member={m}
          size="sm"
          style={{
            position: 'absolute',
            left: idx * 22,
            top: 1,
            zIndex: 10 - idx,
            border: '2.5px solid #fff',
          }}
        />
      ))}
      {extra > 0 && (
        <div
          className="avatar avatar-sm"
          style={{
            position: 'absolute',
            left: shown.length * 22,
            top: 1,
            background: 'var(--lavender)',
            color: 'var(--deep)',
            fontSize: '0.62rem',
            fontWeight: 700,
            border: '2.5px solid #fff',
          }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}

export function CommunityPage() {
  const navigate = useNavigate();
  const [communities, setCommunities] = useState<Community[]>(DEMO_COMMUNITIES);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMembers, setNewMembers] = useState<Member[]>([]);

  function toggleNewMember(m: Member) {
    if (newMembers.some((x) => x.id === m.id)) {
      setNewMembers((prev) => prev.filter((x) => x.id !== m.id));
    } else {
      setNewMembers((prev) => [...prev, m]);
    }
  }

  function createCommunity() {
    if (!newName.trim()) return;
    const community: Community = {
      id: `custom-${Date.now()}`,
      name: newName.trim(),
      members: newMembers,
      lastActivity: 'Just now',
      description: 'Custom group',
    };
    setCommunities((prev) => [community, ...prev]);
    setNewName('');
    setNewMembers([]);
    setShowCreateModal(false);
  }

  // ── Community detail view ──────────────────────────────────────
  if (selectedCommunity) {
    return (
      <main className="page">
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-12 mb-20">
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setSelectedCommunity(null)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <BackIcon size={18} color="var(--text-2)" strokeWidth={2} />
            </button>
            <div>
              <h2 style={{ fontSize: '1.2rem' }}>{selectedCommunity.name}</h2>
              <p className="text-sm color-text3">
                {selectedCommunity.members.length} members · {selectedCommunity.lastActivity}
              </p>
            </div>
          </div>

          {/* Hero banner */}
          <div
            className="clay-card"
            style={{
              padding: '24px',
              marginBottom: 20,
              background: 'linear-gradient(135deg, rgba(159,157,243,0.18), rgba(255,155,179,0.12))',
            }}
          >
            <AvatarCluster members={selectedCommunity.members} />
            <p className="color-text3 text-sm" style={{ marginTop: 12 }}>
              {selectedCommunity.description}
            </p>
          </div>

          {/* Split CTA */}
          <button
            className="btn btn-primary w-full"
            style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={() => navigate('/split')}
          >
            <SplitIcon size={17} color="#fff" strokeWidth={2} />
            Split with this community
          </button>

          {/* Member list */}
          <p className="section-title" style={{ marginBottom: 10 }}>MEMBERS</p>
          {selectedCommunity.members.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="list-row"
              style={{ cursor: 'default' }}
            >
              <Avatar member={m} />
              <div className="list-row-content">
                <div className="list-row-title">{m.name}</div>
                <div className="list-row-sub">{m.phone ?? m.walletAddress.slice(0, 20) + '…'}</div>
              </div>
              <span className="badge badge-purple">Member</span>
            </motion.div>
          ))}
        </motion.div>
      </main>
    );
  }

  // ── Community list view ────────────────────────────────────────
  return (
    <main className="page">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-12 mb-20">
          <div style={{
            width: 42, height: 42, borderRadius: 14,
            background: 'linear-gradient(135deg, var(--purple), var(--deep))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(99,83,172,0.3)',
          }}>
            <CommunityIcon size={22} color="#fff" strokeWidth={1.8} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem' }}>Communities</h2>
            <p className="color-text3 text-sm">Your groups for quick splits</p>
          </div>
        </div>

        {communities.length === 0 ? (
          <div
            className="clay-card flat"
            style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
          >
            <EmptyBoxIcon size={48} color="var(--lavender)" strokeWidth={1.3} />
            <h3>No communities yet</h3>
            <p className="color-text3 text-sm">Tap the + button to create your first group</p>
          </div>
        ) : (
          <div>
            {communities.map((community, i) => (
              <motion.div
                key={community.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="list-row"
                onClick={() => setSelectedCommunity(community)}
              >
                <AvatarCluster members={community.members} />
                <div className="list-row-content">
                  <div className="list-row-title">{community.name}</div>
                  <div className="list-row-sub">
                    {community.members.length} members · {community.lastActivity}
                  </div>
                </div>
                <ChevronRightIcon size={18} color="var(--text-3)" strokeWidth={2} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* FAB */}
      <motion.button
        className="fab"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.93 }}
        onClick={() => setShowCreateModal(true)}
        aria-label="Create community"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <PlusIcon size={26} color="#fff" strokeWidth={2.2} />
      </motion.button>

      {/* Create community modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}
          >
            <motion.div
              className="modal-sheet"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.28 }}
            >
              <div className="modal-handle" />

              <div className="flex items-center gap-10 mb-20">
                <div style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: 'linear-gradient(135deg, var(--purple), var(--deep))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <GroupIcon size={18} color="#fff" strokeWidth={1.8} />
                </div>
                <h3>Create Community</h3>
              </div>

              <div className="form-group mb-20">
                <label className="form-label">Community Name *</label>
                <input
                  className="input"
                  placeholder="e.g. Dinner Squad"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
              </div>

              <p className="section-title" style={{ marginBottom: 10 }}>ADD FRIENDS</p>
              <div style={{ marginBottom: 20, maxHeight: 260, overflowY: 'auto' }}>
                {DEMO_MEMBERS.map((m) => {
                  const sel = newMembers.some((x) => x.id === m.id);
                  return (
                    <div
                      key={m.id}
                      className="list-row"
                      onClick={() => toggleNewMember(m)}
                      style={{
                        background: sel ? 'rgba(159,157,243,0.12)' : undefined,
                        borderColor: sel ? 'var(--purple)' : undefined,
                      }}
                    >
                      <Avatar member={m} size="sm" />
                      <div className="list-row-content">
                        <div className="list-row-title" style={{ fontSize: '0.9rem' }}>{m.name}</div>
                      </div>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: sel ? 'var(--purple)' : 'var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 200ms',
                      }}>
                        {sel
                          ? <CheckIcon size={12} color="#fff" strokeWidth={2.5} />
                          : <span style={{ color: 'var(--text-3)', fontSize: '1rem', lineHeight: 1 }}>+</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-12">
                <button className="btn btn-ghost flex-1" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary flex-1"
                  disabled={!newName.trim()}
                  onClick={createCommunity}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <PlusIcon size={15} color="#fff" strokeWidth={2.2} />
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
