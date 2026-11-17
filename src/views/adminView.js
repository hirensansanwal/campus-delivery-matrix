export const presentStats = (stats) => ({
  receivedToday: stats.receivedToday,
  pickedUpToday: stats.pickedUpToday,
  activeInventory: stats.activeInventory,
  generatedAt: new Date(),
});

// Mongo documents are already plain JSON; kept here so the controller stays
// view-agnostic and the response shape has a single place to change.
export const presentMongoDoc = (doc) => doc;
export const presentMongoDocList = (docs) => docs.map(presentMongoDoc);
