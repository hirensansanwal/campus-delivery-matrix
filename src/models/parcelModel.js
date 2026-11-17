import prisma from '../config/prisma.js';
import { generateNextTag } from '../utils/tagGenerator.js';

const withStudent = { student: { select: { name: true, hostel: true, room: true } } };

const parcelModel = {
  // Assign the next daily tag and create the parcel.
  async createWithTag({ student, carrier, trackingNumber, notes, loggedById }) {
    const lookupNumber = await generateNextTag(prisma);
    return prisma.parcel.create({
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

  markPickedUp(id) {
    return prisma.parcel.update({
      where: { id },
      data: { status: 'PICKED_UP', pickedUpAt: new Date() },
      include: withStudent,
    });
  },
};

export default parcelModel;
