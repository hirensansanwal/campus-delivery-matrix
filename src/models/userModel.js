import prisma from '../config/prisma.js';

const userModel = {
  findByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id) {
    return prisma.user.findUnique({ where: { id } });
  },
};

export default userModel;
