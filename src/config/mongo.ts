import { MongoClient, Db, Collection } from 'mongodb';
import type { Document } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGO_DB_NAME || (process.env.DB_NAME || 'ritualquiz_db');

export async function getDb(): Promise<Db> {
  if (!client) {
    client = new MongoClient(uri);
  }
  if (!db) {
    await client.connect();
    db = client.db(dbName);
  }
  return db;
}

export async function getCollection<T extends Document>(name: string): Promise<Collection<T>> {
  const database = await getDb();
  return database.collection<T>(name);
}

export async function nextId(seqName: string): Promise<number> {
  const database = await getDb();
  const counters = database.collection<{ _id: string; seq: number }>('counters');
  await counters.updateOne(
    { _id: seqName },
    { $inc: { seq: 1 } },
    { upsert: true }
  );
  const doc = await counters.findOne({ _id: seqName });
  return doc?.seq ?? 1;
}
