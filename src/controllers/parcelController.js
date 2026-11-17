import studentModel from '../models/studentModel.js';
import parcelModel from '../models/parcelModel.js';
import { presentParcel, presentParcelList, presentStudentSearch } from '../views/parcelView.js';
import { sendSuccess } from '../views/responseView.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

const normaliseEnrollmentNo = (value) => String(value || '').trim().toUpperCase();

// POST /parcels  { studentEnrollmentNo, carrier, trackingNumber?, notes? }
export const logParcel = asyncHandler(async (req, res) => {
  const enrollmentNo = normaliseEnrollmentNo(req.body?.studentEnrollmentNo);
  const carrier = String(req.body?.carrier || '').trim();
  const trackingNumber = req.body?.trackingNumber ? String(req.body.trackingNumber).trim() : null;
  const notes = req.body?.notes ? String(req.body.notes).trim() : null;

  if (!enrollmentNo || !carrier) {
    throw ApiError.badRequest('studentEnrollmentNo and carrier are required');
  }

  const student = await studentModel.findByEnrollmentNo(enrollmentNo);
  if (!student) throw ApiError.notFound(`No student found with enrollment number ${enrollmentNo}`);

  const parcel = await parcelModel.createWithTag({
    student,
    carrier,
    trackingNumber,
    notes,
    loggedById: req.user.id,
  });

  sendSuccess(res, presentParcel(parcel), {
    status: 201,
    message: `Parcel logged. Write "${parcel.lookupNumber}" on the box.`,
  });
});

// GET /parcels/search?enrollmentNo=RU2025CS001
export const searchStudentParcels = asyncHandler(async (req, res) => {
  const enrollmentNo = normaliseEnrollmentNo(req.query.enrollmentNo);
  if (!enrollmentNo) throw ApiError.badRequest('Query parameter "enrollmentNo" is required');

  const student = await studentModel.findByEnrollmentNo(enrollmentNo);
  if (!student) throw ApiError.notFound(`No student found with enrollment number ${enrollmentNo}`);

  const parcels = await parcelModel.findPendingByEnrollmentNo(enrollmentNo);
  sendSuccess(res, presentStudentSearch(student, parcels));
});

// GET /parcels/inventory
export const getActiveInventory = asyncHandler(async (req, res) => {
  const parcels = await parcelModel.findActiveInventory();
  sendSuccess(res, { count: parcels.length, parcels: presentParcelList(parcels) });
});

// PATCH /parcels/:id/pickup
export const markPickedUp = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await parcelModel.findById(id);
  if (!existing) throw ApiError.notFound('Parcel not found');

  const updated = await parcelModel.markPickedUp(id);

  sendSuccess(res, presentParcel(updated), { message: `Parcel ${updated.lookupNumber} marked as picked up` });
});
