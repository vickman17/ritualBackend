"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomRepositoryMySQL = void 0;
const db_js_1 = __importDefault(require("../../config/db.js"));
class RoomRepositoryMySQL {
    async getById(id) {
        const [rows] = await db_js_1.default.query('SELECT * FROM rooms WHERE id = ?', [id]);
        return rows && rows[0] ? rows[0] : null;
    }
    async getRoomsList() {
        const [rooms] = await db_js_1.default.query(`SELECT r.id, r.room_code, r.title, r.max_participants, r.status, r.is_public, r.is_published, r.published_at, r.start_time, r.created_at, r.host_id, r.cover_photo_url,
      (SELECT COUNT(*) FROM participants p WHERE p.room_id = r.id) as participant_count
       FROM rooms r
       WHERE (
         r.is_public = 1 
         AND r.is_published = 1 
         AND (SELECT COUNT(*) FROM questions q WHERE q.room_id = r.id) > 0
       )
       OR (
         r.is_public = 0 
         AND LOWER(r.status) IN ('waiting','published')
         AND r.start_time IS NOT NULL 
         AND (SELECT COUNT(*) FROM questions q WHERE q.room_id = r.id) > 0
       )
       ORDER BY r.created_at DESC`);
        return rooms;
    }
    async getRoomsSnapshot() {
        const [rows] = await db_js_1.default.query(`SELECT r.id, r.title, r.is_public, r.status, r.start_time, r.time_per_question, r.cover_photo_url,
              (SELECT COUNT(*) FROM questions q WHERE q.room_id = r.id) AS total_questions,
              (SELECT COUNT(*) FROM participants p WHERE p.room_id = r.id) AS participant_count,
              COALESCE(r.is_published, 0) AS is_published
       FROM rooms r
       WHERE (r.is_public = 1 AND COALESCE(r.is_published, 0) = 1 AND (SELECT COUNT(*) FROM questions q WHERE q.room_id = r.id) > 0)
          OR (r.is_public = 0 AND r.start_time IS NOT NULL AND (SELECT COUNT(*) FROM questions q WHERE q.room_id = r.id) > 0)`);
        return rows;
    }
    async getRecentPublicRooms() {
        const [rooms] = await db_js_1.default.query(`SELECT r.id, r.room_code, r.title, r.published_at, r.created_at, r.cover_photo_url,
              (SELECT COUNT(*) FROM participants p WHERE p.room_id = r.id) AS participant_count
       FROM rooms r
       WHERE r.is_public = 1 AND COALESCE(r.is_published, 0) = 1
       ORDER BY r.published_at DESC, r.created_at DESC
       LIMIT 20`);
        return rooms;
    }
    async getAllPublicRooms() {
        const [rooms] = await db_js_1.default.query(`SELECT r.id, r.room_code, r.title, r.published_at, r.created_at, r.cover_photo_url,
              (SELECT COUNT(*) FROM participants p WHERE p.room_id = r.id) AS participant_count
       FROM rooms r
       WHERE r.is_public = 1 AND COALESCE(r.is_published, 0) = 1
       ORDER BY r.published_at DESC, r.created_at DESC`);
        return rooms;
    }
    async getMyRooms(hostId) {
        const [rooms] = await db_js_1.default.query(`SELECT r.*, (SELECT COUNT(*) FROM participants p WHERE p.room_id = r.id) as participant_count
       FROM rooms r WHERE r.host_id = ? ORDER BY r.created_at DESC`, [hostId]);
        return rooms;
    }
    async getParticipants(roomId) {
        const [participants] = await db_js_1.default.query(`SELECT u.id, u.username, p.joined_at 
       FROM participants p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.room_id = ? 
       ORDER BY p.joined_at DESC`, [roomId]);
        return participants;
    }
    async getQuestionsCount(roomId) {
        const [qRows] = await db_js_1.default.query('SELECT COUNT(*) AS total FROM questions WHERE room_id = ?', [roomId]);
        return Number(qRows[0].total) || 0;
    }
    async getAnswersCount(roomId, userId) {
        const [aRows] = await db_js_1.default.query('SELECT COUNT(*) AS answered FROM answers WHERE room_id = ? AND user_id = ?', [roomId, userId]);
        return Number(aRows[0].answered) || 0;
    }
    async getParticipantScorePosition(roomId, userId) {
        const [rows] = await db_js_1.default.query('SELECT total_score, position FROM participants WHERE room_id = ? AND user_id = ?', [roomId, userId]);
        const total_score = rows.length ? rows[0].total_score : 0;
        const position = rows.length ? rows[0].position : null;
        return { total_score, position };
    }
    async createRoom(params) {
        const [result] = await db_js_1.default.query(`INSERT INTO rooms (room_code, host_id, title, max_participants, time_per_question, is_public, password_hash, start_time, cover_photo_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            params.roomCode,
            params.hostId,
            params.title,
            params.maxParticipants,
            params.timePerQuestion,
            params.isPublic ? 1 : 0,
            params.passwordHash,
            params.startTime,
            params.coverPhotoUrl
        ]);
        return result.insertId;
    }
    async updateRoom(id, fields) {
        let query = 'UPDATE rooms SET';
        const params = [];
        const sets = [];
        if (fields.title !== undefined) {
            sets.push(' title = ?');
            params.push(fields.title);
        }
        if (fields.maxParticipants !== undefined) {
            sets.push(' max_participants = ?');
            params.push(fields.maxParticipants);
        }
        if (fields.timePerQuestion !== undefined) {
            sets.push(' time_per_question = ?');
            params.push(fields.timePerQuestion);
        }
        if (fields.isPublic !== undefined) {
            sets.push(' is_public = ?');
            params.push(fields.isPublic ? 1 : 0);
        }
        if (fields.startTime !== undefined) {
            sets.push(' start_time = ?');
            params.push(fields.startTime);
        }
        if (fields.coverPhotoUrl !== undefined) {
            sets.push(' cover_photo_url = ?');
            params.push(fields.coverPhotoUrl);
        }
        if (fields.status !== undefined) {
            sets.push(' status = ?');
            params.push(fields.status);
        }
        if (fields.is_published !== undefined) {
            sets.push(' is_published = ?');
            params.push(fields.is_published);
        }
        query += sets.join(',');
        query += ' WHERE id = ?';
        params.push(id);
        await db_js_1.default.query(query, params);
    }
    async deleteRoom(id) {
        await db_js_1.default.query('DELETE FROM rooms WHERE id = ?', [id]);
    }
    async isUserParticipant(userId, roomId) {
        const [rows] = await db_js_1.default.query('SELECT 1 FROM participants WHERE user_id = ? AND room_id = ?', [userId, roomId]);
        return !!rows && rows.length > 0;
    }
    async addParticipant(userId, roomId) {
        await db_js_1.default.query('INSERT INTO participants (user_id, room_id) VALUES (?, ?)', [userId, roomId]);
    }
    async removeParticipant(userId, roomId) {
        await db_js_1.default.query('DELETE FROM participants WHERE user_id = ? AND room_id = ?', [userId, roomId]);
    }
}
exports.RoomRepositoryMySQL = RoomRepositoryMySQL;
