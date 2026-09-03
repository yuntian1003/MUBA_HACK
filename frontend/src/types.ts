// src/types.ts

// Backend API types (what the server returns)
export interface ApiUser {
  address: string;
  nickname: string | null;
  avatarColor: string;
  email?: string;
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
}

// Utility to map an ApiUser → frontend Member
export function apiUserToMember(u: ApiUser): Member {
  return {
    id: u.address,
    name: u.nickname || (u.email ? u.email.split('@')[0] : u.address.slice(0, 8) + '…'),
    walletAddress: u.address,
    avatarColor: u.avatarColor || '#9F9DF3',
    email: u.email,
  };
}

// Utility to map an ApiCommunity → frontend Community
export function apiCommunityToFrontend(c: ApiCommunity): Community {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    lastActivity: c.lastActivity,
    members: c.members.map(apiUserToMember),
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
