// src/components/Header.tsx
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Logo } from './Logo';
import { Avatar } from './Avatar';
import { LogoutIcon } from './Icons';
import { useZkLogin } from '../hooks/useZkLogin';

function shortAddress(addr: string) {
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

const NAV_ITEMS = [
  { label: 'Home',      path: '/'          },
  { label: 'Split',     path: '/split'     },
  { label: 'Community', path: '/community' },
  { label: 'Friends',   path: '/friends'   },
  { label: 'Profile',   path: '/profile'   },
];

export function Header() {
  const walletAccount = useCurrentAccount();
  const { disconnectWallet } = useDAppKit();
  const { zkAccount, loginWithGoogle, logoutZkLogin, isLoading: isZkLoading } = useZkLogin();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logoutZkLogin();
    queryClient.clear();
    navigate('/');
  }

  const activeAccount = walletAccount
    ? { address: walletAccount.address, isZk: false }
    : zkAccount
    ? { address: zkAccount.address, name: zkAccount.name, picture: zkAccount.picture, isZk: true }
    : null;

  return (
    <header className="header">
      <div className="header-inner">
        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
        >
          <Logo size={32} showText={true} />
        </button>

        {/* Nav */}
        <nav className="header-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right: wallet or Google zkLogin connect */}
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {activeAccount ? (
            <>
              <div className="wallet-pill" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                {activeAccount.isZk && zkAccount?.picture ? (
                  <img
                    src={zkAccount.picture}
                    alt="Google avatar"
                    style={{ width: 22, height: 22, borderRadius: '50%' }}
                  />
                ) : (
                  <Avatar
                    name={activeAccount.address}
                    color="#9F9DF3"
                    size="sm"
                    style={{ width: 24, height: 24, fontSize: '0.6rem' }}
                  />
                )}
                <span className="wallet-dot" style={{ background: activeAccount.isZk ? '#4285F4' : undefined }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--deep)' }}>
                  {activeAccount.isZk ? `G: ${shortAddress(activeAccount.address)}` : shortAddress(activeAccount.address)}
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
                {isZkLoading ? 'Connecting…' : 'zkLogin with Google'}
              </button>
              <ConnectButton />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
