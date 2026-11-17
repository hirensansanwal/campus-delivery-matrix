export const presentStudent = (student) => ({
  id: student.id,
  enrollmentNo: student.enrollmentNo,
  name: student.name,
  hostel: student.hostel,
  room: student.room,
  phone: student.phone,
  email: student.email,
});

export const presentStudentList = (students) => students.map(presentStudent);
