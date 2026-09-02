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
import { DEMO_MEMBERS, DEMO_COMMUNITIES } from '../constants';
import { fetchUsers } from '../api';
import { apiUserToMember } from '../types';
import type { Member } from '../types';

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
  const account = useCurrentAccount();
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

  // ── Fetch users from backend ──────────────────────────────────
  const { data: rawUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchUsers(),
    staleTime: 20_000,
  });

  const allMembers = useMemo(() => {
    const backendMembers: Member[] = rawUsers.map(apiUserToMember);
    const map = new Map<string, Member>();

    if (locationState?.preselectedMember) {
      map.set(locationState.preselectedMember.id, locationState.preselectedMember);
    }
    backendMembers.forEach((m) => map.set(m.id, m));
    DEMO_MEMBERS.forEach((m) => {
      if (!map.has(m.id)) map.set(m.id, m);
    });

    return Array.from(map.values());
  }, [rawUsers, locationState]);

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
      const lockedComm = DEMO_COMMUNITIES.find((c) => c.id === lockedCommunityId);
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
    const community = DEMO_COMMUNITIES.find((c) => c.id === id);
    if (!community) return;

    if (selectedCommunityIds.includes(id)) {
      // Toggle OFF: Remove only this community ID
      const nextCommunityIds = selectedCommunityIds.filter((cid) => cid !== id);
      setSelectedCommunityIds(nextCommunityIds);

      // Keep members that belong to other active communities or individually selected
      const remainingCommunityMemberIds = new Set<string>();
      if (lockedMemberId) remainingCommunityMemberIds.add(lockedMemberId);
      if (lockedCommunityId) {
        DEMO_COMMUNITIES.find((c) => c.id === lockedCommunityId)?.members.forEach((m) =>
          remainingCommunityMemberIds.add(m.id)
        );
      }
      nextCommunityIds.forEach((cid) => {
        const comm = DEMO_COMMUNITIES.find((c) => c.id === cid);
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
    if (!validationOk) return;
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
  }

  if (!account) {
    return (
      <main className="page">
        <div className="connect-hero">
          <div className="connect-blob">
            <SplitIcon size={56} color="white" strokeWidth={1.5} />
          </div>
          <h2>Connect your wallet to split payments</h2>
          <ConnectButton />
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
            <p className="section-title" style={{ marginBottom: 8 }}>QUICK ADD FROM COMMUNITY</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {DEMO_COMMUNITIES.map((c) => {
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

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Search by name or phone</label>
              <input
                className="input"
                placeholder="e.g. Bob, +6012…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              {filtered.map((m) => {
                const isLocked =
                  m.id === lockedMemberId ||
                  (lockedCommunityId &&
                    DEMO_COMMUNITIES.find((c) => c.id === lockedCommunityId)?.members.some((cm) => cm.id === m.id));

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
                        DEMO_COMMUNITIES.find((c) => c.id === lockedCommunityId)?.members.some((cm) => cm.id === m.id));

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
              <p className="section-title" style={{ marginBottom: 12 }}>PAYMENT SUMMARY</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Purpose', value: purpose },
                  {
                    label: 'Total Distribution',
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
                  <span className="color-text3 text-sm">Atomicity</span>
                  <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <BoltIcon size={12} color="#3a7a3c" strokeWidth={2} />
                    Single PTB
                  </span>
                </div>
              </div>
            </div>

            <p className="section-title" style={{ marginBottom: 10 }}>RECIPIENTS ({shares.length})</p>
            <div style={{ marginBottom: 20 }}>
              {shares.map(({ member, amountSui }) => (
                <div key={member.id} className="flex items-center gap-12 list-row" style={{ cursor: 'default' }}>
                  <Avatar member={member} />
                  <div className="list-row-content">
                    <div className="list-row-title">{member.name}</div>
                    <div className="list-row-sub truncate">{member.walletAddress}</div>
                  </div>
                  <span className="font-bold color-deep">+{amountSui.toFixed(4)} SUI</span>
                </div>
              ))}
            </div>

            <div className="clay-card flat" style={{ padding: '14px 18px', background: 'rgba(159,157,243,0.08)', marginBottom: 20 }}>
              <div className="flex items-center gap-8" style={{ marginBottom: 8 }}>
                <BoltIcon size={16} color="var(--deep)" strokeWidth={2} />
                <p className="text-sm font-semibold color-deep">How the PTB works</p>
              </div>
              <ol style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <li className="text-sm color-text2">Splits your coin into {selected.length} equal parts</li>
                <li className="text-sm color-text2">Transfers each part atomically to every recipient</li>
                <li className="text-sm color-text2">All succeed together, or the whole transaction reverts</li>
              </ol>
            </div>

            {txError && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(255,155,179,0.15)',
                borderRadius: 14, marginBottom: 16,
                border: '1.5px solid rgba(255,155,179,0.4)',
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <AlertCircleIcon size={16} color="#c0446b" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                <p className="text-sm" style={{ color: '#c0446b' }}>{txError}</p>
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
                disabled={isLoading}
                onClick={handleExecute}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {isLoading ? (
                  <><span className="spinner" style={{ width: 16, height: 16 }} /> Awaiting wallet…</>
                ) : (
                  <>
                    <WalletIcon size={16} color="#fff" strokeWidth={2} />
                    Approve &amp; Execute
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Step 4: Success ────────────────────────────── */}
        {step === 4 && result && (
          <motion.div
            key="step4"
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

            {result.digest && (
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
            )}

            <div className="flex gap-12">
              <button className="btn btn-ghost" onClick={handleReset}>New Split</button>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/')}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <BackIcon size={15} color="#fff" strokeWidth={2} />
                Home
              </button>
            </div>
          </motion.div>
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
