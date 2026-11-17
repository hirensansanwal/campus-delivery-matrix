import { presentStudent } from './studentView.js';

export const presentParcel = (parcel) => ({
  id: parcel.id,
  lookupNumber: parcel.lookupNumber,
  carrier: parcel.carrier,
  trackingNumber: parcel.trackingNumber,
  status: parcel.status,
  notes: parcel.notes,
  studentEnrollmentNo: parcel.studentEnrollmentNo,
  student: parcel.student
    ? { name: parcel.student.name, hostel: parcel.student.hostel, room: parcel.student.room }
    : undefined,
  pickedUpAt: parcel.pickedUpAt,
  createdAt: parcel.createdAt,
});

export const presentParcelList = (parcels) => parcels.map(presentParcel);

// What the guard sees when a student arrives: the tags to look for on the shelf.
export const presentStudentSearch = (student, parcels) => ({
  student: presentStudent(student),
  pendingCount: parcels.length,
  lookupNumbers: parcels.map((p) => p.lookupNumber),
  parcels: presentParcelList(parcels),
});
