import bcrypt from 'bcryptjs';
import userModel from '../models/userModel.js';
import parcelModel from '../models/parcelModel.js';
import { presentUser, presentUserList } from '../views/userView.js';
import { presentStats } from '../views/adminView.js';
import { sendSuccess } from '../views/responseView.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

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
