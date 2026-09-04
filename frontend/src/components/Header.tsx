// src/components/Header.tsx
import { useState, useEffect } from 'react';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from './Logo';
import { Avatar } from './Avatar';
import {
  MenuIcon, CloseIcon, LogoutIcon, HomeIcon, SplitIcon,
  HistoryIcon, CommunityIcon, FriendsIcon, ProfileIcon,
} from './Icons';
import { useZkLogin } from '../hooks/useZkLogin';
import { useSuiNSName } from '../hooks/useSuiNS';

function shortAddress(addr: string) {
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

const NAV_ITEMS = [
  { label: 'Home',      path: '/',          Icon: HomeIcon      },
  { label: 'Split',     path: '/split',     Icon: SplitIcon     },
  { label: 'History',   path: '/history',   Icon: HistoryIcon   },
  { label: 'Community', path: '/community', Icon: CommunityIcon },
  { label: 'Friends',   path: '/friends',   Icon: FriendsIcon   },
  { label: 'Profile',   path: '/profile',   Icon: ProfileIcon   },
];

export function Header() {
  const walletAccount = useCurrentAccount();
  const { disconnectWallet } = useDAppKit();
  const { zkAccount, loginWithGoogle, logoutZkLogin, isLoading: isZkLoading } = useZkLogin();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    logoutZkLogin();
    queryClient.clear();
    setSidebarOpen(false);
    navigate('/');
  }

  const activeAccount = walletAccount
    ? { address: walletAccount.address, label: walletAccount.label, isZk: false }
    : zkAccount
    ? { address: zkAccount.address, name: zkAccount.name, picture: zkAccount.picture, isZk: true }
    : null;

  const { data: suinsName } = useSuiNSName(activeAccount?.address);
  const [localNickname, setLocalNickname] = useState<string>('');

  useEffect(() => {
    if (!activeAccount?.address) {
      setLocalNickname('');
      return;
    }
    const updateName = () => {
      const saved = localStorage.getItem(`nickname-${activeAccount.address}`);
      setLocalNickname(saved || '');
    };
    updateName();
    window.addEventListener('storage', updateName);
    return () => window.removeEventListener('storage', updateName);
  }, [activeAccount?.address]);

  // Close sidebar automatically when route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const displayUsername =
    localNickname.trim() ||
    (activeAccount?.isZk ? activeAccount.name : (suinsName || zkAccount?.name || activeAccount?.label)) ||
    (activeAccount ? shortAddress(activeAccount.address) : '');

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Hamburger 3-Line Menu Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu options"
              style={{
                background: 'rgba(159,157,243,0.12)',
                border: '1.5px solid rgba(159,157,243,0.3)',
                borderRadius: 12,
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 200ms ease',
              }}
            >
              <MenuIcon size={20} color="var(--deep)" strokeWidth={2.2} />
            </button>

            {/* Logo */}
            <button
              onClick={() => navigate('/')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
            >
              <Logo size={30} showText={true} />
            </button>
          </div>

          {/* Right: wallet or Google zkLogin connect */}
          <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeAccount ? (
              <>
                <div className="wallet-pill" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  {zkAccount?.picture ? (
                    <img
                      src={zkAccount.picture}
                      alt="Google avatar"
                      style={{ width: 22, height: 22, borderRadius: '50%' }}
                    />
                  ) : (
                    <Avatar
                      name={displayUsername || activeAccount.address}
                      color="#9F9DF3"
                      size="sm"
                      style={{ width: 24, height: 24, fontSize: '0.6rem' }}
                    />
                  )}
                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: 'var(--deep)',
                      maxWidth: 140,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={activeAccount.address}
                  >
                    {displayUsername}
                  </span>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => (activeAccount.isZk ? handleLogout() : disconnectWallet())}
                  title="Disconnect account"
                  style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <LogoutIcon size={14} color="var(--text-2)" strokeWidth={2} />
                  Logout
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  className="btn btn-sm"
                  onClick={loginWithGoogle}
                  disabled={isZkLoading}
                  style={{
                    background: '#fff',
                    border: '1px solid #dadce0',
                    color: '#3c4043',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  {isZkLoading ? 'Connecting…' : 'zkLogin'}
                </button>
                <ConnectButton />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Slide-Out Sidebar Drawer ──────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSidebarOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.45)',
                backdropFilter: 'blur(3px)',
                zIndex: 999,
              }}
            />

            {/* Sidebar Panel */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                width: 290,
                maxWidth: '85vw',
                background: 'var(--surface)',
                borderRight: '1px solid var(--border)',
                boxShadow: '8px 0 32px rgba(0, 0, 0, 0.15)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                padding: '20px 16px',
              }}
            >
              {/* Sidebar Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <Logo size={28} showText={true} />
                <button
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 6,
                    borderRadius: 10,
                    color: 'var(--text-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CloseIcon size={20} color="var(--deep)" strokeWidth={2} />
                </button>
              </div>

              {/* Sidebar Navigation Items */}
              <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                {NAV_ITEMS.map(({ label, path, Icon }) => {
                  const active = location.pathname === path;
                  return (
                    <button
                      key={path}
                      onClick={() => {
                        navigate(path);
                        setSidebarOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '12px 16px',
                        borderRadius: 14,
                        border: 'none',
                        background: active ? 'linear-gradient(135deg, rgba(159,157,243,0.18), rgba(159,157,243,0.32))' : 'transparent',
                        color: active ? 'var(--deep)' : 'var(--text-2)',
                        fontWeight: active ? 700 : 500,
                        fontSize: '0.94rem',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 180ms ease',
                      }}
                    >
                      <Icon size={20} color={active ? 'var(--deep)' : 'var(--text-3)'} strokeWidth={active ? 2.2 : 1.8} />
                      {label}
                    </button>
                  );
                })}
              </nav>

              {/* Sidebar Footer Account Section */}
              <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                {activeAccount ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar
                        name={displayUsername || activeAccount.address}
                        color="#9F9DF3"
                        size="md"
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--deep)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {displayUsername}
                        </div>
                        <div className="text-xs color-text3" style={{ fontFamily: 'monospace' }}>
                          {shortAddress(activeAccount.address)}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => (activeAccount.isZk ? handleLogout() : disconnectWallet())}
                      className="btn btn-ghost btn-sm"
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#c0392b', borderColor: 'rgba(192,57,43,0.3)' }}
                    >
                      <LogoutIcon size={14} color="#c0392b" strokeWidth={2} />
                      Disconnect Account
                    </button>
                  </div>
                ) : (
                  <p className="text-xs color-text3" style={{ textAlign: 'center', margin: 0 }}>
                    Connect wallet to manage splits & requests
                  </p>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
