import prisma from '../config/prisma.js';

const userModel = {
  findByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id) {
    return prisma.user.findUnique({ where: { id } });
  },

  create({ name, email, passwordHash, role = 'GUARD' }) {
    return prisma.user.create({ data: { name, email, passwordHash, role } });
  },

  listByRole(role) {
    return prisma.user.findMany({ where: { role }, orderBy: { createdAt: 'desc' } });
  },
};

export default userModel;
