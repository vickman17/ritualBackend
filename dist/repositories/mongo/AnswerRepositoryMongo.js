"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnswerRepositoryMongo = void 0;
const mongo_js_1 = require("../../config/mongo.js");
class AnswerRepositoryMongo {
    async getCorrectAnswerIndex(questionId, roomId) {
        const q = await (await (0, mongo_js_1.getCollection)('questions')).findOne({ id: questionId, room_id: roomId }, { projection: { correct_answer_index: 1 } });
        return q ? Number(q.correct_answer_index) : null;
    }
    async getRoomTiming(roomId) {
        const r = await (await (0, mongo_js_1.getCollection)('rooms')).findOne({ id: roomId }, { projection: { time_per_question: 1, start_time: 1, is_public: 1 } });
        if (!r)
            return null;
        return { time_per_question: Number(r.time_per_question) || 30, start_time: r.start_time, is_public: Number(r.is_public) || 0 };
    }
    async upsertAnswer(roomId, questionId, userId, selectedIndex, isCorrect, score) {
        const col = await (0, mongo_js_1.getCollection)('answers');
        await col.updateOne({ room_id: roomId, question_id: questionId, user_id: userId }, { $set: { selected_index: selectedIndex, is_correct: isCorrect, score, created_at: new Date() } }, { upsert: true });
    }
    async updateParticipantTotal(roomId, userId) {
        const answers = await (0, mongo_js_1.getCollection)('answers');
        const parts = await (0, mongo_js_1.getCollection)('participants');
        const agg = await answers.aggregate([
            { $match: { room_id: roomId, user_id: userId } },
            { $group: { _id: null, total_score: { $sum: { $ifNull: ['$score', 0] } }, correct: { $sum: { $ifNull: ['$is_correct', 0] } } } }
        ]).toArray();
        const total_score = agg[0] ? Number(agg[0].total_score) || 0 : 0;
        await parts.updateOne({ room_id: roomId, user_id: userId }, { $set: { total_score } }, { upsert: true });
    }
    async recomputePositions(roomId) {
        const parts = await (0, mongo_js_1.getCollection)('participants');
        const list = await parts.find({ room_id: roomId }).sort({ total_score: -1 }).toArray();
        let pos = 1;
        for (const p of list) {
            await parts.updateOne({ room_id: roomId, user_id: p.user_id }, { $set: { position: pos } });
            pos++;
        }
    }
    async getLeaderboard(roomId) {
        const answers = await (0, mongo_js_1.getCollection)('answers');
        const users = await (0, mongo_js_1.getCollection)('users');
        const agg = await answers.aggregate([
            { $match: { room_id: roomId } },
            {
                $group: {
                    _id: '$user_id',
                    score: { $sum: { $ifNull: ['$score', 0] } },
                    answered: { $sum: 1 },
                    correct: { $sum: { $ifNull: ['$is_correct', 0] } }
                }
            },
            { $sort: { score: -1, correct: -1, answered: -1 } }
        ]).toArray();
        const result = [];
        for (const row of agg) {
            const uid = Number(row._id);
            const u = await users.findOne({ id: uid }, { projection: { id: 1, username: 1 } });
            if (u) {
                result.push({
                    user_id: u.id,
                    username: u.username,
                    score: Number(row.score) || 0,
                    answered: Number(row.answered) || 0,
                    correct: Number(row.correct) || 0
                });
            }
        }
        return result;
    }
    async getGlobalLeaderboard() {
        const answers = await (0, mongo_js_1.getCollection)('answers');
        const agg = await answers.aggregate([
            {
                $group: {
                    _id: '$user_id',
                    total_score: { $sum: { $ifNull: ['$score', 0] } },
                    correct: { $sum: { $ifNull: ['$is_correct', 0] } },
                    answered: { $sum: 1 },
                    rooms: { $addToSet: '$room_id' }
                }
            },
            { $project: { total_score: 1, correct: 1, answered: 1, rooms: { $size: '$rooms' } } },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: 'id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    _id: 0,
                    user_id: '$user.id',
                    username: '$user.username',
                    avatar_url: { $ifNull: ['$user.avatar_url', ''] },
                    total_score: 1,
                    correct: 1,
                    answered: 1,
                    rooms: 1
                }
            },
            { $sort: { total_score: -1, correct: -1, answered: -1, username: 1 } }
        ]).toArray();
        return agg.map((row) => ({
            user_id: Number(row.user_id),
            username: row.username,
            avatar_url: row.avatar_url || '',
            total_score: Number(row.total_score) || 0,
            answered: Number(row.answered) || 0,
            correct: Number(row.correct) || 0,
            rooms: Number(row.rooms) || 0
        }));
    }
    async getMyAnswers(roomId, userId) {
        const col = await (0, mongo_js_1.getCollection)('answers');
        const rows = await col.find({ room_id: roomId, user_id: userId }, { projection: { question_id: 1, selected_index: 1, is_correct: 1, score: 1 } }).toArray();
        return rows.map(r => ({
            question_id: Number(r.question_id),
            selected_index: Number(r.selected_index) || 0,
            is_correct: Number(r.is_correct) || 0,
            score: Number(r.score) || 0
        }));
    }
    async getQuestionCountsByRoomIds(roomIds) {
        const q = await (0, mongo_js_1.getCollection)('questions');
        const agg = await q.aggregate([
            { $match: { room_id: { $in: roomIds } } },
            { $group: { _id: '$room_id', total: { $sum: 1 } } }
        ]).toArray();
        return agg.map(a => ({ room_id: Number(a._id), total: Number(a.total) || 0 }));
    }
    async getAnswerCountsByRoomIds(userId, roomIds) {
        const a = await (0, mongo_js_1.getCollection)('answers');
        const agg = await a.aggregate([
            { $match: { user_id: userId, room_id: { $in: roomIds } } },
            { $group: { _id: '$room_id', answered: { $sum: 1 } } }
        ]).toArray();
        return agg.map(a => ({ room_id: Number(a._id), answered: Number(a.answered) || 0 }));
    }
}
exports.AnswerRepositoryMongo = AnswerRepositoryMongo;
