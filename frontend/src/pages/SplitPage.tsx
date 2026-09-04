// src/pages/SplitPage.tsx
import { useState, useMemo, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../components/Avatar';
import {
  SplitIcon, CommunityIcon, WalletIcon, PayIcon, ReceiveIcon,
  CheckCircleIcon, AlertCircleIcon, BoltIcon, BackIcon,
  ChevronRightIcon, CheckIcon, LinkIcon, LockIcon,
} from '../components/Icons';
import { useSplitTransaction } from '../hooks/useSplitTransaction';
import { useSuiNSAddress } from '../hooks/useSuiNS';
import { useZkLogin } from '../hooks/useZkLogin';
import { createPaymentRequests, fetchCommunities, fetchFriends } from '../api';
import { apiUserToMember, apiCommunityToFrontend } from '../types';
import type { Member, Community } from '../types';
import { uploadToWalrus, type WalrusUpload } from '../walrus';
import { detectReceiptAmount, type ReceiptAmount } from '../receiptOcr';

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS = ['Recipients', 'Details', 'Review', 'Done'];

function StepBar({ current }: { current: Step }) {
  return (
    <div className="steps">
      {STEP_LABELS.map((label, idx) => {
        const n = (idx + 1) as Step;
        const done = current > n;
        const active = current === n;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div className={`step ${active ? 'active' : done ? 'done' : ''}`} style={{ flex: 'none' }}>
              <div className="step-circle">
                {done
                  ? <CheckIcon size={14} color="#3a7a3c" strokeWidth={2.5} />
                  : n}
              </div>
              <div className="step-label">{label}</div>
            </div>
            {idx < STEP_LABELS.length - 1 && (
              <div className={`step-line ${done ? 'done' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SplitPage() {
  const walletAccount = useCurrentAccount();
  const { zkAccount, loginWithGoogle, isLoading: isZkLoading } = useZkLogin();

  const account = walletAccount
    ? { address: walletAccount.address, label: walletAccount.label, isZk: false }
    : zkAccount
    ? { address: zkAccount.address, label: zkAccount.name, isZk: true }
    : null;

  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as {
    preselectedMember?: Member;
    direction?: 'pay' | 'receive';
    preselectedCommunity?: any;
  } | undefined;

  const { execute, isLoading, error: txError, result, reset } = useSplitTransaction();

  const [step, setStep] = useState<Step>(1);
  const [search, setSearch] = useState('');
  const { data: suiNSAddress, isLoading: isSuiNSLoading } = useSuiNSAddress(search);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const ownerAddress = (account?.address || '').toLowerCase();

  // ── Fetch friends from backend ────────────────────────────────
  const { data: rawFriends = [] } = useQuery({
    queryKey: ['friends', ownerAddress],
    queryFn: () => fetchFriends(ownerAddress),
    enabled: !!ownerAddress,
    staleTime: 15_000,
  });

  // ── Fetch communities from backend ────────────────────────────
  const { data: rawCommunities = [] } = useQuery({
    queryKey: ['communities', ownerAddress],
    queryFn: () => fetchCommunities(ownerAddress),
    enabled: !!ownerAddress,
    staleTime: 15_000,
  });

  const communities: Community[] = useMemo(() => {
    const list: Community[] = rawCommunities.map(apiCommunityToFrontend);
    if (locationState?.preselectedCommunity && !list.some((c) => c.id === locationState.preselectedCommunity.id)) {
      list.unshift(locationState.preselectedCommunity);
    }
    return list;
  }, [rawCommunities, locationState?.preselectedCommunity]);

  const allMembers = useMemo(() => {
    const map = new Map<string, Member>();

    // 1. User's friends list
    rawFriends.forEach((f: any) => {
      const m = apiUserToMember(f);
      if (!ownerAddress || m.walletAddress.toLowerCase() !== ownerAddress) {
        map.set(m.id, m);
      }
    });

    // 2. Preselected member from navigation if any
    if (locationState?.preselectedMember) {
      if (!ownerAddress || locationState.preselectedMember.walletAddress?.toLowerCase() !== ownerAddress) {
        map.set(locationState.preselectedMember.id, locationState.preselectedMember);
      }
    }

    return Array.from(map.values());
  }, [rawFriends, locationState, ownerAddress]);

  // Preselect friend if navigated from Friends page
  const [selected, setSelected] = useState<Member[]>(() => {
    if (locationState?.preselectedMember) {
      return [locationState.preselectedMember];
    }
    if (locationState?.preselectedCommunity?.members) {
      return locationState.preselectedCommunity.members;
    }
    return [];
  });

  const [direction, setDirection] = useState<'pay' | 'receive'>(() => {
    return locationState?.direction || 'pay';
  });

  useEffect(() => {
    if (locationState?.preselectedMember) {
      setSelected([locationState.preselectedMember]);
      if (locationState.direction) setDirection(locationState.direction);
    } else if (locationState?.preselectedCommunity?.members) {
      setSelected(locationState.preselectedCommunity.members);
    }
  }, [locationState]);

  const lockedMemberId = locationState?.preselectedMember?.id;
  const lockedCommunityId = locationState?.preselectedCommunity?.id;
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [attemptedStep1, setAttemptedStep1] = useState(false);
  const [attemptedStep2, setAttemptedStep2] = useState(false);

  const [selectedCommunityIds, setSelectedCommunityIds] = useState<string[]>(() => {
    if (locationState?.preselectedCommunity?.id) {
      return [locationState.preselectedCommunity.id];
    }
    return [];
  });

  const [purpose, setPurpose] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [splitMode, setSplitMode] = useState<'equal' | 'uneven'>('equal');
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [receipt, setReceipt] = useState<WalrusUpload | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [receiptAmount, setReceiptAmount] = useState<ReceiptAmount | null>(null);
  const [isReadingReceipt, setIsReadingReceipt] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return allMembers;
    return allMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.email ?? '').toLowerCase().includes(q) ||
        (m.phone ?? '').includes(q),
    );
  }, [search, allMembers]);

  const isSelected = (m: Member) => selected.some((s) => s.id === m.id);

  function toggleMember(m: Member) {
    if (m.id === lockedMemberId) return;
    if (lockedCommunityId) {
      const lockedComm = communities.find((c) => c.id === lockedCommunityId);
      if (lockedComm?.members.some((cm) => cm.id === m.id)) return;
    }
    if (isSelected(m)) setSelected((prev) => prev.filter((s) => s.id !== m.id));
    else setSelected((prev) => [...prev, m]);
  }

  function isCommunitySelected(id: string) {
    return selectedCommunityIds.includes(id);
  }

  function toggleCommunity(id: string) {
    if (id === lockedCommunityId) return; // Cannot cancel locked source community
    const community = communities.find((c) => c.id === id);
    if (!community) return;

    if (selectedCommunityIds.includes(id)) {
      // Toggle OFF: Remove only this community ID
      const nextCommunityIds = selectedCommunityIds.filter((cid) => cid !== id);
      setSelectedCommunityIds(nextCommunityIds);

      // Keep members that belong to other active communities or individually selected
      const remainingCommunityMemberIds = new Set<string>();
      if (lockedMemberId) remainingCommunityMemberIds.add(lockedMemberId);
      if (lockedCommunityId) {
        communities.find((c) => c.id === lockedCommunityId)?.members.forEach((m) =>
          remainingCommunityMemberIds.add(m.id)
        );
      }
      nextCommunityIds.forEach((cid) => {
        const comm = communities.find((c) => c.id === cid);
        comm?.members.forEach((m) => remainingCommunityMemberIds.add(m.id));
      });

      const thisCommunityMemberIds = new Set(community.members.map((m) => m.id));
      setSelected((prev) =>
        prev.filter((m) => !thisCommunityMemberIds.has(m.id) || remainingCommunityMemberIds.has(m.id))
      );
    } else {
      // Toggle ON: Add only this community ID and its members
      setSelectedCommunityIds((prev) => [...prev, id]);
      const toAdd = community.members.filter((m) => !isSelected(m));
      setSelected((prev) => [...prev, ...toAdd]);
    }
  }

  const perPerson = useMemo(() => {
    const total = parseFloat(totalAmount);
    if (!total || selected.length === 0) return 0;
    return total / (selected.length + 1);
  }, [totalAmount, selected]);

  const customTotal = useMemo(() => {
    return selected.reduce((sum, m) => {
      const val = parseFloat(customAmounts[m.id] || '0');
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [selected, customAmounts]);

  const shares = useMemo(() => {
    if (splitMode === 'equal') {
      return selected.map((m) => ({
        member: m,
        amountSui: perPerson,
      }));
    } else {
      return selected.map((m) => ({
        member: m,
        amountSui: parseFloat(customAmounts[m.id] || '0') || 0,
      }));
    }
  }, [splitMode, selected, perPerson, customAmounts]);

  const validationOk = useMemo(() => {
    if (!purpose.trim()) return false;
    if (selected.length === 0) return false;

    if (splitMode === 'equal') {
      const total = parseFloat(totalAmount);
      if (!total || total <= 0) return false;
      const computed = perPerson * (selected.length + 1);
      return Math.abs(computed - total) < 0.001;
    } else {
      return shares.length > 0 && shares.every((s) => s.amountSui > 0 && !isNaN(s.amountSui));
    }
  }, [purpose, totalAmount, selected, perPerson, splitMode, shares]);

  async function handleExecute() {
    if (!validationOk || !account) return;

    if (direction === 'receive') {
      setIsSendingRequest(true);
      setRequestError(null);
      try {
        const requesterName =
          localStorage.getItem(`nickname-${account.address}`) || account.label || 'Friend';
        const requests = shares.map((s) => ({
          requesterAddress: account.address,
          requesterName,
          payerAddress: s.member.walletAddress,
          payerName: s.member.name,
          amountSui: s.amountSui,
          purpose: purpose.trim(),
        }));
        await createPaymentRequests(requests);
        setRequestSent(true);
        setStep(4);
      } catch (err: any) {
        console.error('Failed to create payment requests:', err);
        setRequestError(err instanceof Error ? err.message : 'Failed to send payment request');
      } finally {
        setIsSendingRequest(false);
      }
      return;
    }

    const res = await execute({
      shares,
      purpose,
      direction,
    });
    if (res) setStep(4);
  }

  function handleReset() {
    reset();
    setStep(1);
    setSelected([]);
    setSelectedCommunityIds([]);
    setPurpose('');
    setTotalAmount('');
    setDirection('pay');
    setSplitMode('equal');
    setCustomAmounts({});
    setReceipt(null);
    setReceiptError(null);
    setReceiptAmount(null);
    setRequestSent(false);
    setRequestError(null);
  }

  if (!account) {
    return (
      <main className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 70px)' }}>
        <div className="connect-hero">
          <div className="connect-blob">
            <SplitIcon size={56} color="white" strokeWidth={1.5} />
          </div>
          <h2>Connect your wallet to split payments</h2>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%', maxWidth: 320 }}>
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
              {isZkLoading ? 'Connecting…' : 'Sign in with Google (zkLogin)'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', margin: '2px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', textTransform: 'uppercase' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <ConnectButton />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h2 style={{ marginBottom: 6 }}>Split Payment</h2>
        <p className="color-text3 text-sm" style={{ marginBottom: 20 }}>
          Build an atomic PTB that pays everyone at once
        </p>
        <StepBar current={step} />
      </motion.div>

      <AnimatePresence mode="wait">
        {/* ── Step 1: Select recipients ───────────────────── */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            {communities.length > 0 && (
              <>
                <p className="section-title" style={{ marginBottom: 8 }}>QUICK ADD FROM COMMUNITY</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                  {communities.map((c) => {
                    const active = isCommunitySelected(c.id);
                    const isLocked = c.id === lockedCommunityId;
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleCommunity(c.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '7px 14px',
                          border: `1.5px solid ${active ? 'var(--purple)' : 'var(--border)'}`,
                          borderRadius: 'var(--r-full)',
                          background: active ? 'var(--purple)' : 'var(--surface-2)',
                          color: active ? '#fff' : 'var(--text-2)',
                          fontFamily: 'Outfit, sans-serif',
                          fontWeight: 600,
                          fontSize: '0.87rem',
                          cursor: isLocked ? 'default' : 'pointer',
                          opacity: isLocked ? 0.9 : 1,
                          transition: 'all 200ms',
                        }}
                      >
                        <CommunityIcon
                          size={14}
                          color={active ? '#fff' : 'var(--text-3)'}
                          strokeWidth={2}
                        />
                        {c.name}
                        {isLocked && <LockIcon size={12} color="currentColor" strokeWidth={2.4} />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Search by name, phone or SuiNS (.sui)</label>
              <input
                className="input"
                placeholder="e.g. Bob, +6012, or alice.sui…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* SuiNS Resolution Indicator */}
            {search.trim().length > 0 && (
              <div
                className="clay-card flat mb-16"
                style={{
                  padding: '12px 16px',
                  background: suiNSAddress ? 'rgba(159,157,243,0.14)' : 'rgba(255,255,255,0.6)',
                  borderColor: suiNSAddress ? 'var(--purple)' : undefined,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--deep)' }}>
                    🌐 SuiNS Resolution: {search.endsWith('.sui') ? search : `${search}.sui`}
                  </div>
                  <div className="text-xs color-text3" style={{ fontFamily: 'monospace' }}>
                    {isSuiNSLoading
                      ? 'Resolving .sui domain…'
                      : suiNSAddress
                      ? `Resolved: ${suiNSAddress.slice(0, 16)}…${suiNSAddress.slice(-6)}`
                      : 'No active SuiNS domain found'}
                  </div>
                </div>
                {suiNSAddress && (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      const suiNSMember: Member = {
                        id: `suins_${search}`,
                        name: search.endsWith('.sui') ? search : `${search}.sui`,
                        walletAddress: suiNSAddress,
                        avatarColor: '#9F9DF3',
                      };
                      toggleMember(suiNSMember);
                    }}
                  >
                    + Add SuiNS
                  </button>
                )}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              {filtered.map((m) => {
                const isLocked =
                  m.id === lockedMemberId ||
                  (lockedCommunityId &&
                    communities.find((c) => c.id === lockedCommunityId)?.members.some((cm) => cm.id === m.id));

                return (
                  <motion.div
                    key={m.id}
                    layout
                    className="list-row"
                    onClick={() => toggleMember(m)}
                    style={{
                      background: isSelected(m) ? 'rgba(159,157,243,0.12)' : undefined,
                      borderColor: isSelected(m) ? 'var(--purple)' : undefined,
                      cursor: isLocked ? 'default' : 'pointer',
                    }}
                  >
                    <Avatar member={m} />
                    <div className="list-row-content">
                      <div className="list-row-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {m.name}
                        {isLocked && (
                          <span style={{
                            fontSize: '0.68rem',
                            background: 'rgba(159,157,243,0.22)',
                            color: 'var(--deep)',
                            padding: '2px 7px',
                            borderRadius: 6,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                          }}>
                            <LockIcon size={10} color="var(--deep)" strokeWidth={2.4} />
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="list-row-sub">{m.email || m.phone || 'SmartSplit Contact'}</div>
                    </div>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: isSelected(m) ? 'var(--purple)' : 'var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 200ms', flexShrink: 0,
                    }}>
                      {isSelected(m)
                        ? <CheckIcon size={13} color="#fff" strokeWidth={2.5} />
                        : <span style={{ color: 'var(--text-3)', fontSize: '1rem', lineHeight: 1 }}>+</span>
                      }
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {selected.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p className="section-title" style={{ marginBottom: 8 }}>SELECTED ({selected.length})</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {selected.map((m) => {
                    const isLocked =
                      m.id === lockedMemberId ||
                      (lockedCommunityId &&
                        communities.find((c) => c.id === lockedCommunityId)?.members.some((cm) => cm.id === m.id));

                    return (
                      <span key={m.id} className="chip">
                        <Avatar member={m} size="sm" style={{ width: 22, height: 22, fontSize: '0.65rem' }} />
                        {m.name.split(' ')[0]}
                        {isLocked ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginLeft: 4,
                              background: 'rgba(159, 157, 243, 0.25)',
                              borderRadius: '50%',
                              width: 18,
                              height: 18,
                            }}
                            title="Primary recipient (Locked)"
                          >
                            <LockIcon size={10} color="var(--deep)" strokeWidth={2.4} />
                          </span>
                        ) : (
                          <button
                            className="chip-close"
                            onClick={() => toggleMember(m)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                              <path d="M7 1L1 7M1 1l6 6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {attemptedStep1 && selected.length === 0 && (
              <p className="text-xs" style={{ color: '#c0392b', marginBottom: 10, textAlign: 'center', fontWeight: 600 }}>
                * Please select at least 1 recipient to proceed
              </p>
            )}

            <button
              className="btn btn-primary w-full"
              onClick={() => {
                setAttemptedStep1(true);
                if (selected.length > 0) {
                  setStep(2);
                }
              }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              Next: Enter Details
              <ChevronRightIcon size={16} color="#fff" strokeWidth={2.2} />
            </button>

            <button
              type="button"
              className="btn btn-ghost w-full"
              onClick={() => setShowCancelModal(true)}
              style={{
                marginTop: 10,
                color: '#c0392b',
                background: 'rgba(255, 155, 179, 0.18)',
                border: '1.5px solid rgba(192, 57, 43, 0.3)',
                fontWeight: 700,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                borderRadius: 14,
                padding: '12px',
              }}
            >
              Cancel Transaction
            </button>
          </motion.div>
        )}

        {/* ── Step 2: Payment details ────────────────────── */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="form-group">
                <label className="form-label">Purpose / Description *</label>
                <input
                  className="input"
                  placeholder="e.g. Dinner at XYZ Restaurant"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
                {attemptedStep2 && !purpose.trim() && (
                  <p className="text-xs" style={{ color: '#c0392b', marginTop: 4, fontWeight: 500 }}>
                    * Please enter a purpose / description
                  </p>
                )}
              </div>

              {/* Split Mode Selector */}
              <div className="form-group">
                <label className="form-label">Split Type</label>
                <div className="toggle-group">
                  <button
                    className={`toggle-btn ${splitMode === 'equal' ? 'active' : ''}`}
                    onClick={() => setSplitMode('equal')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
                  >
                    Equal Split ({selected.length + 1} ways)
                  </button>
                  <button
                    className={`toggle-btn ${splitMode === 'uneven' ? 'active' : ''}`}
                    onClick={() => {
                      setSplitMode('uneven');
                      // Initialize custom amounts if empty
                      if (Object.keys(customAmounts).length === 0 && selected.length > 0) {
                        const init: Record<string, string> = {};
                        const defaultAmt = totalAmount ? (parseFloat(totalAmount) / (selected.length + 1)).toFixed(3) : '0.05';
                        selected.forEach(m => { init[m.id] = defaultAmt; });
                        setCustomAmounts(init);
                      }
                    }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
                  >
                    Uneven / Itemized Split
                  </button>
                </div>
              </div>

              {splitMode === 'equal' ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Total Bill Amount (SUI) *</label>
                    <input
                      className="input"
                      type="number"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--deep)' }}
                    />
                    {attemptedStep2 && (!totalAmount || parseFloat(totalAmount) <= 0) && (
                      <p className="text-xs" style={{ color: '#c0392b', marginTop: 4, fontWeight: 500 }}>
                        * Please enter a valid total amount in SUI (&gt; 0)
                      </p>
                    )}
                  </div>

                  {selected.length > 0 && parseFloat(totalAmount) > 0 && (
                    <div className="clay-card flat" style={{ padding: '16px 20px', background: 'rgba(201,235,202,0.2)' }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm color-text3">Per person (equal share)</p>
                          <div className="amount-big" style={{ fontSize: '2rem', marginTop: 4 }}>
                            <span className="amount-currency">SUI</span>
                            {perPerson.toFixed(4)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p className="text-sm color-text3">Split {selected.length + 1} ways</p>
                          <p className="text-xs color-text3 mt-8">Payer + {selected.length} recipients</p>
                        </div>
                      </div>
                      <div className="divider" style={{ margin: '12px 0' }} />
                      <div className="flex items-center gap-8">
                        <CheckCircleIcon size={15} color="#3a7a3c" strokeWidth={2.2} />
                        <span className="text-sm" style={{ color: '#3a7a3c' }}>
                          Exact split · {perPerson.toFixed(4)} SUI per participant
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Uneven Mode: Input exact amounts for each recipient */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="flex justify-between items-center">
                    <label className="form-label" style={{ margin: 0 }}>Recipient Shares (Uneven)</label>
                    <span className="text-sm font-bold color-deep">Total: {customTotal.toFixed(4)} SUI</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selected.map((m) => (
                      <div
                        key={m.id}
                        className="clay-card flat"
                        style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Avatar member={m} size="sm" />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="font-semibold text-sm truncate">{m.name}</div>
                            <div className="text-xs color-text3 truncate">{m.email || m.phone || 'Contact'}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input
                              className="input"
                              type="number"
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              value={customAmounts[m.id] ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomAmounts((prev) => ({ ...prev, [m.id]: val }));
                              }}
                              style={{
                                width: 100,
                                padding: '8px 10px',
                                textAlign: 'right',
                                fontWeight: 700,
                                fontSize: '0.95rem',
                              }}
                            />
                            <span className="text-xs font-semibold color-text3">SUI</span>
                          </div>
                        </div>
                        {attemptedStep2 && (!customAmounts[m.id] || parseFloat(customAmounts[m.id]) <= 0) && (
                          <p className="text-xs" style={{ color: '#c0392b', margin: 0, textAlign: 'right', fontWeight: 500 }}>
                            * Please enter a valid amount for {m.name}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="clay-card flat" style={{ padding: '12px 16px', background: 'rgba(159,157,243,0.08)' }}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="color-text2">Recipients sum to send:</span>
                      <span className="font-bold color-deep">{customTotal.toFixed(4)} SUI</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Direction</label>
                <div className="toggle-group">
                  <button
                    className={`toggle-btn ${direction === 'pay' ? 'active' : ''}`}
                    onClick={() => setDirection('pay')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
                  >
                    <PayIcon size={15} color={direction === 'pay' ? 'var(--deep)' : 'var(--text-3)'} strokeWidth={1.8} />
                    Pay them
                  </button>
                  <button
                    className={`toggle-btn ${direction === 'receive' ? 'active' : ''}`}
                    onClick={() => setDirection('receive')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
                  >
                    <ReceiveIcon size={15} color={direction === 'receive' ? 'var(--deep)' : 'var(--text-3)'} strokeWidth={1.8} />
                    Receive from them
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Receipt image (optional)</label>
                <input
                  className="input"
                  type="file"
                  accept="image/*"
                  disabled={isUploadingReceipt}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setReceiptError(null);
                    setReceiptAmount(null);
                    setIsUploadingReceipt(true);
                    try {
                      const uploaded = await uploadToWalrus(file);
                      setReceipt(uploaded);
                      setIsUploadingReceipt(false);
                      setIsReadingReceipt(true);
                      try {
                        const detected = await detectReceiptAmount(file);
                        setReceiptAmount(detected);
                        if (detected) setTotalAmount(detected.amount.toFixed(2));
                      } catch {
                        setReceiptError('Receipt uploaded, but its total could not be read. Enter the amount manually.');
                      } finally {
                        setIsReadingReceipt(false);
                      }
                    } catch (err) {
                      setReceipt(null);
                      setReceiptError(err instanceof Error ? err.message : 'Could not upload receipt.');
                      setIsUploadingReceipt(false);
                    }
                    event.target.value = '';
                  }}
                />
                <p className="text-xs color-text3 mt-6">
                  {isUploadingReceipt
                    ? 'Uploading receipt to Walrus…'
                    : isReadingReceipt
                    ? 'Reading receipt total…'
                    : 'Stored on decentralized Walrus testnet storage.'}
                </p>
                {receipt && (
                  <a
                    href={receipt.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs"
                    style={{ color: '#256328', fontWeight: 700, wordBreak: 'break-all' }}
                  >
                    ✓ Receipt uploaded · {receipt.blobId}
                  </a>
                )}
                {receiptAmount && (
                  <p className="text-xs" style={{ color: 'var(--deep)', marginTop: 6, fontWeight: 600 }}>
                    Detected total: {receiptAmount.currency ? `${receiptAmount.currency} ` : ''}{receiptAmount.amount.toFixed(2)}. Verify the amount and convert it to SUI if needed.
                  </p>
                )}
                {receiptError && <p className="text-xs" style={{ color: '#c0392b', marginTop: 6 }}>{receiptError}</p>}
              </div>
            </div>

            <div className="flex gap-12 mt-24">
              <button
                className="btn btn-ghost flex-1"
                onClick={() => setStep(1)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <BackIcon size={15} color="var(--text-2)" strokeWidth={2} />
                Back
              </button>
              <button
                className="btn btn-primary flex-1"
                onClick={() => {
                  setAttemptedStep2(true);
                  if (validationOk) {
                    setStep(3);
                  }
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                Review
                <ChevronRightIcon size={15} color="#fff" strokeWidth={2.2} />
              </button>
            </div>

            <button
              type="button"
              className="btn btn-ghost w-full"
              onClick={() => setShowCancelModal(true)}
              style={{
                marginTop: 10,
                color: '#c0392b',
                background: 'rgba(255, 155, 179, 0.18)',
                border: '1.5px solid rgba(192, 57, 43, 0.3)',
                fontWeight: 700,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                borderRadius: 14,
                padding: '12px',
              }}
            >
              Cancel Transaction
            </button>
          </motion.div>
        )}

        {/* ── Step 3: Review & execute ───────────────────── */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            <div className="clay-card flat" style={{ padding: '20px 22px', marginBottom: 16 }}>
              <p className="section-title" style={{ marginBottom: 12 }}>
                {direction === 'pay' ? 'PAYMENT SUMMARY' : 'REQUEST SUMMARY'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Purpose', value: purpose },
                  {
                    label: direction === 'pay' ? 'Total Distribution' : 'Total to Collect',
                    value: `${(splitMode === 'equal' ? parseFloat(totalAmount) || 0 : customTotal).toFixed(4)} SUI`,
                    bold: true,
                  },
                  {
                    label: 'Split Mode',
                    value: splitMode === 'equal' ? `Equal (${perPerson.toFixed(4)} SUI each)` : 'Uneven / Itemized',
                  },
                ].map(({ label, value, bold }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="color-text3 text-sm">{label}</span>
                    <span className={bold ? 'font-bold color-deep' : 'font-semibold'}
                      style={{ maxWidth: '60%', textAlign: 'right' }}>{value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center">
                  <span className="color-text3 text-sm">Direction</span>
                  <span className={`badge ${direction === 'pay' ? 'badge-purple' : 'badge-green'}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {direction === 'pay'
                      ? <PayIcon size={12} color="var(--deep)" strokeWidth={2} />
                      : <ReceiveIcon size={12} color="#3a7a3c" strokeWidth={2} />}
                    {direction === 'pay' ? 'Pay them' : 'Request from them'}
                  </span>
                </div>
                <div className="divider" style={{ margin: '4px 0' }} />
                <div className="flex justify-between items-center">
                  <span className="color-text3 text-sm">{direction === 'pay' ? 'Atomicity' : 'Type'}</span>
                  <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <BoltIcon size={12} color="#3a7a3c" strokeWidth={2} />
                    {direction === 'pay' ? 'Single PTB' : 'Peer-to-Peer Request'}
                  </span>
                </div>
              </div>
            </div>

            <p className="section-title" style={{ marginBottom: 10 }}>
              {direction === 'pay' ? `RECIPIENTS (${shares.length})` : `REQUEST FROM (${shares.length})`}
            </p>
            <div style={{ marginBottom: 20 }}>
              {shares.map(({ member, amountSui }) => (
                <div key={member.id} className="flex items-center gap-12 list-row" style={{ cursor: 'default' }}>
                  <Avatar member={member} />
                  <div className="list-row-content">
                    <div className="list-row-title">{member.name}</div>
                    <div className="list-row-sub truncate">{member.walletAddress}</div>
                  </div>
                  <span className="font-bold color-deep">
                    {direction === 'pay' ? `+${amountSui.toFixed(4)}` : `${amountSui.toFixed(4)}`} SUI
                  </span>
                </div>
              ))}
            </div>

            <div className="clay-card flat" style={{ padding: '14px 18px', background: 'rgba(159,157,243,0.08)', marginBottom: 20 }}>
              <div className="flex items-center gap-8" style={{ marginBottom: 8 }}>
                <BoltIcon size={16} color="var(--deep)" strokeWidth={2} />
                <p className="text-sm font-semibold color-deep">
                  {direction === 'pay' ? 'How the PTB works' : 'How Payment Requests work'}
                </p>
              </div>
              {direction === 'pay' ? (
                <ol style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li className="text-sm color-text2">Splits your coin into {selected.length} equal parts</li>
                  <li className="text-sm color-text2">Transfers each part atomically to every recipient</li>
                  <li className="text-sm color-text2">All succeed together, or the whole transaction reverts</li>
                </ol>
              ) : (
                <ol style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li className="text-sm color-text2">Creates a pending payment request in the system for each friend</li>
                  <li className="text-sm color-text2">Friends will see an incoming payment request on their dashboard</li>
                  <li className="text-sm color-text2">They can approve and pay directly from their wallet to you</li>
                </ol>
              )}
            </div>

            {(txError || requestError) && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(255,155,179,0.15)',
                borderRadius: 14, marginBottom: 16,
                border: '1.5px solid rgba(255,155,179,0.4)',
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <AlertCircleIcon size={16} color="#c0446b" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                <p className="text-sm" style={{ color: '#c0446b' }}>{txError || requestError}</p>
              </div>
            )}

            <div className="flex gap-12">
              <button
                className="btn btn-ghost flex-1"
                onClick={() => {
                  if (isLoading) reset();
                  else setStep(2);
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {isLoading ? (
                  'Cancel / Reset'
                ) : (
                  <>
                    <BackIcon size={15} color="var(--text-2)" strokeWidth={2} /> Back
                  </>
                )}
              </button>
              <button
                className="btn btn-primary flex-1"
                disabled={isLoading || isSendingRequest}
                onClick={handleExecute}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {isLoading || isSendingRequest ? (
                  <><span className="spinner" style={{ width: 16, height: 16 }} /> {direction === 'receive' ? 'Sending Request…' : 'Awaiting wallet…'}</>
                ) : (
                  <>
                    {direction === 'pay' ? (
                      <>
                        <WalletIcon size={16} color="#fff" strokeWidth={2} />
                        Approve &amp; Execute
                      </>
                    ) : (
                      <>
                        <ReceiveIcon size={16} color="#fff" strokeWidth={2} />
                        Send Payment Request
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Step 4: Success ────────────────────────────── */}
        {step === 4 && (
          <AnimatePresence mode="wait">
            {requestSent ? (
              <motion.div
                key="step4-request"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, type: 'spring', bounce: 0.4 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 20, paddingTop: 20 }}
              >
                <div className="success-ring">
                  <CheckCircleIcon size={48} color="#3a7a3c" strokeWidth={1.6} />
                </div>
                <div>
                  <h2 style={{ marginBottom: 8 }}>Payment Request Sent!</h2>
                  <p className="color-text2">
                    Your request for <strong>{purpose}</strong> has been created.
                  </p>
                </div>

                <div className="clay-card flat" style={{ width: '100%', padding: '16px 20px' }}>
                  <p className="section-title" style={{ marginBottom: 12 }}>REQUEST SUMMARY</p>
                  {shares.map(({ member, amountSui }) => (
                    <div key={member.id} className="flex items-center gap-12" style={{ marginBottom: 10 }}>
                      <Avatar member={member} size="sm" />
                      <div className="flex-1" style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-1)' }}>{member.name}</div>
                        <div className="text-xs color-text3">{member.walletAddress.slice(0, 10)}…</div>
                      </div>
                      <span className="font-bold color-deep">{amountSui.toFixed(4)} SUI</span>
                      <span className="badge badge-purple text-xs">Pending</span>
                    </div>
                  ))}
                </div>

                <div className="clay-card flat" style={{ padding: '14px 18px', background: 'rgba(201,235,202,0.2)', width: '100%', textAlign: 'left' }}>
                  <p className="text-sm" style={{ color: '#256328', fontWeight: 600 }}>
                    ✓ What happens next?
                  </p>
                  <p className="text-xs color-text2 mt-4" style={{ lineHeight: 1.5 }}>
                    When your friend connects their wallet, they will see this incoming request on their dashboard with an <strong>[Approve &amp; Pay]</strong> button to transfer the SUI directly to you.
                  </p>
                </div>

                <div className="flex gap-12 w-full">
                  <button className="btn btn-ghost flex-1" onClick={handleReset}>New Split</button>
                  <button
                    className="btn btn-primary flex-1"
                    onClick={() => navigate('/')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <BackIcon size={15} color="#fff" strokeWidth={2} />
                    Home
                  </button>
                </div>
              </motion.div>
            ) : result ? (
              <motion.div
                key="step4-pay"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, type: 'spring', bounce: 0.4 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 20, paddingTop: 20 }}
              >
                <div className="success-ring">
                  <CheckCircleIcon size={48} color="#3a7a3c" strokeWidth={1.6} />
                </div>
                <div>
                  <h2 style={{ marginBottom: 8 }}>Payment Completed</h2>
                  <p className="color-text2">Your atomic PTB was executed successfully.</p>
                </div>

                <div className="clay-card flat" style={{ width: '100%', padding: '16px 20px' }}>
                  <p className="section-title" style={{ marginBottom: 12 }}>TRANSFER STATUS</p>
                  {result.amounts.map(({ member, amountSui }) => (
                    <div key={member.id} className="flex items-center gap-12" style={{ marginBottom: 10 }}>
                      <Avatar member={member} size="sm" />
                      <div className="flex-1">
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-1)' }}>{member.name}</div>
                      </div>
                      <span className="font-bold" style={{ color: '#3a7a3c' }}>+{amountSui.toFixed(4)} SUI</span>
                      <CheckCircleIcon size={16} color="#3a7a3c" strokeWidth={2.2} />
                    </div>
                  ))}
                </div>

                {result.digest ? (
                  <a
                    href={`https://testnet.suivision.xyz/txblock/${result.digest}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <LinkIcon size={14} color="var(--text-2)" strokeWidth={2} />
                    View on SuiVision
                  </a>
                ) : (
                  <a
                    href={`https://testnet.suivision.xyz/account/${account?.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <LinkIcon size={14} color="var(--text-2)" strokeWidth={2} />
                    View on SuiVision Explorer
                  </a>
                )}

                <div className="flex gap-12 w-full">
                  <button className="btn btn-ghost flex-1" onClick={handleReset}>New Split</button>
                  <button
                    className="btn btn-primary flex-1"
                    onClick={() => navigate('/')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <BackIcon size={15} color="#fff" strokeWidth={2} />
                    Home
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        )}
      </AnimatePresence>

      {/* Confirm Cancel Transaction Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            className="modal-overlay centered"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setShowCancelModal(false)}
          >
            <motion.div
              className="modal-card"
              initial={{ scale: 0.9, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 12 }}
              transition={{ type: 'spring', bounce: 0.2 }}
              style={{ maxWidth: 350, textAlign: 'center', padding: '26px 22px' }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'rgba(255, 155, 179, 0.25)',
                border: '2px solid rgba(192, 57, 43, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px',
              }}>
                <AlertCircleIcon size={26} color="#c0392b" strokeWidth={2} />
              </div>

              <h3 style={{ fontSize: '1.2rem', marginBottom: 8, color: 'var(--text-1)' }}>
                Confirm Cancel Transaction?
              </h3>
              <p className="color-text3 text-xs" style={{ marginBottom: 22, lineHeight: 1.45 }}>
                Are you sure you want to cancel this transaction? Any progress will be discarded.
              </p>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-ghost flex-1"
                  onClick={() => setShowCancelModal(false)}
                  style={{
                    fontWeight: 600,
                    borderRadius: 12,
                    padding: '10px 14px',
                    fontSize: '0.88rem',
                  }}
                >
                  No
                </button>
                <button
                  type="button"
                  className="btn flex-1"
                  onClick={() => {
                    setShowCancelModal(false);
                    navigate(-1);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #e04f6e, #c0392b)',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 700,
                    borderRadius: 12,
                    padding: '10px 14px',
                    fontSize: '0.88rem',
                    boxShadow: '0 4px 14px rgba(192, 57, 43, 0.35)',
                  }}
                >
                  Yes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
