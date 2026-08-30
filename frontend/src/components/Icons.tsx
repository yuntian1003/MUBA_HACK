// src/components/Icons.tsx
// Clean 2-D SVG icon library for SmartSplit.
// All icons: 24×24 viewBox, stroke-based, round caps/joins.

import type { CSSProperties } from 'react';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: CSSProperties;
  className?: string;
}

const defaults = { size: 24, color: 'currentColor', strokeWidth: 1.8 };

function svg(
  props: IconProps,
  children: React.ReactNode,
) {
  const { size = defaults.size, color = defaults.color, strokeWidth = defaults.strokeWidth, style, className } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/* ─── Navigation ─────────────────────────────────────────────────── */

export function HomeIcon(p: IconProps) {
  return svg(p,
    <>
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </>,
  );
}

export function SplitIcon(p: IconProps) {
  return svg(p,
    <>
      <circle cx="18" cy="6"  r="2" />
      <circle cx="18" cy="18" r="2" />
      <circle cx="6"  cy="12" r="2" />
      <path d="M8 12h5.5M13.5 12 16 6.5M13.5 12 16 17.5" />
    </>,
  );
}

export function CommunityIcon(p: IconProps) {
  return svg(p,
    <>
      <circle cx="9"  cy="7"  r="3" />
      <circle cx="18" cy="8"  r="2.5" />
      <path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
      <path d="M15.5 14c2.8.3 4.5 2 4.5 4" />
    </>,
  );
}

export function FriendsIcon(p: IconProps) {
  return svg(p,
    <>
      <path d="M12 12c2.7 0 5-1.3 5-4S14.7 4 12 4 7 5.3 7 8s2.3 4 5 4z" />
      <path d="M4 20c0-2.8 3.6-5 8-5" />
      <path d="M16 17l2 2 4-4" />
    </>,
  );
}

export function ProfileIcon(p: IconProps) {
  return svg(p,
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
    </>,
  );
}

/* ─── Actions ────────────────────────────────────────────────────── */

export function PayIcon(p: IconProps) {
  return svg(p,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 14.5c0 1.4 1.3 2.5 3 2.5s3-1.1 3-2.5-1.3-2.5-3-2.5-3-1.1-3-2.5S10.7 7 12 7s3 1.1 3 2.5" />
      <path d="M12 6v1M12 17v1" />
    </>,
  );
}

export function ReceiveIcon(p: IconProps) {
  return svg(p,
    <>
      <path d="M12 3v12M8 11l4 4 4-4" />
      <path d="M3 17v1a3 3 0 003 3h12a3 3 0 003-3v-1" />
    </>,
  );
}

export function TransferIcon(p: IconProps) {
  return svg(p,
    <>
      <path d="M5 12h14M15 7l5 5-5 5" />
    </>,
  );
}

export function RequestIcon(p: IconProps) {
  return svg(p,
    <>
      <path d="M19 12H5M9 17l-5-5 5-5" />
    </>,
  );
}

export function ViewProfileIcon(p: IconProps) {
  return svg(p,
    <>
      <circle cx="12" cy="9" r="3.5" />
      <path d="M5 20c0-3 3.1-5 7-5s7 2 7 5" />
      <path d="M15 4l2 2-4 4" strokeWidth={1.5} />
    </>,
  );
}

/* ─── Status ─────────────────────────────────────────────────────── */

export function CheckCircleIcon(p: IconProps) {
  return svg(p,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l3 3 5-5" />
    </>,
  );
}

export function AlertCircleIcon(p: IconProps) {
  return svg(p,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" strokeWidth={2} />
    </>,
  );
}

/* ─── UI Controls ────────────────────────────────────────────────── */

export function SearchIcon(p: IconProps) {
  return svg(p,
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M16.5 16.5l3.5 3.5" />
    </>,
  );
}

export function PlusIcon(p: IconProps) {
  return svg(p,
    <>
      <path d="M12 4v16M4 12h16" />
    </>,
  );
}

export function CloseIcon(p: IconProps) {
  return svg(p,
    <>
      <path d="M18 6L6 18M6 6l12 12" />
    </>,
  );
}

export function BackIcon(p: IconProps) {
  return svg(p,
    <>
      <path d="M19 12H5M10 7l-5 5 5 5" />
    </>,
  );
}

export function ChevronRightIcon(p: IconProps) {
  return svg(p,
    <path d="M9 6l6 6-6 6" />,
  );
}

export function CopyIcon(p: IconProps) {
  return svg(p,
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 9V5a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h4" />
    </>,
  );
}

export function LogoutIcon(p: IconProps) {
  return svg(p,
    <>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>,
  );
}

/* ─── Feature icons ──────────────────────────────────────────────── */

export function WalletIcon(p: IconProps) {
  return svg(p,
    <>
      <rect x="2" y="6" width="20" height="14" rx="3" />
      <path d="M16 13a1 1 0 100 2 1 1 0 000-2z" fill="currentColor" stroke="none" />
      <path d="M2 10h20" />
    </>,
  );
}

export function LockIcon(p: IconProps) {
  return svg(p,
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
    </>,
  );
}

export function GlobeIcon(p: IconProps) {
  return svg(p,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M2 12h20M12 3c-2.5 3-4 5.7-4 9s1.5 6 4 9M12 3c2.5 3 4 5.7 4 9s-1.5 6-4 9" />
    </>,
  );
}

export function BoltIcon(p: IconProps) {
  return svg(p,
    <path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H13L13 2z" />,
  );
}

export function ShieldIcon(p: IconProps) {
  return svg(p,
    <>
      <path d="M12 3l8 4v5c0 4.4-3.4 8.5-8 9.9C7.4 20.5 4 16.4 4 12V7l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </>,
  );
}

export function CoinIcon(p: IconProps) {
  return svg(p,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 14.5c0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5-1.1-2-2.5-2-2.5-1.1-2.5-2.5S10.6 7 12 7s2.5 1.1 2.5 2.5" />
      <path d="M12 5.5V7M12 17v1.5" />
    </>,
  );
}

export function LinkIcon(p: IconProps) {
  return svg(p,
    <>
      <path d="M10 13a5 5 0 007.5.6l2-2a5 5 0 00-7-7l-1 1" />
      <path d="M14 11a5 5 0 00-7.5-.6l-2 2a5 5 0 007 7l1-1" />
    </>,
  );
}

export function HistoryIcon(p: IconProps) {
  return svg(p,
    <>
      <path d="M3 12a9 9 0 109-9H3" />
      <path d="M3 5v7h7" />
      <path d="M12 7v5l3 3" />
    </>,
  );
}

export function EditIcon(p: IconProps) {
  return svg(p,
    <>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </>,
  );
}

export function GroupIcon(p: IconProps) {
  return svg(p,
    <>
      <circle cx="7"  cy="8"  r="3" />
      <circle cx="17" cy="8"  r="3" />
      <circle cx="12" cy="6"  r="3" />
      <path d="M1 20c0-2.5 2.7-4.5 6-4.5M23 20c0-2.5-2.7-4.5-6-4.5M8 20c0-2.5 1.8-4.5 4-4.5s4 2 4 4.5" />
    </>,
  );
}

export function EmptyBoxIcon(p: IconProps) {
  return svg({ ...p, strokeWidth: p.strokeWidth ?? 1.5 },
    <>
      <path d="M21 16V8a2 2 0 00-1-1.7l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.7l7 4a2 2 0 002 0l7-4a2 2 0 001-1.7z" />
      <path d="M3.3 7l8.7 5 8.7-5M12 22V12" />
    </>,
  );
}

export function CheckIcon(p: IconProps) {
  return svg(p,
    <path d="M20 6L9 17l-5-5" />,
  );
}

export function ExploreIcon(p: IconProps) {
  return svg(p,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M16.2 7.8l-4.2 8.4-4.2-4.2 8.4-4.2z" />
    </>,
  );
}
