// src/components/BottomNav.tsx
import { useNavigate, useLocation } from 'react-router-dom';
import { HomeIcon, SplitIcon, HistoryIcon, CommunityIcon, FriendsIcon, ProfileIcon } from './Icons';

const NAV_ITEMS = [
  { path: '/',          Icon: HomeIcon,      label: 'Home'      },
  { path: '/split',     Icon: SplitIcon,     label: 'Split'     },
  { path: '/history',   Icon: HistoryIcon,   label: 'History'   },
  { path: '/community', Icon: CommunityIcon, label: 'Community' },
  { path: '/friends',   Icon: FriendsIcon,   label: 'Friends'   },
  { path: '/profile',   Icon: ProfileIcon,   label: 'Profile'   },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(({ path, Icon, label }) => {
        const active = location.pathname === path;
        return (
          <button
            key={path}
            className={`bottom-nav-item ${active ? 'active' : ''}`}
            onClick={() => navigate(path)}
            aria-label={label}
          >
            <Icon
              size={22}
              color={active ? 'var(--deep)' : 'var(--text-3)'}
              strokeWidth={active ? 2.2 : 1.7}
            />
            <span className="bottom-nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
