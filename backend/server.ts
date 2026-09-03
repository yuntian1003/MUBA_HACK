// backend/server.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import path from 'path';

dotenv.config();

// Initialise Firebase Admin SDK
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ??
    path.resolve(__dirname, 'firebase-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath as string),
  });
}

const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

// Simple request logger for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ------------------- Users API -------------------
// Get a single user profile
app.get('/api/users/:address', async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.params.address).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(doc.data());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create or update a user profile (merge = true)
app.post('/api/users', async (req, res) => {
  try {
    let { address, nickname, avatarColor, email } = req.body;
    if (!address && !email) return res.status(400).json({ error: 'Address or email required' });

    // If only email is provided or address is empty, generate a valid deterministic mock address based on email
    if (!address && email) {
      const hash = Buffer.from(email).toString('hex').padEnd(64, '0').slice(0, 64);
      address = '0x' + hash;
    }

    await db.collection('users').doc(address).set(
      {
        address,
        nickname: nickname || (email ? email.split('@')[0] : 'Friend'),
        avatarColor: avatarColor || '#9F9DF3',
        email: email || '',
      },
      { merge: true }
    );
    res.json({ success: true, address, nickname, email });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to upsert user' });
  }
});

// Delete a user profile (remove friend)
app.delete('/api/users/:address', async (req, res) => {
  try {
    const { address } = req.params;
    await db.collection('users').doc(address).delete();
    res.json({ success: true, address });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Search all users (simple client‑side filter for demo)
app.get('/api/users', async (req, res) => {
  try {
    const q = (req.query.q as string || '').toLowerCase();
    const snapshot = await db.collection('users').get();
    let users: any[] = snapshot.docs.map(d => ({ ...d.data(), address: d.id }));
    if (q) {
      users = users.filter((u: any) =>
        (u.nickname && u.nickname.toLowerCase().includes(q)) ||
        (u.address && u.address.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
      );
    }
    res.json(users);
  } catch (e) {
    console.error('Error fetching users:', e);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ------------------- Communities API -------------------
// Get all communities with their members
app.get('/api/communities', async (req, res) => {
  try {
    const commSnap = await db.collection('communities').get();
    const communities = await Promise.all(
      commSnap.docs.map(async commDoc => {
        const communityData = commDoc.data();
        const membersSnap = await db
          .collection('communities')
          .doc(commDoc.id)
          .collection('members')
          .get();
        const members = membersSnap.docs.map(mDoc => mDoc.data());
        return { id: commDoc.id, ...communityData, members };
      })
    );
    res.json(communities);
  } catch (e) {
    console.error('Error fetching communities:', e);
    res.status(500).json({ error: 'Failed to fetch communities' });
  }
});

// Create a new community and add members
app.post('/api/communities', async (req, res) => {
  try {
    const { name, description, memberAddresses } = req.body;
    const id = 'community_' + Date.now();
    const lastActivity = 'Just now';

    // Create community document
    await db.collection('communities').doc(id).set({ name, description: description || '', lastActivity });

    // Add each member as a sub‑document under the community
    const memberPromises = (memberAddresses || []).map(async (address: string) => {
      const userDoc = await db.collection('users').doc(address).get();
      const userData = userDoc.exists ? userDoc.data() : {};
      const memberData = {
        walletAddress: address,
        name: userData?.nickname || address.slice(0, 8) + '…',
        avatarColor: userData?.avatarColor || '#9F9DF3',
      };
      await db
        .collection('communities')
        .doc(id)
        .collection('members')
        .doc(address)
        .set(memberData);
    });
    await Promise.all(memberPromises);

    res.json({ id, name, description, lastActivity });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create community' });
  }
});

// ------------------- Payment Requests API -------------------
// Create one or more payment requests
app.post('/api/payment-requests', async (req, res) => {
  try {
    const rawRequests = Array.isArray(req.body.requests) ? req.body.requests : [req.body];
    const created: any[] = [];

    for (const r of rawRequests) {
      if (!r.payerAddress || !r.requesterAddress || !r.amountSui) {
        continue;
      }
      const id = 'payreq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const data = {
        id,
        requesterAddress: r.requesterAddress.trim(),
        requesterName: r.requesterName || 'Requester',
        payerAddress: r.payerAddress.trim(),
        payerName: r.payerName || 'Friend',
        amountSui: Number(r.amountSui),
        purpose: r.purpose || 'Payment Request',
        status: 'pending',
        createdAt: Date.now(),
      };
      await db.collection('payment_requests').doc(id).set(data);
      created.push(data);
    }

    res.json({ success: true, count: created.length, requests: created });
  } catch (e) {
    console.error('Error creating payment requests:', e);
    res.status(500).json({ error: 'Failed to create payment requests' });
  }
});

// Get payment requests for an address (incoming requests to pay, and outgoing requests)
app.get('/api/payment-requests', async (req, res) => {
  try {
    const address = (req.query.address as string || '').toLowerCase().trim();
    const snap = await db.collection('payment_requests').get();
    const all = snap.docs.map(d => d.data());

    if (!address) {
      return res.json({ incoming: all, outgoing: [] });
    }

    const incoming = all
      .filter((r: any) => r.payerAddress?.toLowerCase() === address && r.status === 'pending')
      .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));

    const outgoing = all
      .filter((r: any) => r.requesterAddress?.toLowerCase() === address)
      .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));

    res.json({ incoming, outgoing });
  } catch (e) {
    console.error('Error fetching payment requests:', e);
    res.status(500).json({ error: 'Failed to fetch payment requests' });
  }
});

// Update payment request status (e.g. mark as paid or declined)
app.patch('/api/payment-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, digest } = req.body;
    if (!status) return res.status(400).json({ error: 'Status required' });

    const updateData: any = { status };
    if (status === 'paid') {
      updateData.paidAt = Date.now();
      if (digest) updateData.digest = digest;
    }

    await db.collection('payment_requests').doc(id).set(updateData, { merge: true });
    res.json({ success: true, id, ...updateData });
  } catch (e) {
    console.error('Error updating payment request:', e);
    res.status(500).json({ error: 'Failed to update payment request' });
  }
});

// ------------------- Server start -------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Using Firebase project: smartsplit-4728d`);
});
