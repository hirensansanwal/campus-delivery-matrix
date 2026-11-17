import { getMongoDb } from '../config/mongodb.js';

const collection = () => getMongoDb().collection('navigation_chat_logs');

const chatLogModel = {
  async insert({ sessionId, driverPhone, messages }) {
    const doc = { sessionId, driverPhone, messages, createdAt: new Date() };
    const { insertedId } = await collection().insertOne(doc);
    return { _id: insertedId, ...doc };
  },

  // $match (optional session) -> $sort newest first -> $limit
  list({ sessionId, limit = 50 } = {}) {
    const pipeline = [];
    if (sessionId) pipeline.push({ $match: { sessionId } });
    pipeline.push({ $sort: { createdAt: -1 } }, { $limit: limit });
    return collection().aggregate(pipeline).toArray();
  },
};

export default chatLogModel;
