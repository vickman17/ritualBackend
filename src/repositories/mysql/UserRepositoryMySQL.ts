import pool from '../../config/db.js';
import { IUserRepository } from '../interfaces/UserRepository.js';

export class UserRepositoryMySQL implements IUserRepository {
  async findByEmailOrUsername(email: string, username: string): Promise<any[]> {
    const [rows] = await pool.query<any[]>('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
    return rows;
  }
  async findByEmail(email: string): Promise<any[]> {
    const [rows] = await pool.query<any[]>('SELECT * FROM users WHERE email = ?', [email]);
    return rows;
  }
  async findByDiscordId(discordId: string): Promise<any[]> {
    const [rows] = await pool.query<any[]>('SELECT * FROM users WHERE discord_id = ?', [discordId]);
    return rows;
  }
  async findIdByEmail(email: string): Promise<number | null> {
    const [rows] = await pool.query<any[]>('SELECT id FROM users WHERE email = ?', [email]);
    return rows && rows[0] ? Number((rows[0] as any).id) : null;
  }
  async createUser(username: string, email: string, passwordHash: string, role: string, avatarUrl: string): Promise<number> {
    const [result] = await pool.query<any>('INSERT INTO users (username, email, password_hash, role, avatar_url) VALUES (?, ?, ?, ?, ?)', [username, email, passwordHash, role, avatarUrl]);
    return (result as any).insertId as number;
  }
  async updateAvatar(userId: number, avatarUrl: string): Promise<void> {
    await pool.query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, userId]);
  }
  async getScoreSummary(userId: number): Promise<{ total_score: number; correct: number; answered: number }> {
    const [rows] = await pool.query<any[]>('SELECT COALESCE(SUM(score),0) AS total_score, COALESCE(SUM(is_correct),0) AS correct, COUNT(*) AS answered FROM answers WHERE user_id = ?', [userId]);
    const r = rows && rows[0] ? rows[0] : { total_score: 0, correct: 0, answered: 0 };
    return { total_score: Number(r.total_score) || 0, correct: Number(r.correct) || 0, answered: Number(r.answered) || 0 };
  }
  async getRecentPlayed(userId: number): Promise<Array<{ id: number; title: string; room_code: string; last_played: any; answered: number; total_score: number }>> {
    const [rows] = await pool.query<any[]>(
      `SELECT r.id, r.title, r.room_code,
              MAX(a.created_at) AS last_played,
              COUNT(a.id) AS answered,
              COALESCE(SUM(a.score),0) AS total_score
       FROM answers a
       JOIN rooms r ON r.id = a.room_id
       WHERE a.user_id = ?
       GROUP BY r.id, r.title, r.room_code
       ORDER BY last_played DESC
       LIMIT 10`,
      [userId]
    );
    return rows.map(r => ({
      id: Number(r.id),
      title: r.title,
      room_code: r.room_code,
      last_played: r.last_played,
      answered: Number(r.answered) || 0,
      total_score: Number(r.total_score) || 0,
    }));
  }
  async linkDiscord(userId: number, discordId: string, avatarUrl: string | null, username: string): Promise<void> {
    await pool.query('UPDATE users SET discord_id = ?, avatar_url = ?, username = ? WHERE id = ?', [discordId, avatarUrl, username, userId]);
  }
  async createDiscordUser(username: string, email: string, avatarUrl: string | null): Promise<number> {
    const [ins] = await pool.query<any>(
      'INSERT INTO users (username, email, password_hash, role, discord_id, avatar_url) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, '', 'participant', '', avatarUrl]
    );
    return (ins as any).insertId as number;
  }
}
