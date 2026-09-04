import { useState } from 'react';
import { RequireAuth } from '../components/RequireAuth';
import { useNavigate } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../components/Avatar';
import {
  FriendsIcon, SearchIcon, TransferIcon, ReceiveIcon,
  ViewProfileIcon, PayIcon, ChevronRightIcon, EmptyBoxIcon,
  PlusIcon, UserPlusIcon, CheckIcon,
} from '../components/Icons';
import {
  fetchFriends,
  removeFriend,
  sendFriendRequest,
  fetchFriendRequests,
  updateFriendRequest,
  fetchUser,
} from '../api';
import { apiUserToMember } from '../types';
import type { Member } from '../types';
import { AVATAR_COLORS } from '../constants';
import { useSuiNSAddress, useSuiNSName } from '../hooks/useSuiNS';
import { useZkLogin } from '../hooks/useZkLogin';

export interface FriendRequestItem {
  id: string;
  name: string;
  avatarColor: string;
  email?: string;
  walletAddress?: string;
  suinsDomain?: string;
  timestamp: string;
  status: 'pending' | 'accepted' | 'rejected' | 'sent';
}

function formatRelativeTime(timestamp?: number): string {
  if (!timestamp) return 'Recently';
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'Just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} mins ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} hours ago`;
  if (diff < 172800_000) return 'Yesterday';
  return `${Math.floor(diff / 86400_000)} days ago`;
}

type TabType = 'all' | 'requests' | 'sent';

function FriendsPageInner() {
  const account = useCurrentAccount();
  const { zkAccount } = useZkLogin();
  const ownerAddress = (account?.address ?? zkAccount?.address ?? '').toLowerCase();

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedFriend, setSelectedFriend] = useState<Member | null>(null);
  const [search, setSearch] = useState('');

  // ── Current user profile ────────────────────────────────────
  const { data: myProfile } = useQuery({
    queryKey: ['my-profile', ownerAddress],
    queryFn: () => fetchUser(ownerAddress),
    enabled: !!ownerAddress,
  });

  const myEffectiveEmail = (myProfile?.email || zkAccount?.email || '').toLowerCase().trim();
  const myName = myProfile?.nickname || zkAccount?.name || (ownerAddress ? `${ownerAddress.slice(0, 6)}…` : 'Friend');
  const myAvatarColor = myProfile?.avatarColor || AVATAR_COLORS[0];

  const { data: mySuiNSName } = useSuiNSName(ownerAddress);

  // ── Fetch Friend Requests from Backend ──────────────────────
  const { data: requestsData } = useQuery({
    queryKey: ['friend-requests', ownerAddress, myEffectiveEmail],
    queryFn: () => fetchFriendRequests(ownerAddress, myEffectiveEmail),
    enabled: !!ownerAddress || !!myEffectiveEmail,
    refetchInterval: 4000,
  });

  const incomingRequests: FriendRequestItem[] = (requestsData?.incoming || []).map((r: any) => ({
    id: r.id,
    name: r.senderName || 'Friend',
    avatarColor: r.senderAvatarColor || AVATAR_COLORS[0],
    email: r.senderEmail || undefined,
    walletAddress: r.senderAddress,
    suinsDomain: r.senderSuins || undefined,
    timestamp: formatRelativeTime(r.createdAt),
    status: r.status as 'pending' | 'accepted' | 'rejected',
  }));

  const sentRequests: FriendRequestItem[] = (requestsData?.outgoing || []).map((r: any) => ({
    id: r.id,
    name: r.recipientName || 'Friend',
    avatarColor: AVATAR_COLORS[1],
    email: r.recipientEmail || (r.recipientAddress ? (r.recipientAddress.length > 14 ? `${r.recipientAddress.slice(0, 8)}…` : r.recipientAddress) : undefined),
    walletAddress: r.recipientAddress,
    suinsDomain: r.recipientSuins || undefined,
    timestamp: formatRelativeTime(r.createdAt),
    status: r.status === 'pending' ? 'sent' : (r.status as 'accepted' | 'rejected' | 'sent'),
  }));

  // ── Add Friend Modal State (SuiNS Domain Only) ──────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [attemptedAddFriend, setAttemptedAddFriend] = useState(false);
  const [friendName, setFriendName] = useState('');
  const [suinsInput, setSuinsInput] = useState('');
  const { data: suinsResolvedAddr, isLoading: isSuinsResolving } = useSuiNSAddress(suinsInput);
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);

  // ── Fetch THIS user's friends from backend ────────────────
  const { data: rawUsers = [], isLoading, isError } = useQuery({
    queryKey: ['friends', ownerAddress, search],
    queryFn: () => fetchFriends(ownerAddress, search),
    enabled: !!ownerAddress,
    staleTime: 10_000,
  });

  // Map to Member type — already excludes self since friends subcollection won't have own address
  const friends: Member[] = rawUsers.map(apiUserToMember);

  // ── Accept / Reject handlers ────────────────────────────────
  async function handleAccept(reqItem: FriendRequestItem) {
    try {
      await updateFriendRequest(reqItem.id, 'accepted', {
        address: ownerAddress,
        name: myName,
        avatarColor: myAvatarColor,
        email: myEffectiveEmail,
      });
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['friends', ownerAddress] });
    } catch (e) {
      console.error('Failed to accept friend request:', e);
    }
  }

  async function handleReject(reqId: string) {
    try {
      await updateFriendRequest(reqId, 'rejected');
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    } catch (e) {
      console.error('Failed to reject friend request:', e);
    }
  }

  async function handleCancelSent(reqId: string) {
    try {
      await updateFriendRequest(reqId, 'canceled');
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    } catch (e) {
      console.error('Failed to cancel sent request:', e);
    }
  }

  async function handleRemoveFriend(friend: Member) {
    try {
      if (friend.walletAddress) {
        await removeFriend(ownerAddress, friend.walletAddress);
      }
      queryClient.invalidateQueries({ queryKey: ['friends', ownerAddress] });
    } catch (e) {
      console.error('Failed to remove friend:', e);
    }
    setSelectedFriend(null);
  }

  const normalizedSuinsDomain = suinsInput.trim()
    ? (suinsInput.trim().toLowerCase().endsWith('.sui') ? suinsInput.trim().toLowerCase() : `${suinsInput.trim().toLowerCase()}.sui`)
    : '';

  const effectiveFriendName = friendName.trim() || normalizedSuinsDomain;

  const isSelfResolved = Boolean(
    ownerAddress && suinsResolvedAddr && suinsResolvedAddr.toLowerCase() === ownerAddress.toLowerCase()
  );

  // ── Add Friend Mutation (Send Request via SuiNS Domain) ─────────
  const addFriendMutation = useMutation({
    mutationFn: async () => {
      if (!suinsResolvedAddr) {
        throw new Error('Please enter a valid SuiNS domain');
      }

      await sendFriendRequest({
        senderAddress: ownerAddress,
        senderName: myName,
        senderAvatarColor: selectedColor || myAvatarColor,
        senderEmail: myEffectiveEmail,
        senderSuins: mySuiNSName || undefined,
        recipientAddress: suinsResolvedAddr,
        recipientName: effectiveFriendName,
        recipientSuins: normalizedSuinsDomain,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      setShowAddModal(false);
      setFriendName('');
      setSuinsInput('');
      setAttemptedAddFriend(false);
      // Automatically switch to Sent Requests tab so user can see it pending
      setActiveTab('sent');
    },
  });

  function handleAction(action: 'profile' | 'transfer' | 'request') {
    if (selectedFriend) {
      if (action === 'transfer') {
        navigate('/split', { state: { preselectedMember: selectedFriend, direction: 'pay' } });
      } else if (action === 'request') {
        navigate('/split', { state: { preselectedMember: selectedFriend, direction: 'receive' } });
      }
    }
    setSelectedFriend(null);
  }

  const isAddValid = Boolean(
    suinsResolvedAddr &&
    suinsResolvedAddr.startsWith('0x') &&
    !isSelfResolved &&
    !isSuinsResolving
  );

  const pendingIncomingCount = incomingRequests.filter((r) => r.status === 'pending').length;

  return (
    <main className="page">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        {/* Page header */}
        <div className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-12">
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
              <p className="color-text3 text-sm">
                {activeTab === 'all'
                  ? `${friends.length} contacts`
                  : activeTab === 'requests'
                  ? `${incomingRequests.length} incoming requests`
                  : `${sentRequests.length} sent requests`}
              </p>
            </div>
          </div>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 'var(--r-full)' }}
          >
            <PlusIcon size={16} color="#fff" strokeWidth={2.4} />
            Add Friend
          </button>
        </div>

        {/* ── Tabs Segmented Control ─────────────────────────────── */}
        <div
          className="clay-card flat"
          style={{
            display: 'flex',
            gap: 4,
            padding: 4,
            marginBottom: 20,
            background: 'var(--surface-2)',
            borderRadius: 16,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            style={{
              flex: 1,
              padding: '10px 8px',
              borderRadius: 12,
              border: 'none',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              background: activeTab === 'all' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'all' ? 'var(--deep)' : 'var(--text-3)',
              boxShadow: activeTab === 'all' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 200ms ease',
            }}
          >
            All Friends
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            style={{
              flex: 1,
              padding: '10px 8px',
              borderRadius: 12,
              border: 'none',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              background: activeTab === 'requests' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'requests' ? 'var(--deep)' : 'var(--text-3)',
              boxShadow: activeTab === 'requests' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 200ms ease',
            }}
          >
            Request
            {pendingIncomingCount > 0 && (
              <span
                style={{
                  background: '#c0446b',
                  color: '#fff',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: 10,
                  lineHeight: 1.3,
                }}
              >
                {pendingIncomingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sent')}
            style={{
              flex: 1,
              padding: '10px 8px',
              borderRadius: 12,
              border: 'none',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              background: activeTab === 'sent' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'sent' ? 'var(--deep)' : 'var(--text-3)',
              boxShadow: activeTab === 'sent' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 200ms ease',
            }}
          >
            Sent Request
          </button>
        </div>

        {/* ── TAB 1: ALL FRIENDS (Default) ────────────────────────── */}
        {activeTab === 'all' && (
          <motion.div key="tab-all" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
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
                placeholder="Search by name or email…"
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
                <p className="color-text3 text-sm">⚠️ Could not connect to server. Make sure the backend is running.</p>
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
                    transition={{ delay: i * 0.05, type: 'spring', bounce: 0.4 }}
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

            {/* List view without wallet address */}
            {!isLoading && !isError && (
              <>
                <p className="section-title" style={{ marginBottom: 10 }}>ALL CONTACTS</p>
                {friends.length > 0 ? (
                  friends.map((m, i) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="list-row"
                      onClick={() => setSelectedFriend(m)}
                    >
                      <Avatar member={m} />
                      <div className="list-row-content">
                        <div className="list-row-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{m.name}</span>
                          {m.suins && (
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: 'var(--purple)',
                              background: 'rgba(159,157,243,0.18)',
                              padding: '2px 7px',
                              borderRadius: 6,
                            }}>
                              🌐 {m.suins}
                            </span>
                          )}
                        </div>
                        <div className="list-row-sub">
                          {m.email || m.suins || 'SmartSplit Friend'}
                        </div>
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/split', { state: { preselectedMember: m, direction: 'pay' } });
                        }}
                        style={{ padding: '6px 14px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 5 }}
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
                      ? <p className="color-text3">No friends found for "{search}"</p>
                      : <p className="color-text3">No friends yet. Click "Add Friend" to add your first friend!</p>
                    }
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* ── TAB 2: REQUEST (Incoming from others) ────────────────── */}
        {activeTab === 'requests' && (
          <motion.div key="tab-requests" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <p className="section-title" style={{ marginBottom: 12 }}>INCOMING FRIEND REQUESTS</p>
            {incomingRequests.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {incomingRequests.map((reqItem) => (
                  <div
                    key={reqItem.id}
                    className="list-row"
                    style={{ cursor: 'default', justifyContent: 'space-between', padding: '14px 16px' }}
                  >
                    <Avatar member={{ id: reqItem.id, name: reqItem.name, walletAddress: '', avatarColor: reqItem.avatarColor }} />
                    <div className="list-row-content" style={{ flex: 1, marginLeft: 12 }}>
                      <div className="list-row-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{reqItem.name}</span>
                        {reqItem.suinsDomain && (
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: 'var(--purple)',
                            background: 'rgba(159,157,243,0.18)',
                            padding: '2px 7px',
                            borderRadius: 6,
                          }}>
                            🌐 {reqItem.suinsDomain}
                          </span>
                        )}
                      </div>
                      <div className="list-row-sub">
                        {reqItem.email ? `${reqItem.email} · ` : ''}{reqItem.timestamp}
                      </div>
                    </div>

                    {/* Action buttons / Status Badge */}
                    {reqItem.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => handleAccept(reqItem)}
                          className="btn btn-sm"
                          style={{
                            background: 'rgba(201, 235, 202, 0.75)',
                            color: '#256328',
                            border: '1.5px solid rgba(37, 99, 40, 0.4)',
                            padding: '6px 14px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            borderRadius: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            transition: 'all 180ms ease',
                          }}
                        >
                          <CheckIcon size={14} color="#256328" strokeWidth={2.6} />
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(reqItem.id)}
                          className="btn btn-sm"
                          style={{
                            background: 'rgba(255, 155, 179, 0.3)',
                            color: '#c0392b',
                            border: '1.5px solid rgba(192, 57, 43, 0.35)',
                            padding: '6px 14px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            borderRadius: 12,
                            transition: 'all 180ms ease',
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    ) : reqItem.status === 'accepted' ? (
                      <span
                        className="badge"
                        style={{
                          background: 'rgba(201, 235, 202, 0.75)',
                          color: '#256328',
                          border: '1.5px solid rgba(37, 99, 40, 0.3)',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          padding: '5px 12px',
                        }}
                      >
                        ✓ Accepted
                      </span>
                    ) : (
                      <span
                        className="badge"
                        style={{
                          background: 'rgba(255, 155, 179, 0.3)',
                          color: '#c0392b',
                          border: '1.5px solid rgba(192, 57, 43, 0.25)',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          padding: '5px 12px',
                        }}
                      >
                        ✕ Rejected
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <EmptyBoxIcon size={48} color="var(--lavender)" strokeWidth={1.3} />
                <p className="color-text3">No friend requests received yet</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── TAB 3: SENT REQUEST (Sent by user) ──────────────────── */}
        {activeTab === 'sent' && (
          <motion.div key="tab-sent" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <p className="section-title" style={{ marginBottom: 12 }}>SENT REQUESTS HISTORY</p>
            {sentRequests.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sentRequests.map((sentItem) => (
                  <div
                    key={sentItem.id}
                    className="list-row"
                    style={{ cursor: 'default', justifyContent: 'space-between', padding: '14px 16px' }}
                  >
                    <Avatar member={{ id: sentItem.id, name: sentItem.name, walletAddress: '', avatarColor: sentItem.avatarColor }} />
                    <div className="list-row-content" style={{ flex: 1, marginLeft: 12 }}>
                      <div className="list-row-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{sentItem.name}</span>
                        {sentItem.suinsDomain && (
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: 'var(--purple)',
                            background: 'rgba(159,157,243,0.18)',
                            padding: '2px 7px',
                            borderRadius: 6,
                          }}>
                            🌐 {sentItem.suinsDomain}
                          </span>
                        )}
                      </div>
                      <div className="list-row-sub">
                        {sentItem.email ? `${sentItem.email} · ` : ''}{sentItem.timestamp}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {sentItem.status === 'sent' && (
                        <>
                          <span className="badge badge-purple" style={{ fontSize: '0.8rem', padding: '5px 12px' }}>
                            ⏱ Sent
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCancelSent(sentItem.id)}
                            className="btn btn-sm"
                            style={{
                              background: 'rgba(255, 155, 179, 0.22)',
                              color: '#c0392b',
                              border: '1.2px solid rgba(192, 57, 43, 0.3)',
                              fontSize: '0.75rem',
                              padding: '4px 10px',
                              borderRadius: 10,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {sentItem.status === 'accepted' && (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(201, 235, 202, 0.75)',
                            color: '#256328',
                            border: '1.5px solid rgba(37, 99, 40, 0.3)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            padding: '5px 12px',
                          }}
                        >
                          ✓ Accepted
                        </span>
                      )}
                      {sentItem.status === 'rejected' && (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(255, 155, 179, 0.3)',
                            color: '#c0392b',
                            border: '1.5px solid rgba(192, 57, 43, 0.25)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            padding: '5px 12px',
                          }}
                        >
                          ✕ Rejected
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <EmptyBoxIcon size={48} color="var(--lavender)" strokeWidth={1.3} />
                <p className="color-text3">No sent requests yet. Tap "Add Friend" to send one!</p>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Friend action popup without wallet address */}
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
                  <p className="text-xs color-text3" style={{ margin: '4px auto 0' }}>
                    {selectedFriend.email || 'SmartSplit Connected Friend'}
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
                type="button"
                className="btn btn-ghost w-full"
                onClick={() => handleRemoveFriend(selectedFriend)}
                style={{
                  marginTop: 10,
                  color: '#c0392b',
                  background: 'rgba(255, 155, 179, 0.16)',
                  border: '1.2px solid rgba(192, 57, 43, 0.25)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  padding: '9px 12px',
                  borderRadius: 12,
                }}
              >
                Remove Contact
              </button>

              <button
                className="btn btn-ghost w-full mt-8 text-sm"
                onClick={() => setSelectedFriend(null)}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB to quickly Add Friend */}
      <motion.button
        className="fab"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.93 }}
        onClick={() => setShowAddModal(true)}
        aria-label="Add friend"
        style={{
          background: 'linear-gradient(135deg, var(--pink), #e0607e)',
          boxShadow: '0 8px 28px rgba(255,155,179,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        <PlusIcon size={26} color="#fff" strokeWidth={2.4} />
      </motion.button>

      {/* Add Friend Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}
          >
            <motion.div
              className="modal-sheet"
              initial={{ scale: 0.92, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 10 }}
              transition={{ type: 'spring', bounce: 0.22 }}
            >
              <div className="modal-handle" />

              {/* Modal header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 14,
                  background: 'linear-gradient(135deg, var(--pink), #e0607e)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(255,155,179,0.35)',
                  flexShrink: 0,
                }}>
                  <UserPlusIcon size={22} color="#fff" strokeWidth={2} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', lineHeight: 1.2, margin: 0 }}>Add Friend via SuiNS</h3>
                  <p className="color-text3 text-xs" style={{ marginTop: 4 }}>Send friend request using a .sui domain name</p>
                </div>
              </div>

              {/* SuiNS Domain Name (.sui) field */}
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">SuiNS Domain Name (.sui) *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    placeholder="e.g. alice.sui or alice"
                    value={suinsInput}
                    onChange={(e) => setSuinsInput(e.target.value)}
                    style={{ paddingRight: 40 }}
                    autoFocus
                  />
                  {isSuinsResolving && (
                    <div style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      display: 'flex', alignItems: 'center'
                    }}>
                      <div style={{
                        width: 16, height: 16, border: '2px solid var(--purple)',
                        borderTopColor: 'transparent', borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                    </div>
                  )}
                </div>

                {/* Resolution status & feedback */}
                {suinsInput.trim().length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {isSuinsResolving ? (
                      <p className="text-xs" style={{ color: 'var(--purple)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>🌐 Resolving domain on Sui testnet…</span>
                      </p>
                    ) : suinsResolvedAddr ? (
                      isSelfResolved ? (
                        <div style={{
                          padding: '8px 12px', borderRadius: 10,
                          background: 'rgba(255, 155, 179, 0.25)',
                          border: '1.5px solid rgba(192, 57, 43, 0.3)',
                          color: '#c0392b', fontSize: '0.8rem', fontWeight: 600
                        }}>
                          ⚠️ This SuiNS domain belongs to your current account!
                        </div>
                      ) : (
                        <div style={{
                          padding: '10px 14px', borderRadius: 12,
                          background: 'rgba(201, 235, 202, 0.45)',
                          border: '1.5px solid rgba(37, 99, 40, 0.35)',
                          display: 'flex', flexDirection: 'column', gap: 4
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ color: '#256328', fontWeight: 700, fontSize: '0.82rem' }}>
                              ✓ SuiNS Domain Resolved
                            </span>
                            <span style={{ fontSize: '0.72rem', background: '#256328', color: '#fff', borderRadius: 6, padding: '1px 7px', fontWeight: 700 }}>
                              On-Chain
                            </span>
                          </div>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#1b4d1e', wordBreak: 'break-all' }}>
                            {suinsResolvedAddr}
                          </span>
                        </div>
                      )
                    ) : (
                      <div style={{
                        padding: '8px 12px', borderRadius: 10,
                        background: 'rgba(255, 155, 179, 0.25)',
                        border: '1.5px solid rgba(192, 57, 43, 0.3)',
                        color: '#c0392b', fontSize: '0.8rem', fontWeight: 600
                      }}>
                        ⚠️ No active SuiNS domain found for "{normalizedSuinsDomain}". Please check spelling.
                      </div>
                    )}
                  </div>
                )}
                {!suinsInput.trim() && (
                  <p className="text-xs color-text3" style={{ marginTop: 6 }}>
                    Enter any registered .sui domain name (e.g. wenxuan426.sui)
                  </p>
                )}
              </div>

              {/* Friend's Name / Nickname field */}
              <div className="form-group" style={{ marginBottom: 22 }}>
                <label className="form-label">Friend's Nickname (Optional)</label>
                <input
                  className="input"
                  placeholder={
                    suinsInput.trim()
                      ? `e.g. ${suinsInput.trim().replace(/\.sui$/, '')}`
                      : 'e.g. Alex (defaults to domain name)'
                  }
                  value={friendName}
                  onChange={(e) => setFriendName(e.target.value)}
                />
              </div>

              {/* Avatar color picker */}
              <div className="form-group" style={{ marginBottom: 26 }}>
                <label className="form-label">Avatar Color</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}>
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: c, border: selectedColor === c ? '2.5px solid var(--deep)' : '2px solid #fff',
                        boxShadow: selectedColor === c ? '0 0 0 2px var(--purple)' : 'var(--shadow-sm)',
                        cursor: 'pointer',
                        transform: selectedColor === c ? 'scale(1.15)' : 'scale(1)',
                        transition: 'transform 150ms ease',
                      }}
                    />
                  ))}
                </div>
              </div>

              {addFriendMutation.isError && (
                <p className="text-sm" style={{ color: '#c0446b', marginBottom: 14 }}>
                  ⚠️ Failed to add friend. Make sure the backend is running.
                </p>
              )}

              {attemptedAddFriend && !isAddValid && (
                <p className="text-xs" style={{ color: '#c0392b', marginBottom: 8, textAlign: 'center', fontWeight: 600 }}>
                  Please enter a valid .sui domain name
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-12" style={{ marginTop: 6 }}>
                <button
                  type="button"
                  className="btn btn-ghost flex-1"
                  onClick={() => {
                    setShowAddModal(false);
                    setAttemptedAddFriend(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary flex-1"
                  disabled={
                    addFriendMutation.isPending ||
                    isSuinsResolving ||
                    !suinsResolvedAddr ||
                    isSelfResolved
                  }
                  onClick={() => {
                    setAttemptedAddFriend(true);
                    if (isAddValid) {
                      addFriendMutation.mutate();
                    }
                  }}
                  style={{
                    background: 'linear-gradient(135deg, var(--pink), #e0607e)',
                    borderColor: 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    opacity: (isSuinsResolving || !suinsResolvedAddr || isSelfResolved) ? 0.65 : 1,
                  }}
                >
                  <CheckIcon size={15} color="#fff" strokeWidth={2.4} />
                  {addFriendMutation.isPending
                    ? 'Sending…'
                    : isSuinsResolving
                    ? 'Resolving SuiNS…'
                    : 'Send Request'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export function FriendsPage() {
  return (
    <RequireAuth pageName="Friends">
      <FriendsPageInner />
    </RequireAuth>
  );
}
