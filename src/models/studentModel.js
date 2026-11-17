import prisma from '../config/prisma.js';

const studentModel = {
  findByEnrollmentNo(enrollmentNo) {
    return prisma.student.findUnique({ where: { enrollmentNo } });
  },

  // Autocomplete by enrollment number or name.
  search(query, limit = 10) {
    return prisma.student.findMany({
      where: {
        OR: [
          { enrollmentNo: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { enrollmentNo: 'asc' },
      take: limit,
    });
  },
};

export default studentModel;
