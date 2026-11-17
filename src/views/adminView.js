export const presentStats = (stats) => ({
  receivedToday: stats.receivedToday,
  pickedUpToday: stats.pickedUpToday,
  activeInventory: stats.activeInventory,
  generatedAt: new Date(),
});
