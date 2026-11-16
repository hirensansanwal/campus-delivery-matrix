import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import userModel from '../models/userModel.js';
import { presentUser } from '../views/userView.js';
import { sendSuccess } from '../views/responseView.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const login = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) throw ApiError.badRequest('email and password are required');

  const user = await userModel.findByEmail(email);
  const valid = user && (await bcrypt.compare(password, user.passwordHash));
  if (!valid) throw ApiError.unauthorized('Invalid email or password');

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

  sendSuccess(res, { token, user: presentUser(user) }, { message: 'Login successful' });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.user.id);
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  sendSuccess(res, presentUser(user));
});
