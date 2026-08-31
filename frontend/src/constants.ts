// src/constants.ts
import type { Community, Member } from './types';

export const AVATAR_COLORS = [
  '#9F9DF3', '#FF9BB3', '#C9EBCA', '#FFD6A5', '#A5C8FF', '#F8B4D9', '#B5EAD7', '#FFDAC1',
];

// ⚠️  DEMO ONLY — replace these with real funded testnet wallet addresses before the live demo.
// Each address must be a valid 0x + 64 hex chars Sui address.
export const DEMO_MEMBERS: Member[] = [
  { id: '1', name: 'Alice Lim',   walletAddress: '0x0000000000000000000000000000000000000000000000000000000000000001', avatarColor: '#9F9DF3', phone: '+60121234567' },
  { id: '2', name: 'Bob Tan',     walletAddress: '0x0000000000000000000000000000000000000000000000000000000000000002', avatarColor: '#FF9BB3', phone: '+60129876543' },
  { id: '3', name: 'Charlie Ng',  walletAddress: '0x0000000000000000000000000000000000000000000000000000000000000003', avatarColor: '#C9EBCA', phone: '+60135551234' },
  { id: '4', name: 'David Wong',  walletAddress: '0x0000000000000000000000000000000000000000000000000000000000000004', avatarColor: '#FFD6A5', phone: '+60147778888' },
  { id: '5', name: 'Eve Chong',   walletAddress: '0x0000000000000000000000000000000000000000000000000000000000000005', avatarColor: '#A5C8FF', phone: '+60158889999' },
  { id: '6', name: 'Frank Lee',   walletAddress: '0x0000000000000000000000000000000000000000000000000000000000000006', avatarColor: '#F8B4D9', phone: '+60161112222' },
];

export const DEMO_COMMUNITIES: Community[] = [
  {
    id: 'usm-hack',
    name: 'USM Hackathon Team',
    members: DEMO_MEMBERS,
    lastActivity: '2 hours ago',
    description: 'USM x Blockchain Hackathon 2026',
  },
  {
    id: 'roommates',
    name: 'Roommates',
    members: DEMO_MEMBERS.slice(0, 3),
    lastActivity: 'Yesterday',
    description: 'Shared apartment expenses',
  },
  {
    id: 'boba-club',
    name: 'Boba Club',
    members: DEMO_MEMBERS.slice(2, 5),
    lastActivity: '3 days ago',
    description: 'Weekly boba runs',
  },
];

// MIST per SUI (1 SUI = 1e9 MIST)
export const MIST_PER_SUI = 1_000_000_000n;

// Minimum split amount in MIST (0.001 SUI)
export const MIN_SPLIT_AMOUNT = 1_000_000n;
