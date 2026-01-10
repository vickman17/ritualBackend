import pool from '../../config/db.js';
import { IAnswerRepository } from '../interfaces/AnswerRepository.js';

export class AnswerRepositoryMySQL implements IAnswerRepository {
  async getCorrectAnswerIndex(questionId: number, roomId: number): Promise<number | null> {
    const [qs] = await pool.query<any[]>('SELECT correct_answer_index FROM questions WHERE id = ? AND room_id = ?', [questionId, roomId]);
    if (!qs || qs.length === 0) return null;
    return Number(qs[0].correct_answer_index);
  }
  async getRoomTiming(roomId: number): Promise<{ time_per_question: number; start_time: any; is_public: number } | null> {
    const [rows] = await pool.query<any[]>('SELECT time_per_question, start_time, is_public FROM rooms WHERE id = ?', [roomId]);
    if (!rows || rows.length === 0) return null;
    return rows[0];
  }
  async upsertAnswer(roomId: number, questionId: number, userId: number, selectedIndex: number, isCorrect: number, score: number): Promise<void> {
    await pool.query(
      `INSERT INTO answers (room_id, question_id, user_id, selected_index, is_correct, score)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE selected_index = VALUES(selected_index), is_correct = VALUES(is_correct), score = VALUES(score)`,
      [roomId, questionId, userId, selectedIndex, isCorrect, score]
    );
  }
  async updateParticipantTotal(roomId: number, userId: number): Promise<void> {
    await pool.query(
      `UPDATE participants p
       SET total_score = (
         SELECT COALESCE(SUM(a.score), 0) FROM answers a WHERE a.room_id = ? AND a.user_id = ?
       )
       WHERE p.room_id = ? AND p.user_id = ?`,
      [roomId, userId, roomId, userId]
    );
  }
  async recomputePositions(roomId: number): Promise<void> {
    await pool.query(
      `UPDATE participants p
       JOIN (
         SELECT u.id AS user_id,
                ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(a.score),0) DESC, COALESCE(SUM(a.is_correct),0) DESC) AS pos
         FROM users u
         JOIN participants p2 ON p2.user_id = u.id
         LEFT JOIN answers a ON a.user_id = u.id AND a.room_id = p2.room_id
         WHERE p2.room_id = ?
         GROUP BY u.id
       ) t ON t.user_id = p.user_id AND p.room_id = ?
       SET p.position = t.pos`,
      [roomId, roomId]
    );
  }
  async getLeaderboard(roomId: number): Promise<any[]> {
    const [rows] = await pool.query<any[]>(
      `SELECT u.id as user_id, u.username,
              COALESCE(SUM(a.score), 0) AS score,
              COUNT(*) AS answered,
              SUM(a.is_correct) AS correct
       FROM answers a
       JOIN users u ON a.user_id = u.id
       WHERE a.room_id = ?
       GROUP BY u.id, u.username
       ORDER BY score DESC, correct DESC, answered DESC, u.username ASC`,
      [roomId]
    );
    return rows;
  }
  async getGlobalLeaderboard(): Promise<any[]> {
    const [rows] = await pool.query<any[]>(
      `SELECT u.id AS user_id, u.username,
              u.avatar_url,
              COALESCE(SUM(a.score),0) AS total_score,
              COALESCE(SUM(a.is_correct),0) AS correct,
              COUNT(*) AS answered,
              COUNT(DISTINCT a.room_id) AS rooms
       FROM answers a
       JOIN users u ON u.id = a.user_id
       GROUP BY u.id, u.username, u.avatar_url
       ORDER BY total_score DESC, correct DESC, answered DESC, u.username ASC`
    );
    return rows;
  }
  async getMyAnswers(roomId: number, userId: number): Promise<any[]> {
    const [rows] = await pool.query<any[]>(
      `SELECT question_id, selected_index, is_correct, score FROM answers WHERE room_id = ? AND user_id = ?`,
      [roomId, userId]
    );
    return rows;
  }
  async getQuestionCountsByRoomIds(roomIds: number[]): Promise<Array<{ room_id: number; total: number }>> {
    const [rows] = await pool.query<any[]>(
      `SELECT room_id, COUNT(*) AS total FROM questions WHERE room_id IN (?) GROUP BY room_id`,
      [roomIds]
    );
    return rows.map(r => ({ room_id: Number(r.room_id), total: Number(r.total) }));
  }
  async getAnswerCountsByRoomIds(userId: number, roomIds: number[]): Promise<Array<{ room_id: number; answered: number }>> {
    const [rows] = await pool.query<any[]>(
      `SELECT room_id, COUNT(*) AS answered FROM answers WHERE user_id = ? AND room_id IN (?) GROUP BY room_id`,
      [userId, roomIds]
    );
    return rows.map(r => ({ room_id: Number(r.room_id), answered: Number(r.answered) }));
  }
}
