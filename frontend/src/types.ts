// src/types.ts

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
  phone?: string;
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

export type Page = 'home' | 'split' | 'community' | 'friends' | 'profile';
