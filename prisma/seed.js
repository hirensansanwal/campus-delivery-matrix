import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const users = [
  { name: 'Campus Admin', email: 'admin@campus.edu', password: 'Admin@123', role: 'ADMIN' },
  { name: 'Guard One', email: 'guard1@campus.edu', password: 'Guard@123', role: 'GUARD' },
  { name: 'Guard Two', email: 'guard2@campus.edu', password: 'Guard@123', role: 'GUARD' },
];

const students = [
  ['RU2025CS001', 'Aarav Sharma', 'Aravali Hostel', 'A-101'],
  ['RU2025CS002', 'Ananya Verma', 'Aravali Hostel', 'A-102'],
  ['RU2025CS003', 'Rohan Gupta', 'Aravali Hostel', 'A-203'],
  ['RU2025CS004', 'Priya Singh', 'Shivalik Hostel', 'S-105'],
  ['RU2025CS005', 'Kabir Malhotra', 'Shivalik Hostel', 'S-210'],
  ['RU2025CS006', 'Isha Kapoor', 'Shivalik Hostel', 'S-211'],
  ['RU2025CS007', 'Vihaan Mehta', 'Aravali Hostel', 'A-305'],
  ['RU2025CS008', 'Diya Reddy', 'Shivalik Hostel', 'S-312'],
  ['RU2025CS009', 'Arjun Nair', 'Aravali Hostel', 'A-110'],
  ['RU2025CS010', 'Meera Joshi', 'Shivalik Hostel', 'S-118'],
];

const main = async () => {
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, passwordHash },
      create: { name: u.name, email: u.email, role: u.role, passwordHash },
    });
  }

  for (const [enrollmentNo, name, hostel, room] of students) {
    await prisma.student.upsert({
      where: { enrollmentNo },
      update: { name, hostel, room },
      create: {
        enrollmentNo,
        name,
        hostel,
        room,
        email: `${enrollmentNo.toLowerCase()}@campus.edu`,
      },
    });
  }

  console.log(`Seeded ${users.length} users and ${students.length} students.`);
};

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
