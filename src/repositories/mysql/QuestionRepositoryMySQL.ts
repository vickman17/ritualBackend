import pool from '../../config/db.js';
import { IQuestionRepository } from '../interfaces/QuestionRepository.js';

export class QuestionRepositoryMySQL implements IQuestionRepository {
  async getMaxOrder(roomId: number): Promise<number> {
    const [rows] = await pool.query<any[]>('SELECT MAX(order_index) as maxOrder FROM questions WHERE room_id = ?', [roomId]);
    const maxOrder = rows && rows.length > 0 && (rows[0] as any).maxOrder ? Number((rows[0] as any).maxOrder) : 0;
    return maxOrder;
  }
  async addQuestion(roomId: number, text: string, options: string[], correctIndex: number, orderIndex: number, imageUrl?: string | null): Promise<number> {
    const [r] = await pool.query<any>(
      'INSERT INTO questions (room_id, question_text, options, correct_answer_index, order_index, image_url) VALUES (?, ?, ?, ?, ?, ?)',
      [roomId, text, JSON.stringify(options), correctIndex, orderIndex, imageUrl || null]
    );
    return (r as any).insertId as number;
  }
  async deleteQuestion(id: number): Promise<void> {
    await pool.query('DELETE FROM questions WHERE id = ?', [id]);
  }
  async getQuestions(roomId: number): Promise<any[]> {
    const [rows] = await pool.query<any[]>('SELECT * FROM questions WHERE room_id = ? ORDER BY order_index ASC', [roomId]);
    return rows;
  }
  async getRoomIdForQuestion(id: number): Promise<number | null> {
    const [rows] = await pool.query<any[]>('SELECT room_id FROM questions WHERE id = ?', [id]);
    return rows && rows[0] ? Number(rows[0].room_id) : null;
  }
}
