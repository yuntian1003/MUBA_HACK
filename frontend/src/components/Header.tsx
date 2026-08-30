// src/components/Header.tsx
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { useNavigate, useLocation } from 'react-router-dom';
import { Logo } from './Logo';
import { Avatar } from './Avatar';
import { LogoutIcon } from './Icons';

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
  const account = useCurrentAccount();
  const { disconnectWallet } = useDAppKit();
  const navigate = useNavigate();
  const location = useLocation();

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

        {/* Right: wallet or connect */}
        <div className="header-right">
          {account ? (
            <>
              <div className="wallet-pill" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Avatar
                  name={account.address}
                  color="#9F9DF3"
                  size="sm"
                  style={{ width: 24, height: 24, fontSize: '0.6rem' }}
                />
                <span className="wallet-dot" />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--deep)' }}>
                  {shortAddress(account.address)}
                </span>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => disconnectWallet()}
                title="Disconnect wallet"
                style={{ display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <LogoutIcon size={14} color="var(--text-2)" strokeWidth={2} />
                Logout
              </button>
            </>
          ) : (
            <ConnectButton />
          )}
        </div>
      </div>
    </header>
  );
}
