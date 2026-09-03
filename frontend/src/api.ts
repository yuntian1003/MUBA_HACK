// src/api.ts
// Central service layer for all backend API calls
// Vite proxies /api/* → http://localhost:3000/api/* to avoid CORS issues
const BASE_URL = '/api';

export async function fetchUsers(search = ''): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/users?q=${encodeURIComponent(search)}`);
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function fetchUser(address: string): Promise<any | null> {
  const res = await fetch(`${BASE_URL}/users/${encodeURIComponent(address)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
}

export async function upsertUser(address: string, nickname: string, avatarColor: string, email?: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, nickname, avatarColor, email }),
  });
  if (!res.ok) throw new Error('Failed to save user');
}

export async function deleteUser(address: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/${encodeURIComponent(address)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete user');
}

export async function fetchCommunities(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/communities`);
  if (!res.ok) throw new Error('Failed to fetch communities');
  return res.json();
}

export async function createCommunity(name: string, description: string, memberAddresses: string[]): Promise<any> {
  const res = await fetch(`${BASE_URL}/communities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, memberAddresses }),
  });
  if (!res.ok) throw new Error('Failed to create community');
  return res.json();
}

export async function createPaymentRequests(requests: Array<{
  requesterAddress: string;
  requesterName: string;
  payerAddress: string;
  payerName: string;
  amountSui: number;
  purpose: string;
}>): Promise<any> {
  const res = await fetch(`${BASE_URL}/payment-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });
  if (!res.ok) throw new Error('Failed to create payment requests');
  return res.json();
}

export async function fetchPaymentRequests(address: string): Promise<{ incoming: any[]; outgoing: any[] }> {
  const res = await fetch(`${BASE_URL}/payment-requests?address=${encodeURIComponent(address)}`);
  if (!res.ok) throw new Error('Failed to fetch payment requests');
  return res.json();
}

export async function updatePaymentRequest(id: string, update: { status: 'paid' | 'declined'; digest?: string }): Promise<void> {
  const res = await fetch(`${BASE_URL}/payment-requests/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw new Error('Failed to update payment request');
}
