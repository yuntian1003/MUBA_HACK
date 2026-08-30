// src/pages/HomePage.tsx
import { useNavigate } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { Logo } from '../components/Logo';
import { Avatar } from '../components/Avatar';
import {
  SplitIcon, CommunityIcon, FriendsIcon,
  ShieldIcon, GlobeIcon, BoltIcon, CoinIcon,
} from '../components/Icons';
import { motion } from 'framer-motion';

// Small 2-D illustration for the connect blob
function SplitIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Central coin */}
      <circle cx="40" cy="40" r="18" fill="white" fillOpacity="0.3" stroke="white" strokeWidth="2" />
      <circle cx="40" cy="40" r="12" fill="white" fillOpacity="0.5" />
      {/* Dollar lines */}
      <path d="M36 44c0 2.2 1.8 4 4 4s4-1.8 4-4-1.8-3-4-3-4-1.8-4-4 1.8-4 4-4 4 1.8 4 4" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M40 33v2M40 45v2" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      {/* Radiating split arrows */}
      <path d="M40 22V14M36 16l4-4 4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M58 40h8M63 36l4 4-4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 40h8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M22 36l-8 4 8 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Card-specific 2-D illustrations
function SplitCardIllustration() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="22" fill="rgba(255,255,255,0.18)" />
      <circle cx="40" cy="14" r="5" fill="white" fillOpacity="0.9" />
      <circle cx="40" cy="38" r="5" fill="white" fillOpacity="0.9" />
      <circle cx="12" cy="26" r="5" fill="white" fillOpacity="0.9" />
      <path d="M17 26h9M26 26l12-10M26 26l12 10"
        stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CommunityCardIllustration() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="22" fill="rgba(255,255,255,0.18)" />
      <circle cx="26" cy="19" r="6" fill="white" fillOpacity="0.95" />
      <circle cx="14" cy="24" r="5" fill="white" fillOpacity="0.75" />
      <circle cx="38" cy="24" r="5" fill="white" fillOpacity="0.75" />
      <path d="M10 38c0-4 3.6-7 8-7M42 38c0-4-3.6-7-8-7M18 38c0-3 3.6-5 8-5s8 2 8 5"
        stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FriendsCardIllustration() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="22" fill="rgba(58,122,60,0.15)" />
      <circle cx="26" cy="20" r="7" fill="#3a7a3c" fillOpacity="0.7" />
      <path d="M14 40c0-4 5.4-7.5 12-7.5s12 3.5 12 7.5"
        stroke="#3a7a3c" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
      <path d="M36 28l3 3 5-5" stroke="#3a7a3c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const MENU_CARDS = [
  {
    path: '/split',
    Illustration: SplitCardIllustration,
    Icon: SplitIcon,
    title: 'Split',
    description: 'Create payment requests and split group expenses atomically',
    gradient: 'linear-gradient(135deg, #9F9DF3 0%, #6353AC 100%)',
    glow: 'rgba(159,157,243,0.40)',
    textColor: '#fff',
    subColor: 'rgba(255,255,255,0.80)',
  },
  {
    path: '/community',
    Illustration: CommunityCardIllustration,
    Icon: CommunityIcon,
    title: 'Community',
    description: 'Manage your groups and pre-select members for splits',
    gradient: 'linear-gradient(135deg, #FF9BB3 0%, #e0607e 100%)',
    glow: 'rgba(255,155,179,0.40)',
    textColor: '#fff',
    subColor: 'rgba(255,255,255,0.80)',
  },
  {
    path: '/friends',
    Illustration: FriendsCardIllustration,
    Icon: FriendsIcon,
    title: 'Friends',
    description: 'Send and request one-on-one payments with your contacts',
    gradient: 'linear-gradient(135deg, #C9EBCA 0%, #9dd9a0 100%)',
    glow: 'rgba(201,235,202,0.55)',
    textColor: '#2d5a2e',
    subColor: 'rgba(45,90,46,0.70)',
  },
];

const FEATURE_TAGS = [
  { Icon: BoltIcon,   label: 'Atomic PTB'        },
  { Icon: ShieldIcon, label: 'Non-custodial'      },
  { Icon: GlobeIcon,  label: 'Sui Testnet'        },
  { Icon: CoinIcon,   label: 'Equal split'        },
];

export function HomePage() {
  const account = useCurrentAccount();
  const navigate = useNavigate();

  if (!account) {
    return (
      <main className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 70px)' }}>
        <div className="connect-hero">
          <div className="connect-blob">
            <SplitIllustration />
          </div>
          <div>
            <h1 className="text-center" style={{ marginBottom: 12 }}>
              Define the Rules.<br />
              <span className="gradient-text">Let Sui Move the Money.</span>
            </h1>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <ConnectButton />
            <p className="text-xs color-text3">No custody. No signup. Just your wallet.</p>
          </div>

          {/* Feature tags */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 16 }}>
            {FEATURE_TAGS.map(({ Icon, label }) => (
              <span
                key={label}
                className="badge badge-purple"
                style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Icon size={13} color="var(--deep)" strokeWidth={2.2} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </main>
    );
  }

  const shortAddr = account.address.slice(0, 8) + '…' + account.address.slice(-6);
  const localName = localStorage.getItem(`nickname-${account.address}`);
  const displayName = localName || account.label || shortAddr;

  return (
    <main className="page">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: 28 }}
      >
        <div className="flex items-center gap-12" style={{ marginBottom: 6 }}>
          <Avatar name={account.address} color="#9F9DF3" size="lg" />
          <div>
            <p className="text-sm color-text3" style={{ marginBottom: 2 }}>Welcome back</p>
            <h2 style={{ fontSize: '1.05rem' }}>{displayName}</h2>
          </div>
        </div>
      </motion.div>

      {/* Hero tagline */}
      <motion.div
        className="clay-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{
          padding: '24px',
          marginBottom: 28,
          background: 'linear-gradient(135deg, rgba(159,157,243,0.15) 0%, rgba(255,155,179,0.12) 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decoration */}
        <div style={{ position: 'absolute', top: -10, right: -10, opacity: 0.07 }}>
          <SplitIcon size={100} color="var(--deep)" strokeWidth={0.8} />
        </div>
        <p className="text-sm color-text3" style={{ marginBottom: 4, fontWeight: 600 }}>SmartSplit</p>
        <h2 style={{ fontSize: '1.3rem', marginBottom: 8 }}>
          Define the Rules.<br />
          <span className="gradient-text">Let Sui Move the Money.</span>
        </h2>
        <p className="text-sm color-text2">
          One atomic transaction. Every recipient paid. No manual follow-ups.
        </p>
      </motion.div>

      {/* Menu cards */}
      <p className="section-title">WHAT WOULD YOU LIKE TO DO?</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {MENU_CARDS.map((card, i) => (
          <motion.button
            key={card.path}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.15 + i * 0.08 }}
            onClick={() => navigate(card.path)}
            style={{
              width: '100%',
              padding: '20px 24px',
              border: 'none',
              borderRadius: 24,
              cursor: 'pointer',
              background: card.gradient,
              boxShadow: `0 8px 28px ${card.glow}`,
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              textAlign: 'left',
              fontFamily: 'Outfit, sans-serif',
            }}
            whileHover={{ scale: 1.02, y: -3 }}
            whileTap={{ scale: 0.97 }}
          >
            <card.Illustration />
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                color: card.textColor,
                marginBottom: 4,
                textShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}>
                {card.title}
              </div>
              <div style={{
                fontSize: '0.85rem',
                color: card.subColor,
                fontWeight: 400,
              }}>
                {card.description}
              </div>
            </div>
            <card.Icon
              size={20}
              color={card.textColor}
              strokeWidth={2}
              style={{ opacity: 0.7, flexShrink: 0 }}
            />
          </motion.button>
        ))}
      </div>

      {/* Quick stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        style={{ marginTop: 32 }}
      >
        <p className="section-title">QUICK STATS</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Splits created', value: '0',      Icon: SplitIcon,     color: '#9F9DF3' },
            { label: 'Communities',    value: '3',      Icon: CommunityIcon, color: '#FF9BB3' },
            { label: 'Friends',        value: '6',      Icon: FriendsIcon,   color: '#C9EBCA' },
            { label: 'Time saved',     value: 'Lots',   Icon: BoltIcon,      color: '#D5D6F2' },
          ].map(({ label, value, Icon, color }) => (
            <div key={label} className="clay-card flat" style={{ padding: '16px 18px' }}>
              <div style={{ marginBottom: 8 }}>
                <Icon size={20} color={color} strokeWidth={2} />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--deep)', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </main>
  );
}
