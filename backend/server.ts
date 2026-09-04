// backend/server.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

dotenv.config();

let hasFirebaseCredentials = false;
let db: FirebaseFirestore.Firestore | any = null;

// 1. Try FIREBASE_SERVICE_ACCOUNT environment variable first (for Render deployment)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccountObj = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountObj),
      });
    }
    db = admin.firestore();
    hasFirebaseCredentials = true;
    console.log('Firebase initialized from FIREBASE_SERVICE_ACCOUNT environment variable.');
  } catch (err) {
    console.warn('Failed to initialize Firebase from FIREBASE_SERVICE_ACCOUNT env var:', err);
  }
}

// 2. Try local firebase-key.json file if env var was not present/valid
if (!hasFirebaseCredentials) {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? path.resolve(__dirname, 'firebase-key.json');
  if (fs.existsSync(serviceAccountPath)) {
    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccountPath as string),
        });
      }
      db = admin.firestore();
      hasFirebaseCredentials = true;
      console.log('Firebase initialized from local firebase-key.json file.');
    } catch (err) {
      console.warn('Failed to initialize Firebase from firebase-key.json:', err);
    }
  }
}

if (!hasFirebaseCredentials) {
  console.warn('Firebase credentials not found. Serving with resilient in-memory storage.');
}

// In-memory fallback stores
const memoryUsers = new Map<string, any>();
const memoryCommunities = new Map<string, any>();
const memoryFriends = new Map<string, Map<string, any>>();
const memoryPaymentRequests = new Map<string, any>();
const memoryFriendRequests = new Map<string, any>();

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
  res.json({ status: 'ok', timestamp: Date.now(), firebase: hasFirebaseCredentials });
});

// ------------------- Users API -------------------
// Get a single user profile
app.get('/api/users/:address', async (req, res) => {
  try {
    const addressKey = req.params.address.toLowerCase().trim();
    if (hasFirebaseCredentials) {
      const doc = await db.collection('users').doc(addressKey).get();
      if (!doc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json(doc.data());
    } else {
      const user = memoryUsers.get(addressKey);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json(user);
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create or update a user profile (merge = true)
app.post('/api/users', async (req, res) => {
  try {
    let { address, nickname, avatarColor, email, linkedZkAddress, linkedWalletAddress } = req.body;
    if (!address && !email) return res.status(400).json({ error: 'Address or email required' });

    if (!address && email) {
      const hash = Buffer.from(email).toString('hex').padEnd(64, '0').slice(0, 64);
      address = '0x' + hash;
    }

    const normAddress = address.toLowerCase().trim();
    const finalEmail = email ? email.toLowerCase().trim() : '';

    const userData: any = {
      address: normAddress,
      nickname: nickname || (email ? email.split('@')[0] : 'Friend'),
      avatarColor: avatarColor || '#9F9DF3',
      email: finalEmail,
    };

    if (linkedZkAddress) {
      userData.linkedZkAddress = linkedZkAddress.toLowerCase().trim();
    }
    if (linkedWalletAddress) {
      userData.linkedWalletAddress = linkedWalletAddress.toLowerCase().trim();
    }

    if (hasFirebaseCredentials) {
      await db.collection('users').doc(normAddress).set(userData, { merge: true });
      if (linkedZkAddress && linkedZkAddress.toLowerCase().trim() !== normAddress) {
        const zkNorm = linkedZkAddress.toLowerCase().trim();
        await db.collection('users').doc(zkNorm).set({
          address: zkNorm,
          linkedWalletAddress: normAddress,
          nickname: userData.nickname,
          avatarColor: userData.avatarColor,
          email: finalEmail,
        }, { merge: true });
      }
    } else {
      const existing = memoryUsers.get(normAddress) || {};
      memoryUsers.set(normAddress, { ...existing, ...userData });
      if (linkedZkAddress && linkedZkAddress.toLowerCase().trim() !== normAddress) {
        const zkNorm = linkedZkAddress.toLowerCase().trim();
        const existingZk = memoryUsers.get(zkNorm) || {};
        memoryUsers.set(zkNorm, {
          ...existingZk,
          address: zkNorm,
          linkedWalletAddress: normAddress,
          nickname: userData.nickname,
          avatarColor: userData.avatarColor,
          email: finalEmail,
        });
      }
    }

    res.json({ success: true, ...userData });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to upsert user' });
  }
});

// Delete a user profile (remove friend)
app.delete('/api/users/:address', async (req, res) => {
  try {
    const address = req.params.address.toLowerCase().trim();
    if (hasFirebaseCredentials) {
      await db.collection('users').doc(address).delete();
    } else {
      memoryUsers.delete(address);
    }
    res.json({ success: true, address });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Search all users
app.get('/api/users', async (req, res) => {
  try {
    const q = (req.query.q as string || '').toLowerCase();
    let users: any[] = [];
    if (hasFirebaseCredentials) {
      const snapshot = await db.collection('users').get();
      users = snapshot.docs.map((d: any) => ({ ...d.data(), address: d.id }));
    } else {
      users = Array.from(memoryUsers.values());
    }

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
app.get('/api/communities', async (req, res) => {
  try {
    const owner = (req.query.owner as string || '').toLowerCase().trim();
    let communities: any[] = [];

    if (hasFirebaseCredentials) {
      try {
        const commSnap = await db.collection('communities').get();
        const allComms = await Promise.all(
          commSnap.docs.map(async (commDoc: any) => {
            const communityData = commDoc.data();
            const membersSnap = await db
              .collection('communities')
              .doc(commDoc.id)
              .collection('members')
              .get();
            const members = membersSnap.docs.map((mDoc: any) => mDoc.data());
            return { id: commDoc.id, ...communityData, members };
          })
        );

        if (owner) {
          communities = allComms.filter((c: any) =>
            (c.ownerAddress || '').toLowerCase() === owner ||
            (Array.isArray(c.memberAddresses) && c.memberAddresses.includes(owner)) ||
            (Array.isArray(c.members) && c.members.some((m: any) => (m.walletAddress || m.address || '').toLowerCase() === owner))
          );
        } else {
          communities = allComms;
        }
      } catch (fbErr) {
        console.warn('Firebase error fetching communities, falling back to memory:', fbErr);
        communities = Array.from(memoryCommunities.values());
        if (owner) {
          communities = communities.filter((c: any) =>
            (c.ownerAddress || '').toLowerCase() === owner ||
            (Array.isArray(c.memberAddresses) && c.memberAddresses.includes(owner)) ||
            (Array.isArray(c.members) && c.members.some((m: any) => (m.walletAddress || m.address || '').toLowerCase() === owner))
          );
        }
      }
    } else {
      communities = Array.from(memoryCommunities.values());
      if (owner) {
        communities = communities.filter((c: any) =>
          (c.ownerAddress || '').toLowerCase() === owner ||
          (Array.isArray(c.memberAddresses) && c.memberAddresses.includes(owner)) ||
          (Array.isArray(c.members) && c.members.some((m: any) => (m.walletAddress || m.address || '').toLowerCase() === owner))
        );
      }
    }

    res.json(communities);
  } catch (e) {
    console.error('Error fetching communities:', e);
    res.json(Array.from(memoryCommunities.values()));
  }
});

app.post('/api/communities', async (req, res) => {
  try {
    const { name, description, memberAddresses, ownerAddress } = req.body;
    const id = 'community_' + Date.now();
    const lastActivity = 'Just now';
    const owner = (ownerAddress || '').toLowerCase().trim();

    const members: any[] = [];
    for (const address of (memberAddresses || [])) {
      let userData: any = {};
      if (hasFirebaseCredentials) {
        const userDoc = await db.collection('users').doc(address).get();
        if (userDoc.exists) userData = userDoc.data();
      } else {
        userData = memoryUsers.get(address.toLowerCase().trim()) || {};
      }

      members.push({
        walletAddress: address,
        name: userData?.nickname || address.slice(0, 8) + '…',
        avatarColor: userData?.avatarColor || '#9F9DF3',
      });
    }

    const commData = {
      id,
      name,
      description: description || '',
      lastActivity,
      ownerAddress: owner,
      memberAddresses: members.map((m) => (m.walletAddress || '').toLowerCase()),
      members,
    };

    memoryCommunities.set(id, commData);

    if (hasFirebaseCredentials) {
      try {
        await db.collection('communities').doc(id).set({
          name,
          description: description || '',
          lastActivity,
          ownerAddress: owner,
          memberAddresses: members.map((m) => (m.walletAddress || '').toLowerCase()),
        });

        for (const m of members) {
          const docId = (m.walletAddress || `mem_${Math.random()}`).replace(/\//g, '_');
          await db.collection('communities').doc(id).collection('members').doc(docId).set(m);
        }
      } catch (fbErr) {
        console.warn('Firebase failed to save community, saved to memory fallback:', fbErr);
      }
    }

    res.json(commData);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create community' });
  }
});

// ------------------- Friends API -------------------
app.get('/api/users/:owner/friends', async (req, res) => {
  try {
    const owner = req.params.owner.toLowerCase().trim();
    const q = (req.query.q as string || '').toLowerCase();
    let friends: any[] = [];

    if (hasFirebaseCredentials) {
      const snap = await db.collection('users').doc(owner).collection('friends').get();
      friends = snap.docs.map((d: any) => ({ ...d.data(), address: d.id }));
    } else {
      const userFriendsMap = memoryFriends.get(owner);
      friends = userFriendsMap ? Array.from(userFriendsMap.values()) : [];
    }

    if (q) {
      friends = friends.filter((f: any) =>
        (f.nickname && f.nickname.toLowerCase().includes(q)) ||
        (f.address && f.address.toLowerCase().includes(q)) ||
        (f.email && f.email.toLowerCase().includes(q)) ||
        (f.suins && f.suins.toLowerCase().includes(q))
      );
    }
    res.json(friends);
  } catch (e) {
    console.error('Error fetching friends:', e);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

app.post('/api/users/:owner/friends', async (req, res) => {
  try {
    const owner = req.params.owner.toLowerCase().trim();
    let { address, nickname, avatarColor, email, suins } = req.body;
    if (!address && !email) return res.status(400).json({ error: 'address or email required' });
    if (!address && email) {
      const hash = Buffer.from(email).toString('hex').padEnd(64, '0').slice(0, 64);
      address = '0x' + hash;
    }
    address = address.toLowerCase().trim();
    const friendData = {
      address,
      nickname: nickname || (email ? email.split('@')[0] : (suins || 'Friend')),
      avatarColor: avatarColor || '#9F9DF3',
      email: email || '',
      suins: suins || '',
    };

    if (hasFirebaseCredentials) {
      await db.collection('users').doc(owner).collection('friends').doc(address).set(friendData, { merge: true });
    } else {
      let userFriendsMap = memoryFriends.get(owner);
      if (!userFriendsMap) {
        userFriendsMap = new Map();
        memoryFriends.set(owner, userFriendsMap);
      }
      userFriendsMap.set(address, friendData);
    }

    res.json({ success: true, ...friendData });
  } catch (e) {
    console.error('Error adding friend:', e);
    res.status(500).json({ error: 'Failed to add friend' });
  }
});

app.delete('/api/users/:owner/friends/:friendAddress', async (req, res) => {
  try {
    const owner = req.params.owner.toLowerCase().trim();
    const friendAddress = req.params.friendAddress.toLowerCase().trim();

    if (hasFirebaseCredentials) {
      await db.collection('users').doc(owner).collection('friends').doc(friendAddress).delete();
    } else {
      memoryFriends.get(owner)?.delete(friendAddress);
    }

    res.json({ success: true, friendAddress });
  } catch (e) {
    console.error('Error removing friend:', e);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// ------------------- Payment Requests API -------------------
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
      if (hasFirebaseCredentials) {
        await db.collection('payment_requests').doc(id).set(data);
      } else {
        memoryPaymentRequests.set(id, data);
      }
      created.push(data);
    }

    res.json({ success: true, count: created.length, requests: created });
  } catch (e) {
    console.error('Error creating payment requests:', e);
    res.status(500).json({ error: 'Failed to create payment requests' });
  }
});

app.get('/api/payment-requests', async (req, res) => {
  try {
    const address = (req.query.address as string || '').toLowerCase().trim();
    const all = hasFirebaseCredentials
      ? (await db.collection('payment_requests').get()).docs.map((d: any) => d.data())
      : Array.from(memoryPaymentRequests.values());

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

    if (hasFirebaseCredentials) {
      await db.collection('payment_requests').doc(id).set(updateData, { merge: true });
    } else {
      const existing = memoryPaymentRequests.get(id);
      if (existing) memoryPaymentRequests.set(id, { ...existing, ...updateData });
    }
    res.json({ success: true, id, ...updateData });
  } catch (e) {
    console.error('Error updating payment request:', e);
    res.status(500).json({ error: 'Failed to update payment request' });
  }
});

// ------------------- Friend Requests API -------------------
app.post('/api/friend-requests', async (req, res) => {
  try {
    const {
      senderAddress,
      senderName,
      senderAvatarColor,
      senderEmail,
      senderSuins,
      recipientAddress,
      recipientEmail,
      recipientName,
      recipientSuins,
    } = req.body;

    if (!senderAddress) {
      return res.status(400).json({ error: 'senderAddress is required' });
    }
    if (!recipientAddress && !recipientEmail) {
      return res.status(400).json({ error: 'recipientAddress or recipientEmail is required' });
    }

    const id = 'freq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    let finalRecipientAddress = (recipientAddress || '').toLowerCase().trim();
    let finalRecipientEmail = (recipientEmail || '').toLowerCase().trim();
    const finalSenderAddress = senderAddress.toLowerCase().trim();
    const finalSenderEmail = (senderEmail || '').toLowerCase().trim();

    if (!finalRecipientAddress && finalRecipientEmail) {
      try {
        if (hasFirebaseCredentials) {
          const usersSnap = await db.collection('users').where('email', '==', finalRecipientEmail).get();
          if (!usersSnap.empty) {
            finalRecipientAddress = usersSnap.docs[0].id.toLowerCase();
          }
        } else {
          for (const u of memoryUsers.values()) {
            if (u.email === finalRecipientEmail) {
              finalRecipientAddress = u.address;
              break;
            }
          }
        }
      } catch (e) {
        console.warn('Could not lookup recipient by email:', e);
      }
    }

    if (finalRecipientAddress && !finalRecipientEmail) {
      try {
        if (hasFirebaseCredentials) {
          const userDoc = await db.collection('users').doc(finalRecipientAddress).get();
          if (userDoc.exists && userDoc.data()?.email) {
            finalRecipientEmail = userDoc.data()!.email.toLowerCase().trim();
          }
        } else {
          const u = memoryUsers.get(finalRecipientAddress);
          if (u?.email) finalRecipientEmail = u.email;
        }
      } catch (e) {
        console.warn('Could not lookup recipient email by address:', e);
      }
    }

    if (finalRecipientAddress && finalRecipientAddress === finalSenderAddress) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }
    if (finalRecipientEmail && finalSenderEmail && finalRecipientEmail === finalSenderEmail) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    const data: any = {
      id,
      senderAddress: finalSenderAddress,
      senderName: senderName || 'Friend',
      senderAvatarColor: senderAvatarColor || '#9F9DF3',
      senderEmail: finalSenderEmail || '',
      senderSuins: senderSuins || '',
      recipientAddress: finalRecipientAddress || '',
      recipientEmail: finalRecipientEmail || '',
      recipientName: recipientName || 'Friend',
      recipientSuins: recipientSuins || '',
      status: 'pending',
      createdAt: Date.now(),
    };

    if (hasFirebaseCredentials) {
      await db.collection('friend_requests').doc(id).set(data);
    } else {
      memoryFriendRequests.set(id, data);
    }

    res.json({ success: true, request: data });
  } catch (e) {
    console.error('Error creating friend request:', e);
    res.status(500).json({ error: 'Failed to create friend request' });
  }
});

app.get('/api/friend-requests', async (req, res) => {
  try {
    const address = (req.query.address as string || '').toLowerCase().trim();
    const email = (req.query.email as string || '').toLowerCase().trim();

    const all: any[] = hasFirebaseCredentials
      ? (await db.collection('friend_requests').get()).docs.map((d: any) => d.data())
      : Array.from(memoryFriendRequests.values());

    if (!address && !email) {
      return res.json({ incoming: [], outgoing: [] });
    }

    const myAddresses = new Set<string>();
    const myEmails = new Set<string>();
    if (address) myAddresses.add(address);
    if (email) myEmails.add(email);

    if (address) {
      let u: any = null;
      if (hasFirebaseCredentials) {
        try {
          const userDoc = await db.collection('users').doc(address).get();
          if (userDoc.exists) u = userDoc.data();
        } catch (err) {
          console.warn('Could not fetch linked addresses for friend requests query:', err);
        }
      } else {
        u = memoryUsers.get(address);
      }
      if (u) {
        if (u.email) myEmails.add(u.email.toLowerCase().trim());
        if (u.linkedZkAddress) myAddresses.add(u.linkedZkAddress.toLowerCase().trim());
        if (u.linkedWalletAddress) myAddresses.add(u.linkedWalletAddress.toLowerCase().trim());
      }
    }

    const incoming = all
      .filter((r: any) => {
        const rAddr = r.recipientAddress?.toLowerCase();
        const rMail = r.recipientEmail?.toLowerCase();
        const isRecipient =
          (rAddr && myAddresses.has(rAddr)) ||
          (rMail && myEmails.has(rMail));
        const sAddr = r.senderAddress?.toLowerCase();
        const isSelf = sAddr && myAddresses.has(sAddr);
        return isRecipient && !isSelf && r.status !== 'canceled';
      })
      .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));

    const outgoing = all
      .filter((r: any) => {
        const sAddr = r.senderAddress?.toLowerCase();
        const sMail = r.senderEmail?.toLowerCase();
        const isSender =
          (sAddr && myAddresses.has(sAddr)) ||
          (sMail && myEmails.has(sMail));
        return isSender && r.status !== 'canceled';
      })
      .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));

    res.json({ incoming, outgoing });
  } catch (e) {
    console.error('Error fetching friend requests:', e);
    res.status(500).json({ error: 'Failed to fetch friend requests' });
  }
});

app.patch('/api/friend-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, recipientAddress, recipientName, recipientAvatarColor, recipientEmail } = req.body;
    if (!status) return res.status(400).json({ error: 'Status required' });

    let existing: any = null;
    if (hasFirebaseCredentials) {
      const doc = await db.collection('friend_requests').doc(id).get();
      if (doc.exists) existing = doc.data();
    } else {
      existing = memoryFriendRequests.get(id);
    }

    if (!existing) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    const updated = {
      ...existing,
      status,
      updatedAt: Date.now(),
      ...(recipientAddress ? { recipientAddress: recipientAddress.toLowerCase().trim() } : {}),
    };

    if (hasFirebaseCredentials) {
      await db.collection('friend_requests').doc(id).set(updated, { merge: true });
    } else {
      memoryFriendRequests.set(id, updated);
    }

    if (status === 'accepted') {
      const sAddr = (existing.senderAddress || '').toLowerCase().trim();
      const rAddr = (recipientAddress || existing.recipientAddress || '').toLowerCase().trim();

      if (sAddr && rAddr && sAddr !== rAddr) {
        const sFriendData = {
          address: sAddr,
          nickname: existing.senderName || 'Friend',
          avatarColor: existing.senderAvatarColor || '#9F9DF3',
          email: existing.senderEmail || '',
          suins: existing.senderSuins || '',
        };

        const rFriendData = {
          address: rAddr,
          nickname: recipientName || existing.recipientName || 'Friend',
          avatarColor: recipientAvatarColor || '#C9EBCA',
          email: recipientEmail || existing.recipientEmail || '',
          suins: existing.recipientSuins || '',
        };

        if (hasFirebaseCredentials) {
          await Promise.all([
            db.collection('users').doc(rAddr).collection('friends').doc(sAddr).set(sFriendData, { merge: true }),
            db.collection('users').doc(sAddr).collection('friends').doc(rAddr).set(rFriendData, { merge: true }),
          ]);
        } else {
          let sFriends = memoryFriends.get(rAddr);
          if (!sFriends) {
            sFriends = new Map();
            memoryFriends.set(rAddr, sFriends);
          }
          sFriends.set(sAddr, sFriendData);

          let rFriends = memoryFriends.get(sAddr);
          if (!rFriends) {
            rFriends = new Map();
            memoryFriends.set(sAddr, rFriends);
          }
          rFriends.set(rAddr, rFriendData);
        }
      }
    }

    res.json({ success: true, request: updated });
  } catch (e) {
    console.error('Error updating friend request:', e);
    res.status(500).json({ error: 'Failed to update friend request' });
  }
});

// ------------------- Server start -------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Firebase status: ${hasFirebaseCredentials ? 'Connected (Firestore)' : 'In-memory fallback mode'}`);
});
