import bcrypt from 'bcryptjs';
import userModel from '../models/userModel.js';
import studentModel from '../models/studentModel.js';
import parcelModel from '../models/parcelModel.js';
import webhookModel from '../models/webhookModel.js';
import chatLogModel from '../models/chatLogModel.js';
import { presentUser, presentUserList } from '../views/userView.js';
import { presentParcelList } from '../views/parcelView.js';
import { presentStats, presentMongoDoc, presentMongoDocList } from '../views/adminView.js';
import { sendSuccess } from '../views/responseView.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

const parseLimit = (value, fallback = 50) => {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 1) return fallback;
  return Math.min(n, 200);
};

// ---------- Stats & guard management (PostgreSQL) ----------

// GET /admin/stats
export const getHubStats = asyncHandler(async (req, res) => {
  const stats = await parcelModel.getTodayStats();
  sendSuccess(res, presentStats(stats));
});

// POST /admin/guards  { name, email, password }
export const createGuard = asyncHandler(async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!name || !email || !password) throw ApiError.badRequest('name, email and password are required');
  if (password.length < 8) throw ApiError.badRequest('password must be at least 8 characters');

  if (await userModel.findByEmail(email)) throw ApiError.conflict('A user with that email already exists');

  const passwordHash = await bcrypt.hash(password, 10);
  const guard = await userModel.create({ name, email, passwordHash, role: 'GUARD' });

  sendSuccess(res, presentUser(guard), { status: 201, message: 'Guard account created' });
});

// GET /admin/guards
export const listGuards = asyncHandler(async (req, res) => {
  const guards = await userModel.listByRole('GUARD');
  sendSuccess(res, presentUserList(guards));
});

// ---------- Beta showcase suite ----------

// POST /admin/mock/webhook  { carrier, rawPayload }  -> MongoDB carrier_webhooks
export const simulateWebhook = asyncHandler(async (req, res) => {
  const carrier = String(req.body?.carrier || '').trim();
  const rawPayload = req.body?.rawPayload;

  if (!carrier) throw ApiError.badRequest('carrier is required');
  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    throw ApiError.badRequest('rawPayload must be a JSON object');
  }

  const doc = await webhookModel.insert({ carrier, rawPayload });
  sendSuccess(res, presentMongoDoc(doc), { status: 201, message: 'Webhook stored in MongoDB' });
});

// POST /admin/mock/chat  { message, driverPhone?, sessionId?, messages? }  -> MongoDB navigation_chat_logs
export const simulateNavigationChat = asyncHandler(async (req, res) => {
  const now = () => new Date();
  let messages = req.body?.messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    const text = String(req.body?.message || '').trim();
    if (!text) throw ApiError.badRequest('Provide either "message" or a non-empty "messages" array');
    messages = [
      { sender: 'driver', text, time: now() },
      { sender: 'bot', text: 'Please proceed to Gate 1 Main Security Office.', time: now() },
    ];
  }

  const doc = await chatLogModel.insert({
    sessionId: req.body?.sessionId || `chat_session_${Date.now()}`,
    driverPhone: req.body?.driverPhone || null,
    messages,
  });

  sendSuccess(res, presentMongoDoc(doc), { status: 201, message: 'Chat log stored in MongoDB' });
});

// POST /admin/mock/seed -> 5 sample active parcels
export const seedDemoParcels = asyncHandler(async (req, res) => {
  const students = await studentModel.listFirst(5);
  if (students.length === 0) {
    throw ApiError.conflict('No students found. Run "npm run prisma:seed" first.');
  }

  const carriers = ['Amazon', 'Flipkart', 'Delhivery', 'Bluedart', 'Myntra'];
  const created = [];

  // Sequential on purpose: each parcel gets the next tag.
  for (let i = 0; i < 5; i++) {
    const parcel = await parcelModel.createWithTag({
      student: students[i % students.length],
      carrier: carriers[i],
      trackingNumber: `DEMO${Date.now()}${i}`,
      notes: 'Demo seed',
      loggedById: req.user.id,
    });
    created.push(parcel);
  }

  sendSuccess(res, presentParcelList(created), { status: 201, message: '5 demo parcels created' });
});

// GET /admin/webhooks?carrier=&limit=
export const getWebhooks = asyncHandler(async (req, res) => {
  const docs = await webhookModel.list({
    carrier: req.query.carrier ? String(req.query.carrier) : undefined,
    limit: parseLimit(req.query.limit),
  });
  sendSuccess(res, { count: docs.length, webhooks: presentMongoDocList(docs) });
});

// GET /admin/chat-logs?sessionId=&limit=
export const getChatLogs = asyncHandler(async (req, res) => {
  const docs = await chatLogModel.list({
    sessionId: req.query.sessionId ? String(req.query.sessionId) : undefined,
    limit: parseLimit(req.query.limit),
  });
  sendSuccess(res, { count: docs.length, chatLogs: presentMongoDocList(docs) });
});
