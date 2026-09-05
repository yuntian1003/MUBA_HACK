// src/types.ts

// Backend API types (what the server returns)
export interface ApiUser {
  address: string;
  nickname: string | null;
  avatarColor: string;
  email?: string;
  suins?: string;
}

export interface ApiCommunity {
  id: string;
  name: string;
  description: string;
  lastActivity: string;
  members: ApiUser[];
}

// Frontend display types
export interface Community {
  id: string;
  name: string;
  members: Member[];
  lastActivity: string;
  description?: string;
}

export interface Member {
  id: string;
  name: string;
  walletAddress: string;
  avatarColor: string;
  email?: string;
  phone?: string;
  suins?: string;
  linkedWalletAddress?: string;
  linkedZkAddress?: string;
}

// Utility to map an ApiUser → frontend Member
export function apiUserToMember(u: any): Member {
  if (!u) {
    return {
      id: 'unknown_' + Math.random(),
      name: 'Unknown Member',
      walletAddress: '',
      avatarColor: '#9F9DF3',
    };
  }
  // Prefer the linked on-chain Sui wallet address (e.g. Slush / Sui Wallet)
  // so payments and split funds land directly in the recipient's wallet extension!
  const destinationAddr = (u.linkedWalletAddress && u.linkedWalletAddress.startsWith('0x'))
    ? u.linkedWalletAddress
    : (u.walletAddress || u.address || '');
  const origAddr = u.address || u.walletAddress || destinationAddr || '';

  return {
    id: origAddr || 'user_' + Math.random(),
    name: u.nickname || u.name || (u.email ? u.email.split('@')[0] : (u.suins || (origAddr ? origAddr.slice(0, 8) + '…' : 'Member'))),
    walletAddress: destinationAddr,
    avatarColor: u.avatarColor || '#9F9DF3',
    email: u.email,
    suins: u.suins,
    linkedWalletAddress: u.linkedWalletAddress,
    linkedZkAddress: u.linkedZkAddress,
  };
}

// Utility to map an ApiCommunity → frontend Community
export function apiCommunityToFrontend(c: any): Community {
  if (!c) {
    return {
      id: 'community_unknown',
      name: 'Community',
      description: '',
      lastActivity: 'Recently',
      members: [],
    };
  }
  return {
    id: c.id || 'comm_' + Math.random(),
    name: c.name || 'Community',
    description: c.description || '',
    lastActivity: c.lastActivity || 'Recently',
    members: Array.isArray(c.members) ? c.members.map(apiUserToMember) : [],
  };
}

export interface SplitPayment {
  id: string;
  purpose: string;
  totalAmount: number;
  perPerson: number;
  currency: string;
  recipients: Member[];
  direction: 'pay' | 'receive';
  status: 'pending' | 'approved' | 'executed' | 'failed';
  txDigest?: string;
  createdAt: string;
}

export interface TxHistoryItem {
  digest: string;
  timestamp: string;
  type: 'sent' | 'received';
  amount: string;
  counterpart: string;
  status: 'success' | 'failure';
}

export interface PaymentRequest {
  id: string;
  requesterAddress: string;
  requesterName: string;
  payerAddress: string;
  payerName: string;
  amountSui: number;
  purpose: string;
  status: 'pending' | 'paid' | 'declined';
  createdAt: number;
  paidAt?: number;
  digest?: string;
}

export type Page = 'home' | 'split' | 'community' | 'friends' | 'profile';
