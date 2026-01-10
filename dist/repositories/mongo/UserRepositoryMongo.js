"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepositoryMongo = void 0;
const mongo_js_1 = require("../../config/mongo.js");
class UserRepositoryMongo {
    async findByEmailOrUsername(email, username) {
        const col = await (0, mongo_js_1.getCollection)('users');
        return await col.find({ $or: [{ email }, { username }] }).toArray();
    }
    async findByEmail(email) {
        const col = await (0, mongo_js_1.getCollection)('users');
        return await col.find({ email }).toArray();
    }
    async findByDiscordId(discordId) {
        const col = await (0, mongo_js_1.getCollection)('users');
        return await col.find({ discord_id: discordId }).toArray();
    }
    async findIdByEmail(email) {
        const col = await (0, mongo_js_1.getCollection)('users');
        const doc = await col.findOne({ email }, { projection: { id: 1 } });
        return doc ? Number(doc.id) : null;
    }
    async createUser(username, email, passwordHash, role, avatarUrl) {
        const col = await (0, mongo_js_1.getCollection)('users');
        const id = await (0, mongo_js_1.nextId)('users');
        await col.insertOne({ id, username, email, password_hash: passwordHash, role, avatar_url: avatarUrl || '' });
        return id;
    }
    async updateAvatar(userId, avatarUrl) {
        const col = await (0, mongo_js_1.getCollection)('users');
        await col.updateOne({ id: userId }, { $set: { avatar_url: avatarUrl } }, { upsert: false });
    }
    async getScoreSummary(userId) {
        const answers = await (0, mongo_js_1.getCollection)('answers');
        const agg = await answers.aggregate([
            { $match: { user_id: userId } },
            {
                $group: {
                    _id: null,
                    total_score: { $sum: { $ifNull: ['$score', 0] } },
                    correct: { $sum: { $ifNull: ['$is_correct', 0] } },
                    answered: { $sum: 1 }
                }
            }
        ]).toArray();
        const r = agg[0] || { total_score: 0, correct: 0, answered: 0 };
        return { total_score: Number(r.total_score) || 0, correct: Number(r.correct) || 0, answered: Number(r.answered) || 0 };
    }
    async getRecentPlayed(userId) {
        const answers = await (0, mongo_js_1.getCollection)('answers');
        const rooms = await (0, mongo_js_1.getCollection)('rooms');
        const agg = await answers.aggregate([
            { $match: { user_id: userId } },
            {
                $group: {
                    _id: '$room_id',
                    last_played: { $max: '$created_at' },
                    answered: { $sum: 1 },
                    total_score: { $sum: { $ifNull: ['$score', 0] } }
                }
            },
            { $sort: { last_played: -1 } },
            { $limit: 10 }
        ]).toArray();
        const result = [];
        for (const row of agg) {
            const rid = Number(row._id);
            const r = await rooms.findOne({ id: rid }, { projection: { id: 1, title: 1, room_code: 1 } });
            if (r) {
                result.push({
                    id: Number(r.id),
                    title: r.title,
                    room_code: r.room_code,
                    last_played: row.last_played,
                    answered: Number(row.answered) || 0,
                    total_score: Number(row.total_score) || 0
                });
            }
        }
        return result;
    }
    async linkDiscord(userId, discordId, avatarUrl, username) {
        const col = await (0, mongo_js_1.getCollection)('users');
        await col.updateOne({ id: userId }, { $set: { discord_id: discordId, avatar_url: avatarUrl, username } });
    }
    async createDiscordUser(username, email, avatarUrl) {
        const col = await (0, mongo_js_1.getCollection)('users');
        const id = await (0, mongo_js_1.nextId)('users');
        await col.insertOne({ id, username, email, password_hash: '', role: 'participant', discord_id: '', avatar_url: avatarUrl });
        return id;
    }
}
exports.UserRepositoryMongo = UserRepositoryMongo;
