"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnswerRepositoryMySQL = void 0;
const db_js_1 = __importDefault(require("../../config/db.js"));
class AnswerRepositoryMySQL {
    async getCorrectAnswerIndex(questionId, roomId) {
        const [qs] = await db_js_1.default.query('SELECT correct_answer_index FROM questions WHERE id = ? AND room_id = ?', [questionId, roomId]);
        if (!qs || qs.length === 0)
            return null;
        return Number(qs[0].correct_answer_index);
    }
    async getRoomTiming(roomId) {
        const [rows] = await db_js_1.default.query('SELECT time_per_question, start_time, is_public FROM rooms WHERE id = ?', [roomId]);
        if (!rows || rows.length === 0)
            return null;
        return rows[0];
    }
    async upsertAnswer(roomId, questionId, userId, selectedIndex, isCorrect, score) {
        await db_js_1.default.query(`INSERT INTO answers (room_id, question_id, user_id, selected_index, is_correct, score)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE selected_index = VALUES(selected_index), is_correct = VALUES(is_correct), score = VALUES(score)`, [roomId, questionId, userId, selectedIndex, isCorrect, score]);
    }
    async updateParticipantTotal(roomId, userId) {
        await db_js_1.default.query(`UPDATE participants p
       SET total_score = (
         SELECT COALESCE(SUM(a.score), 0) FROM answers a WHERE a.room_id = ? AND a.user_id = ?
       )
       WHERE p.room_id = ? AND p.user_id = ?`, [roomId, userId, roomId, userId]);
    }
    async recomputePositions(roomId) {
        await db_js_1.default.query(`UPDATE participants p
       JOIN (
         SELECT u.id AS user_id,
                ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(a.score),0) DESC, COALESCE(SUM(a.is_correct),0) DESC) AS pos
         FROM users u
         JOIN participants p2 ON p2.user_id = u.id
         LEFT JOIN answers a ON a.user_id = u.id AND a.room_id = p2.room_id
         WHERE p2.room_id = ?
         GROUP BY u.id
       ) t ON t.user_id = p.user_id AND p.room_id = ?
       SET p.position = t.pos`, [roomId, roomId]);
    }
    async getLeaderboard(roomId) {
        const [rows] = await db_js_1.default.query(`SELECT u.id as user_id, u.username,
              COALESCE(SUM(a.score), 0) AS score,
              COUNT(*) AS answered,
              SUM(a.is_correct) AS correct
       FROM answers a
       JOIN users u ON a.user_id = u.id
       WHERE a.room_id = ?
       GROUP BY u.id, u.username
       ORDER BY score DESC, correct DESC, answered DESC, u.username ASC`, [roomId]);
        return rows;
    }
    async getGlobalLeaderboard() {
        const [rows] = await db_js_1.default.query(`SELECT u.id AS user_id, u.username,
              u.avatar_url,
              COALESCE(SUM(a.score),0) AS total_score,
              COALESCE(SUM(a.is_correct),0) AS correct,
              COUNT(*) AS answered,
              COUNT(DISTINCT a.room_id) AS rooms
       FROM answers a
       JOIN users u ON u.id = a.user_id
       GROUP BY u.id, u.username, u.avatar_url
       ORDER BY total_score DESC, correct DESC, answered DESC, u.username ASC`);
        return rows;
    }
    async getMyAnswers(roomId, userId) {
        const [rows] = await db_js_1.default.query(`SELECT question_id, selected_index, is_correct, score FROM answers WHERE room_id = ? AND user_id = ?`, [roomId, userId]);
        return rows;
    }
    async getQuestionCountsByRoomIds(roomIds) {
        const [rows] = await db_js_1.default.query(`SELECT room_id, COUNT(*) AS total FROM questions WHERE room_id IN (?) GROUP BY room_id`, [roomIds]);
        return rows.map(r => ({ room_id: Number(r.room_id), total: Number(r.total) }));
    }
    async getAnswerCountsByRoomIds(userId, roomIds) {
        const [rows] = await db_js_1.default.query(`SELECT room_id, COUNT(*) AS answered FROM answers WHERE user_id = ? AND room_id IN (?) GROUP BY room_id`, [userId, roomIds]);
        return rows.map(r => ({ room_id: Number(r.room_id), answered: Number(r.answered) }));
    }
}
exports.AnswerRepositoryMySQL = AnswerRepositoryMySQL;
