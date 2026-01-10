"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionRepositoryMongo = void 0;
const mongo_js_1 = require("../../config/mongo.js");
class QuestionRepositoryMongo {
    async getMaxOrder(roomId) {
        const col = await (0, mongo_js_1.getCollection)('questions');
        const doc = await col.find({ room_id: roomId }).sort({ order_index: -1 }).limit(1).toArray();
        const top = doc[0];
        return top ? Number(top.order_index) || 0 : 0;
    }
    async addQuestion(roomId, text, options, correctIndex, orderIndex, imageUrl) {
        const col = await (0, mongo_js_1.getCollection)('questions');
        const id = await (0, mongo_js_1.nextId)('questions');
        await col.insertOne({
            id,
            room_id: roomId,
            question_text: text,
            options: JSON.stringify(options),
            correct_answer_index: correctIndex,
            order_index: orderIndex,
            image_url: imageUrl || null
        });
        return id;
    }
    async deleteQuestion(id) {
        const col = await (0, mongo_js_1.getCollection)('questions');
        await col.deleteOne({ id });
    }
    async getQuestions(roomId) {
        const col = await (0, mongo_js_1.getCollection)('questions');
        return await col.find({ room_id: roomId }).sort({ order_index: 1 }).toArray();
    }
    async getRoomIdForQuestion(id) {
        const col = await (0, mongo_js_1.getCollection)('questions');
        const q = await col.findOne({ id }, { projection: { room_id: 1 } });
        return q ? Number(q.room_id) : null;
    }
}
exports.QuestionRepositoryMongo = QuestionRepositoryMongo;
