"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepositoryMySQL = void 0;
const db_js_1 = __importDefault(require("../../config/db.js"));
class UserRepositoryMySQL {
    async findByEmailOrUsername(email, username) {
        const [rows] = await db_js_1.default.query('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
        return rows;
    }
    async findByEmail(email) {
        const [rows] = await db_js_1.default.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows;
    }
    async findByDiscordId(discordId) {
        const [rows] = await db_js_1.default.query('SELECT * FROM users WHERE discord_id = ?', [discordId]);
        return rows;
    }
    async findIdByEmail(email) {
        const [rows] = await db_js_1.default.query('SELECT id FROM users WHERE email = ?', [email]);
        return rows && rows[0] ? Number(rows[0].id) : null;
    }
    async createUser(username, email, passwordHash, role, avatarUrl) {
        const [result] = await db_js_1.default.query('INSERT INTO users (username, email, password_hash, role, avatar_url) VALUES (?, ?, ?, ?, ?)', [username, email, passwordHash, role, avatarUrl]);
        return result.insertId;
    }
    async updateAvatar(userId, avatarUrl) {
        await db_js_1.default.query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, userId]);
    }
    async getScoreSummary(userId) {
        const [rows] = await db_js_1.default.query('SELECT COALESCE(SUM(score),0) AS total_score, COALESCE(SUM(is_correct),0) AS correct, COUNT(*) AS answered FROM answers WHERE user_id = ?', [userId]);
        const r = rows && rows[0] ? rows[0] : { total_score: 0, correct: 0, answered: 0 };
        return { total_score: Number(r.total_score) || 0, correct: Number(r.correct) || 0, answered: Number(r.answered) || 0 };
    }
    async getRecentPlayed(userId) {
        const [rows] = await db_js_1.default.query(`SELECT r.id, r.title, r.room_code,
              MAX(a.created_at) AS last_played,
              COUNT(a.id) AS answered,
              COALESCE(SUM(a.score),0) AS total_score
       FROM answers a
       JOIN rooms r ON r.id = a.room_id
       WHERE a.user_id = ?
       GROUP BY r.id, r.title, r.room_code
       ORDER BY last_played DESC
       LIMIT 10`, [userId]);
        return rows.map(r => ({
            id: Number(r.id),
            title: r.title,
            room_code: r.room_code,
            last_played: r.last_played,
            answered: Number(r.answered) || 0,
            total_score: Number(r.total_score) || 0,
        }));
    }
    async linkDiscord(userId, discordId, avatarUrl, username) {
        await db_js_1.default.query('UPDATE users SET discord_id = ?, avatar_url = ?, username = ? WHERE id = ?', [discordId, avatarUrl, username, userId]);
    }
    async createDiscordUser(username, email, avatarUrl) {
        const [ins] = await db_js_1.default.query('INSERT INTO users (username, email, password_hash, role, discord_id, avatar_url) VALUES (?, ?, ?, ?, ?, ?)', [username, email, '', 'participant', '', avatarUrl]);
        return ins.insertId;
    }
}
exports.UserRepositoryMySQL = UserRepositoryMySQL;
//# sourceMappingURL=UserRepositoryMySQL.js.map