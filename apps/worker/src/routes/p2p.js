// Sendora Direct - P2P WebRTC Signaling API
// Enables 100% offline-ready local Wi-Fi / P2P direct transfers (Unlimited File Size, Zero Cloud Storage)
// 100% JavaScript ES Module

import { Hono } from 'hono';
import { z } from 'zod';
import { generateShortCode } from '../services/crypto.js';

const app = new Hono();

// Ephemeral in-memory store for active room handshakes (Max TTL 10 minutes)
const activeRooms = new Map();

function cleanExpiredRooms() {
  const now = Date.now();
  for (const [id, room] of activeRooms.entries()) {
    if (now - room.createdAt > 10 * 60 * 1000) {
      activeRooms.delete(id);
    }
  }
}

const createRoomSchema = z.object({
  filename: z.string().min(1).max(255),
  fileSize: z.number().int().min(1),
  fileType: z.string().optional().default('application/octet-stream'),
  offer: z.object({
    type: z.literal('offer'),
    sdp: z.string()
  }),
  senderId: z.string().optional()
});

// Helper to get room from memory or KV
async function getRoom(c, roomId) {
  cleanExpiredRooms();
  const normalizedId = roomId.toUpperCase().trim();
  
  if (activeRooms.has(normalizedId)) {
    return activeRooms.get(normalizedId);
  }

  // Fallback to KV if available
  if (c.env.SENDORA_STORAGE) {
    try {
      const kvData = await c.env.SENDORA_STORAGE.get(`p2p_room:${normalizedId}`, { type: 'json' });
      if (kvData) {
        activeRooms.set(normalizedId, kvData);
        return kvData;
      }
    } catch (e) {
      // ignore
    }
  }

  return null;
}

// Helper to save room to memory and KV
async function saveRoom(c, room) {
  activeRooms.set(room.id, room);
  if (c.env.SENDORA_STORAGE) {
    try {
      await c.env.SENDORA_STORAGE.put(`p2p_room:${room.id}`, JSON.stringify(room), {
        expirationTtl: 600 // 10 minutes
      });
    } catch (e) {
      // ignore
    }
  }
}

// POST /api/p2p/room - Create new P2P transfer room and register SDP Offer
app.post('/room', async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ error: 'Invalid JSON payload' }, 400);
  }

  const parsed = createRoomSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid room creation payload', details: parsed.error.format() }, 400);
  }

  const { filename, fileSize, fileType, offer, senderId } = parsed.data;
  const roomId = `D-${generateShortCode(6)}`;

  const room = {
    id: roomId,
    filename,
    fileSize,
    fileType,
    offer,
    answer: null,
    senderId: senderId || `sender-${Date.now()}`,
    receiverId: null,
    senderCandidates: [],
    receiverCandidates: [],
    status: 'waiting', // 'waiting' | 'connecting' | 'transferring' | 'completed' | 'cancelled'
    createdAt: Date.now()
  };

  await saveRoom(c, room);

  return c.json({
    success: true,
    roomId,
    expiresIn: 600
  });
});

// GET /api/p2p/room/:roomId - Receiver fetches room metadata & SDP Offer
app.get('/room/:roomId', async (c) => {
  const roomId = c.req.param('roomId');
  const room = await getRoom(c, roomId);

  if (!room) {
    return c.json({ error: 'Direct transfer room not found or expired' }, 404);
  }

  return c.json({
    roomId: room.id,
    filename: room.filename,
    fileSize: room.fileSize,
    fileType: room.fileType,
    offer: room.offer,
    status: room.status,
    senderCandidates: room.senderCandidates
  });
});

// POST /api/p2p/room/:roomId/answer - Receiver registers SDP Answer
app.post('/room/:roomId/answer', async (c) => {
  const roomId = c.req.param('roomId');
  const room = await getRoom(c, roomId);

  if (!room) {
    return c.json({ error: 'Room not found or expired' }, 404);
  }

  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  if (!body.answer || body.answer.type !== 'answer' || !body.answer.sdp) {
    return c.json({ error: 'Valid WebRTC SDP Answer required' }, 400);
  }

  room.answer = body.answer;
  room.receiverId = body.receiverId || `receiver-${Date.now()}`;
  room.status = 'connecting';

  await saveRoom(c, room);

  return c.json({ success: true, status: room.status });
});

// POST /api/p2p/room/:roomId/candidate - Add ICE candidate
app.post('/room/:roomId/candidate', async (c) => {
  const roomId = c.req.param('roomId');
  const room = await getRoom(c, roomId);

  if (!room) {
    return c.json({ error: 'Room not found or expired' }, 404);
  }

  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const { role, candidate } = body;
  if (!candidate || !['sender', 'receiver'].includes(role)) {
    return c.json({ error: 'Invalid candidate payload' }, 400);
  }

  if (role === 'sender') {
    room.senderCandidates.push(candidate);
  } else {
    room.receiverCandidates.push(candidate);
  }

  await saveRoom(c, room);

  return c.json({ success: true });
});

// GET /api/p2p/room/:roomId/poll - Lightweight polling for signaling sync
app.get('/room/:roomId/poll', async (c) => {
  const roomId = c.req.param('roomId');
  const role = c.req.query('role') || 'sender';
  const room = await getRoom(c, roomId);

  if (!room) {
    return c.json({ error: 'Room expired or closed', closed: true }, 404);
  }

  if (role === 'sender') {
    return c.json({
      status: room.status,
      answer: room.answer,
      candidates: room.receiverCandidates
    });
  } else {
    return c.json({
      status: room.status,
      candidates: room.senderCandidates
    });
  }
});

// POST /api/p2p/room/:roomId/status - Update transfer state
app.post('/room/:roomId/status', async (c) => {
  const roomId = c.req.param('roomId');
  const room = await getRoom(c, roomId);

  if (!room) {
    return c.json({ error: 'Room not found' }, 404);
  }

  let body = {};
  try {
    body = await c.req.json();
  } catch (e) {}

  if (body.status) {
    room.status = body.status;
    await saveRoom(c, room);
  }

  return c.json({ success: true, status: room.status });
});

// DELETE /api/p2p/room/:roomId - Teardown room
app.delete('/room/:roomId', async (c) => {
  const roomId = c.req.param('roomId').toUpperCase().trim();
  activeRooms.delete(roomId);
  if (c.env.SENDORA_STORAGE) {
    try {
      await c.env.SENDORA_STORAGE.delete(`p2p_room:${roomId}`);
    } catch (e) {}
  }
  return c.json({ success: true });
});

export default app;
