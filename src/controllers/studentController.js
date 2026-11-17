import studentModel from '../models/studentModel.js';
import { presentStudentList } from '../views/studentView.js';
import { sendSuccess } from '../views/responseView.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

// GET /students/search?q=RU2025  (enrollment number or name fragment)
export const searchStudents = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) throw ApiError.badRequest('Query "q" must be at least 2 characters');

  const students = await studentModel.search(q);
  sendSuccess(res, presentStudentList(students));
});
