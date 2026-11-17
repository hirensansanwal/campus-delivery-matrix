// Daily sequential lookup tags: P-101, P-102, ...
// The sequence restarts every calendar day.

const TAG_PREFIX = 'P';
const FIRST_TAG_NUMBER = 101;

export const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const formatTag = (number) => `${TAG_PREFIX}-${number}`;

export const generateNextTag = async (client) => {
  const parcelsToday = await client.parcel.count({
    where: { createdAt: { gte: startOfToday() } },
  });
  return formatTag(FIRST_TAG_NUMBER + parcelsToday);
};
