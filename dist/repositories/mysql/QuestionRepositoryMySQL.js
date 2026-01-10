"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionRepositoryMySQL = void 0;
const db_js_1 = __importDefault(require("../../config/db.js"));
class QuestionRepositoryMySQL {
    async getMaxOrder(roomId) {
        const [rows] = await db_js_1.default.query('SELECT MAX(order_index) as maxOrder FROM questions WHERE room_id = ?', [roomId]);
        const maxOrder = rows && rows.length > 0 && rows[0].maxOrder ? Number(rows[0].maxOrder) : 0;
        return maxOrder;
    }
    async addQuestion(roomId, text, options, correctIndex, orderIndex, imageUrl) {
        const [r] = await db_js_1.default.query('INSERT INTO questions (room_id, question_text, options, correct_answer_index, order_index, image_url) VALUES (?, ?, ?, ?, ?, ?)', [roomId, text, JSON.stringify(options), correctIndex, orderIndex, imageUrl || null]);
        return r.insertId;
    }
    async deleteQuestion(id) {
        await db_js_1.default.query('DELETE FROM questions WHERE id = ?', [id]);
    }
    async getQuestions(roomId) {
        const [rows] = await db_js_1.default.query('SELECT * FROM questions WHERE room_id = ? ORDER BY order_index ASC', [roomId]);
        return rows;
    }
    async getRoomIdForQuestion(id) {
        const [rows] = await db_js_1.default.query('SELECT room_id FROM questions WHERE id = ?', [id]);
        return rows && rows[0] ? Number(rows[0].room_id) : null;
    }
}
exports.QuestionRepositoryMySQL = QuestionRepositoryMySQL;
