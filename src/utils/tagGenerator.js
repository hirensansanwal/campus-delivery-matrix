// Daily sequential lookup tags: P-101, P-102, ...
// The sequence restarts every calendar day.
//
// generateNextTag MUST be called with a transaction client (`tx`) inside
// prisma.$transaction so that reading the day's count and inserting the new
// parcel happen atomically (see parcelModel.createWithTag).

const TAG_PREFIX = 'P';
const FIRST_TAG_NUMBER = 101;

export const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const formatTag = (number) => `${TAG_PREFIX}-${number}`;

export const generateNextTag = async (tx) => {
  const parcelsToday = await tx.parcel.count({
    where: { createdAt: { gte: startOfToday() } },
  });
  return formatTag(FIRST_TAG_NUMBER + parcelsToday);
};
