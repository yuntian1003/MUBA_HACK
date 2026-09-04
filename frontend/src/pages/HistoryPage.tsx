// src/pages/HistoryPage.tsx
import { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Avatar } from '../components/Avatar';
import {
  HistoryIcon, PayIcon, LinkIcon, EmptyBoxIcon,
} from '../components/Icons';
import { fetchPaymentRequests, updatePaymentRequest } from '../api';
import { useSplitTransaction } from '../hooks/useSplitTransaction';
import { useZkLogin } from '../hooks/useZkLogin';
import { AVATAR_COLORS } from '../constants';

function formatTime(timestamp?: number): string {
  if (!timestamp) return 'Recently';
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

type TabType = 'outgoing' | 'incoming';

export function HistoryPage() {
  const walletAccount = useCurrentAccount();
  const { zkAccount } = useZkLogin();
  const ownerAddress = (walletAccount?.address ?? zkAccount?.address ?? '').toLowerCase().trim();

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('outgoing');
  const [payingReqId, setPayingReqId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  const { execute } = useSplitTransaction();

  // ── Fetch Payment Requests ──────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['payment-requests-history', ownerAddress],
    queryFn: () => fetchPaymentRequests(ownerAddress),
    enabled: !!ownerAddress,
    refetchInterval: 3000,
  });

  const incomingRequests = data?.incoming || [];
  const outgoingRequests = data?.outgoing || [];

  // ── Decline Request ─────────────────────────────────────────
  const declineMutation = useMutation({
    mutationFn: async (id: string) => {
      await updatePaymentRequest(id, { status: 'declined' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-requests-history'] });
    },
  });

  // ── Pay Incoming Request ────────────────────────────────────
  async function handlePay(req: any) {
    setPayingReqId(req.id);
    setPayError(null);
    try {
      const res = await execute({
        shares: [
          {
            member: {
              id: req.requesterAddress,
              name: req.requesterName || 'Requester',
              walletAddress: req.requesterAddress,
              avatarColor: AVATAR_COLORS[0],
            },
            amountSui: req.amountSui,
          },
        ],
        purpose: req.purpose || 'Payment Request',
        direction: 'pay',
      });

      if (res?.digest) {
        await updatePaymentRequest(req.id, { status: 'paid', digest: res.digest });
        queryClient.invalidateQueries({ queryKey: ['payment-requests-history'] });
      } else {
        throw new Error('Transaction was not completed');
      }
    } catch (err: any) {
      console.error('Failed to pay request:', err);
      setPayError(err?.message || 'Payment failed');
    } finally {
      setPayingReqId(null);
    }
  }

  if (!ownerAddress) {
    return (
      <main className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
        <div className="clay-card" style={{ padding: '36px 28px', textAlign: 'center', maxWidth: 380 }}>
          <HistoryIcon size={44} color="var(--purple)" strokeWidth={1.8} />
          <h3 style={{ marginTop: 16, marginBottom: 8 }}>Connect Wallet to View History</h3>
          <p className="text-sm color-text3">
            Log in with your Sui wallet or Google zkLogin to see your split payment requests and transaction status.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        {/* Page Header */}
        <div className="flex items-center justify-between mb-20">
          <div className="flex items-center gap-12">
            <div style={{
              width: 42, height: 42, borderRadius: 14,
              background: 'linear-gradient(135deg, var(--lavender) 0%, var(--purple) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(159,157,243,0.35)',
            }}>
              <HistoryIcon size={22} color="var(--deep)" strokeWidth={1.9} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem' }}>Split History</h2>
              <p className="color-text3 text-sm">
                Track split payment requests, statuses, and SuiVision digests
              </p>
            </div>
          </div>
        </div>

        {/* ── Segmented Tab Control ────────────────────────────── */}
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
            onClick={() => setActiveTab('outgoing')}
            style={{
              flex: 1,
              padding: '10px 8px',
              borderRadius: 12,
              border: 'none',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              background: activeTab === 'outgoing' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'outgoing' ? 'var(--deep)' : 'var(--text-3)',
              boxShadow: activeTab === 'outgoing' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 200ms ease',
            }}
          >
            Sent Requests ({outgoingRequests.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('incoming')}
            style={{
              flex: 1,
              padding: '10px 8px',
              borderRadius: 12,
              border: 'none',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              background: activeTab === 'incoming' ? 'var(--surface)' : 'transparent',
              color: activeTab === 'incoming' ? 'var(--deep)' : 'var(--text-3)',
              boxShadow: activeTab === 'incoming' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 200ms ease',
            }}
          >
            Received Requests ({incomingRequests.length})
            {incomingRequests.length > 0 && (
              <span style={{
                background: 'var(--purple)',
                color: '#fff',
                fontSize: '0.68rem',
                padding: '1px 6px',
                borderRadius: 10,
              }}>
                {incomingRequests.length}
              </span>
            )}
          </button>
        </div>

        {payError && (
          <div className="clay-card flat mb-16" style={{ padding: '12px 16px', background: 'rgba(255,155,179,0.2)', border: '1px solid #c0392b' }}>
            <p className="text-xs" style={{ color: '#c0392b', margin: 0, fontWeight: 600 }}>⚠️ {payError}</p>
          </div>
        )}

        {/* ── TAB 1: OUTGOING REQUESTS (Sent by user) ────────────── */}
        {activeTab === 'outgoing' && (
          <motion.div key="tab-outgoing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3].map((n) => (
                  <div key={n} className="skeleton" style={{ height: 72, borderRadius: 16 }} />
                ))}
              </div>
            ) : outgoingRequests.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {outgoingRequests.map((req: any) => (
                  <div
                    key={req.id}
                    className="clay-card flat"
                    style={{
                      padding: '16px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                      <Avatar
                        name={req.payerName || req.payerAddress}
                        color={AVATAR_COLORS[1]}
                        size="md"
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span className="font-semibold text-sm truncate" style={{ color: 'var(--deep)' }}>
                            Request to {req.payerName || 'Friend'}
                          </span>
                          {req.status === 'pending' && (
                            <span className="badge badge-purple" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                              ⏱ Pending
                            </span>
                          )}
                          {req.status === 'paid' && (
                            <span className="badge badge-green" style={{ fontSize: '0.72rem', padding: '2px 8px', background: 'rgba(201,235,202,0.8)', color: '#256328' }}>
                              ✅ Paid
                            </span>
                          )}
                          {req.status === 'declined' && (
                            <span className="badge" style={{ fontSize: '0.72rem', padding: '2px 8px', background: 'rgba(255,155,179,0.3)', color: '#c0392b' }}>
                              ✕ Declined
                            </span>
                          )}
                        </div>

                        <div className="text-xs color-text3 mt-4 truncate">
                          {req.purpose || 'Payment Request'} · {formatTime(req.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div className="amount-big" style={{ fontSize: '1.25rem' }}>
                        <span className="amount-currency" style={{ fontSize: '0.75rem' }}>SUI</span>
                        {Number(req.amountSui).toFixed(3)}
                      </div>

                      {req.digest && (
                        <a
                          href={`https://testnet.suivision.xyz/txblock/${req.digest}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs color-purple"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, fontWeight: 700 }}
                        >
                          <LinkIcon size={12} color="var(--purple)" strokeWidth={2.2} />
                          SuiVision
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <EmptyBoxIcon size={48} color="var(--lavender)" strokeWidth={1.3} />
                <h3>No Outgoing Requests Yet</h3>
                <p className="text-sm color-text3" style={{ maxWidth: 320 }}>
                  When you request money from friends on the Split page, your request status will appear here.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── TAB 2: INCOMING REQUESTS (Received from others) ──────── */}
        {activeTab === 'incoming' && (
          <motion.div key="tab-incoming" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3].map((n) => (
                  <div key={n} className="skeleton" style={{ height: 72, borderRadius: 16 }} />
                ))}
              </div>
            ) : incomingRequests.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {incomingRequests.map((req: any) => (
                  <div
                    key={req.id}
                    className="clay-card flat"
                    style={{
                      padding: '16px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                      <Avatar
                        name={req.requesterName || req.requesterAddress}
                        color={AVATAR_COLORS[0]}
                        size="md"
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="font-semibold text-sm truncate" style={{ color: 'var(--deep)' }}>
                          {req.requesterName || 'Friend'} requested payment
                        </div>
                        <div className="text-xs color-text3 mt-4 truncate">
                          {req.purpose || 'Payment Request'} · {formatTime(req.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      <div className="amount-big" style={{ fontSize: '1.2rem', textAlign: 'right' }}>
                        <span className="amount-currency" style={{ fontSize: '0.72rem' }}>SUI</span>
                        {Number(req.amountSui).toFixed(3)}
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          disabled={payingReqId === req.id || declineMutation.isPending}
                          onClick={() => handlePay(req)}
                          className="btn btn-primary btn-sm"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <PayIcon size={13} color="#fff" strokeWidth={2} />
                          {payingReqId === req.id ? 'Paying…' : 'Pay'}
                        </button>

                        <button
                          type="button"
                          disabled={payingReqId === req.id || declineMutation.isPending}
                          onClick={() => declineMutation.mutate(req.id)}
                          className="btn btn-ghost btn-sm"
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.78rem',
                            color: '#c0392b',
                            borderColor: 'rgba(192,57,43,0.3)',
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <EmptyBoxIcon size={48} color="var(--lavender)" strokeWidth={1.3} />
                <h3>No Received Requests</h3>
                <p className="text-sm color-text3" style={{ maxWidth: 320 }}>
                  You have no pending payment requests from friends right now.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </main>
  );
}
