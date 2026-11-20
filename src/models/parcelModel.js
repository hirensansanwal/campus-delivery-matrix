import prisma from '../config/prisma.js';
import { generateNextTag, startOfToday } from '../utils/tagGenerator.js';

const MAX_TAG_RETRIES = 3;
const withStudent = { student: { select: { name: true, hostel: true, room: true } } };

const parcelModel = {
  // Assign the next daily tag and create the parcel in ONE serializable
  // transaction. If two guards log at the same instant, Postgres aborts one
  // (Prisma code P2034) and we retry it, so tags never collide.
  async createWithTag({ student, carrier, trackingNumber, notes, loggedById }) {
    for (let attempt = 1; attempt <= MAX_TAG_RETRIES; attempt++) {
      try {
        return await prisma.$transaction(
          async (tx) => {
            const lookupNumber = await generateNextTag(tx);
            return tx.parcel.create({
              data: {
                lookupNumber,
                carrier,
                trackingNumber: trackingNumber || null,
                notes: notes || null,
                studentId: student.id,
                studentEnrollmentNo: student.enrollmentNo,
                loggedById,
              },
              include: withStudent,
            });
          },
          { isolationLevel: 'Serializable' }
        );
      } catch (err) {
        if (err.code === 'P2034' && attempt < MAX_TAG_RETRIES) continue;
        throw err;
      }
    }
  },

  findById(id) {
    return prisma.parcel.findUnique({ where: { id }, include: withStudent });
  },

  findPendingByEnrollmentNo(enrollmentNo) {
    return prisma.parcel.findMany({
      where: { studentEnrollmentNo: enrollmentNo, status: 'RECEIVED' },
      orderBy: { createdAt: 'asc' },
      include: withStudent,
    });
  },

  findActiveInventory() {
    return prisma.parcel.findMany({
      where: { status: 'RECEIVED' },
      orderBy: { createdAt: 'asc' },
      include: withStudent,
    });
  },

  // Guarded update: only flips RECEIVED -> PICKED_UP. Returns null if the
  // parcel was already collected (prevents double handover).
  async markPickedUp(id) {
    const result = await prisma.parcel.updateMany({
      where: { id, status: 'RECEIVED' },
      data: { status: 'PICKED_UP', pickedUpAt: new Date() },
    });
    if (result.count === 0) return null;
    return prisma.parcel.findUnique({ where: { id }, include: withStudent });
  },

  async getTodayStats() {
    const since = startOfToday();
    const [receivedToday, pickedUpToday, activeInventory] = await Promise.all([
      prisma.parcel.count({ where: { createdAt: { gte: since } } }),
      prisma.parcel.count({ where: { status: 'PICKED_UP', pickedUpAt: { gte: since } } }),
      prisma.parcel.count({ where: { status: 'RECEIVED' } }),
    ]);
    return { receivedToday, pickedUpToday, activeInventory };
  },
};

export default parcelModel;
