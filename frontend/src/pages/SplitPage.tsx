// src/pages/SplitPage.tsx
import { useState, useMemo } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { useNavigate } from 'react-router-dom';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../components/Avatar';
import {
  SplitIcon, CommunityIcon, WalletIcon, PayIcon, ReceiveIcon,
  CheckCircleIcon, AlertCircleIcon, BoltIcon, BackIcon,
  ChevronRightIcon, CheckIcon, LinkIcon,
} from '../components/Icons';
import { useSplitTransaction } from '../hooks/useSplitTransaction';
import { DEMO_MEMBERS, DEMO_COMMUNITIES } from '../constants';
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
  const { execute, isLoading, error: txError, result, reset } = useSplitTransaction();

  const [step, setStep] = useState<Step>(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Member[]>([]);
  const [purpose, setPurpose] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [direction, setDirection] = useState<'pay' | 'receive'>('pay');
  const [selectedCommunity, setSelectedCommunity] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return DEMO_MEMBERS;
    return DEMO_MEMBERS.filter(
      (m) => m.name.toLowerCase().includes(q) || (m.phone ?? '').includes(q),
    );
  }, [search]);

  const isSelected = (m: Member) => selected.some((s) => s.id === m.id);

  function toggleMember(m: Member) {
    if (isSelected(m)) setSelected((prev) => prev.filter((s) => s.id !== m.id));
    else setSelected((prev) => [...prev, m]);
  }

  function addCommunity(id: string) {
    const community = DEMO_COMMUNITIES.find((c) => c.id === id);
    if (!community) return;
    const toAdd = community.members.filter((m) => !isSelected(m));
    setSelected((prev) => [...prev, ...toAdd]);
    setSelectedCommunity(id);
  }

  const perPerson = useMemo(() => {
    const total = parseFloat(totalAmount);
    if (!total || selected.length === 0) return 0;
    return total / (selected.length + 1);
  }, [totalAmount, selected]);

  const validationOk = useMemo(() => {
    if (!purpose.trim()) return false;
    const total = parseFloat(totalAmount);
    if (!total || total <= 0) return false;
    if (selected.length === 0) return false;
    const computed = perPerson * (selected.length + 1);
    return Math.abs(computed - total) < 0.001;
  }, [purpose, totalAmount, selected, perPerson]);

  async function handleExecute() {
    if (!validationOk) return;
    const res = await execute({
      recipients: selected,
      totalAmountSui: parseFloat(totalAmount),
      purpose,
      direction,
    });
    if (res) setStep(4);
  }

  function handleReset() {
    reset();
    setStep(1);
    setSelected([]);
    setPurpose('');
    setTotalAmount('');
    setDirection('pay');
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
              {DEMO_COMMUNITIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => addCommunity(c.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px',
                    border: `1.5px solid ${selectedCommunity === c.id ? 'var(--purple)' : 'var(--border)'}`,
                    borderRadius: 'var(--r-full)',
                    background: selectedCommunity === c.id ? 'var(--purple)' : 'var(--surface-2)',
                    color: selectedCommunity === c.id ? '#fff' : 'var(--text-2)',
                    fontFamily: 'Outfit, sans-serif',
                    fontWeight: 600,
                    fontSize: '0.87rem',
                    cursor: 'pointer',
                    transition: 'all 200ms',
                  }}
                >
                  <CommunityIcon
                    size={14}
                    color={selectedCommunity === c.id ? '#fff' : 'var(--text-3)'}
                    strokeWidth={2}
                  />
                  {c.name}
                </button>
              ))}
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
              {filtered.map((m) => (
                <motion.div
                  key={m.id}
                  layout
                  className="list-row"
                  onClick={() => toggleMember(m)}
                  style={{
                    background: isSelected(m) ? 'rgba(159,157,243,0.12)' : undefined,
                    borderColor: isSelected(m) ? 'var(--purple)' : undefined,
                  }}
                >
                  <Avatar member={m} />
                  <div className="list-row-content">
                    <div className="list-row-title">{m.name}</div>
                    <div className="list-row-sub">{m.phone ?? m.walletAddress.slice(0, 16) + '…'}</div>
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
              ))}
            </div>

            {selected.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p className="section-title" style={{ marginBottom: 8 }}>SELECTED ({selected.length})</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {selected.map((m) => (
                    <span key={m.id} className="chip">
                      <Avatar member={m} size="sm" style={{ width: 22, height: 22, fontSize: '0.65rem' }} />
                      {m.name.split(' ')[0]}
                      <button
                        className="chip-close"
                        onClick={() => toggleMember(m)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M7 1L1 7M1 1l6 6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              className="btn btn-primary w-full"
              disabled={selected.length === 0}
              onClick={() => setStep(2)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              Next: Enter Details
              <ChevronRightIcon size={16} color="#fff" strokeWidth={2.2} />
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
                <label className="form-label">Purpose / Description</label>
                <input
                  className="input"
                  placeholder="e.g. Dinner at XYZ Restaurant"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Total Amount (SUI)</label>
                <input
                  className="input"
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.1"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--deep)' }}
                />
              </div>

              {selected.length > 0 && parseFloat(totalAmount) > 0 && (
                <div className="clay-card flat" style={{ padding: '16px 20px', background: 'rgba(201,235,202,0.2)' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm color-text3">Per person (equal split)</p>
                      <div className="amount-big" style={{ fontSize: '2rem', marginTop: 4 }}>
                        <span className="amount-currency">SUI</span>
                        {perPerson.toFixed(4)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p className="text-sm color-text3">Split {selected.length + 1} ways</p>
                      <p className="text-xs color-text3 mt-8">including you</p>
                    </div>
                  </div>
                  <div className="divider" style={{ margin: '12px 0' }} />
                  <div className="flex items-center gap-8">
                    <CheckCircleIcon size={15} color="#3a7a3c" strokeWidth={2.2} />
                    <span className="text-sm" style={{ color: '#3a7a3c' }}>
                      Validation passed · {perPerson.toFixed(4)} × {selected.length + 1} = {parseFloat(totalAmount).toFixed(4)} SUI
                    </span>
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
                disabled={!validationOk}
                onClick={() => setStep(3)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                Review
                <ChevronRightIcon size={15} color="#fff" strokeWidth={2.2} />
              </button>
            </div>
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
                  { label: 'Purpose',   value: purpose },
                  { label: 'Total',     value: `${totalAmount} SUI`, bold: true },
                  { label: 'Per person', value: `${perPerson.toFixed(4)} SUI` },
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

            <p className="section-title" style={{ marginBottom: 10 }}>RECIPIENTS ({selected.length})</p>
            <div style={{ marginBottom: 20 }}>
              {selected.map((m) => (
                <div key={m.id} className="flex items-center gap-12 list-row" style={{ cursor: 'default' }}>
                  <Avatar member={m} />
                  <div className="list-row-content">
                    <div className="list-row-title">{m.name}</div>
                    <div className="list-row-sub truncate">{m.walletAddress}</div>
                  </div>
                  <span className="font-bold color-deep">{perPerson.toFixed(3)} SUI</span>
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
                onClick={() => setStep(2)}
                disabled={isLoading}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <BackIcon size={15} color="var(--text-2)" strokeWidth={2} /> Back
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
    </main>
  );
}
