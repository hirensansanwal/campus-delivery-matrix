// Never expose passwordHash.
export const presentUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

export const presentUserList = (users) => users.map(presentUser);
