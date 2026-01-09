import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { VoyageAIClient } from 'voyageai';

const client = new MongoClient(process.env.MONGODB_URI);
const vo = new VoyageAIClient({ apiKey: process.env.VOYAGEAI_API_KEY });

const BATCH_SIZE = 20; // safe for Voyage free tier
const SLEEP_MS = 22_000; // stay under 3 RPM

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function embedAndStore(texts, ids, collection) {
  const res = await vo.embed({
    model: 'voyage-3-large',
    input: texts,
    input_type: 'document'
  });

  const ops = res.data.map((row, i) => ({
    updateOne: {
      filter: { _id: ids[i] },
      update: { $set: { plot_embedding_user: row.embedding } }
    }
  }));

  await collection.bulkWrite(ops);
}

async function run() {
  await client.connect();
  const db = client.db(process.env.DATABASE_NAME);
  const collection = db.collection(process.env.COLLECTION_NAME);

  let lastId = null;
  let total = 0;

  while (true) {
    const query = {
      plot: { $exists: true },
      plot_embedding_user: { $exists: false },
      ...(lastId && { _id: { $gt: lastId } })
    };

    const docs = await collection
      .find(query)
      .sort({ _id: 1 })
      .limit(BATCH_SIZE)
      .toArray();

    if (docs.length === 0) break;

    const texts = [];
    const ids = [];

    for (const doc of docs) {
      if (!doc.plot || doc.plot.length < 10) continue;
      texts.push(doc.plot);
      ids.push(doc._id);
      lastId = doc._id;
    }

    if (texts.length > 0) {
      await embedAndStore(texts, ids, collection);
      total += texts.length;
      console.log(`Embedded ${total} movies`);
      await sleep(SLEEP_MS);
    }
  }

  console.log(`Done. Embedded ${total} movies.`);
  await client.close();
}

run().catch(console.error);