"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.getCollection = getCollection;
exports.nextId = nextId;
const mongodb_1 = require("mongodb");
let client = null;
let db = null;
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGO_DB_NAME || (process.env.DB_NAME || 'ritualquiz_db');
async function getDb() {
    if (!client) {
        client = new mongodb_1.MongoClient(uri);
    }
    if (!db) {
        await client.connect();
        db = client.db(dbName);
    }
    return db;
}
async function getCollection(name) {
    const database = await getDb();
    return database.collection(name);
}
async function nextId(seqName) {
    const database = await getDb();
    const counters = database.collection('counters');
    await counters.updateOne({ _id: seqName }, { $inc: { seq: 1 } }, { upsert: true });
    const doc = await counters.findOne({ _id: seqName });
    return doc?.seq ?? 1;
}
//# sourceMappingURL=mongo.js.map