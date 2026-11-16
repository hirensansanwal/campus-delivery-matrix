import prisma from '../config/prisma.js';

const studentModel = {
  findByEnrollmentNo(enrollmentNo) {
    return prisma.student.findUnique({ where: { enrollmentNo } });
  },
};

export default studentModel;
