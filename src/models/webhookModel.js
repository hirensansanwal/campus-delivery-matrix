import { getMongoDb } from '../config/mongodb.js';

const collection = () => getMongoDb().collection('carrier_webhooks');

const webhookModel = {
  async insert({ carrier, rawPayload, processed = false }) {
    const doc = { carrier, rawPayload, receivedAt: new Date(), processed };
    const { insertedId } = await collection().insertOne(doc);
    return { _id: insertedId, ...doc };
  },

  // $match (optional carrier) -> $sort newest first -> $limit
  list({ carrier, limit = 50 } = {}) {
    const pipeline = [];
    if (carrier) pipeline.push({ $match: { carrier } });
    pipeline.push({ $sort: { receivedAt: -1 } }, { $limit: limit });
    return collection().aggregate(pipeline).toArray();
  },
};

export default webhookModel;
