// Central service layer for all backend API calls
const BACKEND_HOST = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'https://smartsplit-backend-g1zf.onrender.com');
const BASE_URL = `${BACKEND_HOST.replace(/\/$/, '')}/api`;

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

export async function upsertUser(
  address: string,
  nickname: string,
  avatarColor: string,
  email?: string,
  extra?: { linkedZkAddress?: string; linkedWalletAddress?: string }
): Promise<void> {
  const res = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, nickname, avatarColor, email, ...extra }),
  });
  if (!res.ok) throw new Error('Failed to save user');
}

export async function deleteUser(address: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/${encodeURIComponent(address)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete user');
}

export async function fetchCommunities(ownerAddress: string): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/communities?owner=${encodeURIComponent(ownerAddress.toLowerCase())}`);
  if (!res.ok) throw new Error('Failed to fetch communities');
  return res.json();
}

export async function createCommunity(
  name: string,
  description: string,
  memberAddresses: string[],
  ownerAddress: string,
): Promise<any> {
  const res = await fetch(`${BASE_URL}/communities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, memberAddresses, ownerAddress }),
  });
  if (!res.ok) throw new Error('Failed to create community');
  return res.json();
}

// ── Per-user Friends API ──────────────────────────────────────────────────────
export async function fetchFriends(ownerAddress: string, search = ''): Promise<any[]> {
  const res = await fetch(
    `${BASE_URL}/users/${encodeURIComponent(ownerAddress.toLowerCase())}/friends?q=${encodeURIComponent(search)}`
  );
  if (!res.ok) throw new Error('Failed to fetch friends');
  return res.json();
}

export async function addFriend(
  ownerAddress: string,
  friend: { address: string; nickname: string; avatarColor: string; email?: string; suins?: string },
): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/users/${encodeURIComponent(ownerAddress.toLowerCase())}/friends`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(friend),
    }
  );
  if (!res.ok) throw new Error('Failed to add friend');
}

export async function removeFriend(ownerAddress: string, friendAddress: string): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/users/${encodeURIComponent(ownerAddress.toLowerCase())}/friends/${encodeURIComponent(friendAddress.toLowerCase())}`,
    { method: 'DELETE' }
  );
  if (!res.ok) throw new Error('Failed to remove friend');
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
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.details || errorData?.error || 'Failed to create payment requests');
  }
  return res.json();
}

export async function fetchPaymentRequests(
  address: string,
  email?: string,
  additionalAddresses: string[] = [],
): Promise<{ incoming: any[]; outgoing: any[]; received: any[]; sent: any[] }> {
  const params = new URLSearchParams();
  const addresses = new Set(
    [address, ...additionalAddresses]
      .map((value) => value.toLowerCase().trim())
      .filter(Boolean),
  );
  addresses.forEach((value) => params.append('address', value));
  if (email) params.append('email', email);
  const res = await fetch(`${BASE_URL}/payment-requests?${params.toString()}`);
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

// ── Friend Requests API ───────────────────────────────────────────────────────
export async function sendFriendRequest(request: {
  senderAddress: string;
  senderName: string;
  senderAvatarColor: string;
  senderEmail?: string;
  senderSuins?: string;
  recipientAddress?: string;
  recipientEmail?: string;
  recipientName: string;
  recipientSuins?: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/friend-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('Failed to send friend request');
  return res.json();
}

export async function fetchFriendRequests(address: string, email?: string): Promise<{ incoming: any[]; outgoing: any[] }> {
  const params = new URLSearchParams();
  if (address) params.append('address', address);
  if (email) params.append('email', email);
  const res = await fetch(`${BASE_URL}/friend-requests?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch friend requests');
  return res.json();
}

export async function updateFriendRequest(
  id: string,
  status: 'accepted' | 'rejected' | 'canceled',
  recipientInfo?: { address: string; name: string; avatarColor: string; email?: string }
): Promise<any> {
  const res = await fetch(`${BASE_URL}/friend-requests/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status,
      recipientAddress: recipientInfo?.address,
      recipientName: recipientInfo?.name,
      recipientAvatarColor: recipientInfo?.avatarColor,
      recipientEmail: recipientInfo?.email,
    }),
  });
  if (!res.ok) throw new Error('Failed to update friend request');
  return res.json();
}

