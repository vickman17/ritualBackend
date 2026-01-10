import pool from '../../config/db.js';
import { IRoomRepository } from '../interfaces/RoomRepository.js';

export class RoomRepositoryMySQL implements IRoomRepository {
  async getById(id: number): Promise<any | null> {
    const [rows] = await pool.query<any[]>('SELECT * FROM rooms WHERE id = ?', [id]);
    return rows && rows[0] ? rows[0] : null;
  }
  async getRoomsList(): Promise<any[]> {
    const [rooms] = await pool.query<any[]>(
      `SELECT r.id, r.room_code, r.title, r.max_participants, r.status, r.is_public, r.is_published, r.published_at, r.start_time, r.created_at, r.host_id, r.cover_photo_url,
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
       ORDER BY r.created_at DESC`
    );
    return rooms;
  }
  async getRoomsSnapshot(): Promise<any[]> {
    const [rows] = await pool.query<any[]>(
      `SELECT r.id, r.title, r.is_public, r.status, r.start_time, r.time_per_question, r.cover_photo_url,
              (SELECT COUNT(*) FROM questions q WHERE q.room_id = r.id) AS total_questions,
              (SELECT COUNT(*) FROM participants p WHERE p.room_id = r.id) AS participant_count,
              COALESCE(r.is_published, 0) AS is_published
       FROM rooms r
       WHERE (r.is_public = 1 AND COALESCE(r.is_published, 0) = 1 AND (SELECT COUNT(*) FROM questions q WHERE q.room_id = r.id) > 0)
          OR (r.is_public = 0 AND r.start_time IS NOT NULL AND (SELECT COUNT(*) FROM questions q WHERE q.room_id = r.id) > 0)`
    );
    return rows;
  }
  async getRecentPublicRooms(): Promise<any[]> {
    const [rooms] = await pool.query<any[]>(
      `SELECT r.id, r.room_code, r.title, r.published_at, r.created_at, r.cover_photo_url,
              (SELECT COUNT(*) FROM participants p WHERE p.room_id = r.id) AS participant_count
       FROM rooms r
       WHERE r.is_public = 1 AND COALESCE(r.is_published, 0) = 1
       ORDER BY r.published_at DESC, r.created_at DESC
       LIMIT 20`
    );
    return rooms;
  }
  async getAllPublicRooms(): Promise<any[]> {
    const [rooms] = await pool.query<any[]>(
      `SELECT r.id, r.room_code, r.title, r.published_at, r.created_at, r.cover_photo_url,
              (SELECT COUNT(*) FROM participants p WHERE p.room_id = r.id) AS participant_count
       FROM rooms r
       WHERE r.is_public = 1 AND COALESCE(r.is_published, 0) = 1
       ORDER BY r.published_at DESC, r.created_at DESC`
    );
    return rooms;
  }
  async getMyRooms(hostId: number): Promise<any[]> {
    const [rooms] = await pool.query<any[]>(
      `SELECT r.*, (SELECT COUNT(*) FROM participants p WHERE p.room_id = r.id) as participant_count
       FROM rooms r WHERE r.host_id = ? ORDER BY r.created_at DESC`,
      [hostId]
    );
    return rooms;
  }
  async getParticipants(roomId: number): Promise<any[]> {
    const [participants] = await pool.query<any[]>(
      `SELECT u.id, u.username, p.joined_at 
       FROM participants p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.room_id = ? 
       ORDER BY p.joined_at DESC`,
      [roomId]
    );
    return participants;
  }
  async getQuestionsCount(roomId: number): Promise<number> {
    const [qRows] = await pool.query<any[]>('SELECT COUNT(*) AS total FROM questions WHERE room_id = ?', [roomId]);
    return Number((qRows[0] as any).total) || 0;
  }
  async getAnswersCount(roomId: number, userId: number): Promise<number> {
    const [aRows] = await pool.query<any[]>('SELECT COUNT(*) AS answered FROM answers WHERE room_id = ? AND user_id = ?', [roomId, userId]);
    return Number((aRows[0] as any).answered) || 0;
  }
  async getParticipantScorePosition(roomId: number, userId: number): Promise<{ total_score: number; position: number | null }> {
    const [rows] = await pool.query<any[]>('SELECT total_score, position FROM participants WHERE room_id = ? AND user_id = ?', [roomId, userId]);
    const total_score = rows.length ? (rows[0] as any).total_score : 0;
    const position = rows.length ? (rows[0] as any).position : null;
    return { total_score, position };
  }
  async createRoom(params: { roomCode: string; hostId: number; title: string; maxParticipants: number; timePerQuestion: number; isPublic: boolean; passwordHash: string | null; startTime: Date | null; coverPhotoUrl: string | null }): Promise<number> {
    const [result] = await pool.query<any>(
      `INSERT INTO rooms (room_code, host_id, title, max_participants, time_per_question, is_public, password_hash, start_time, cover_photo_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        params.roomCode,
        params.hostId,
        params.title,
        params.maxParticipants,
        params.timePerQuestion,
        params.isPublic ? 1 : 0,
        params.passwordHash,
        params.startTime,
        params.coverPhotoUrl
      ]
    );
    return (result as any).insertId as number;
  }
  async updateRoom(id: number, fields: Partial<{ title: string; maxParticipants: number; timePerQuestion: number; isPublic: boolean; startTime: Date | null; coverPhotoUrl: string | null; status: string; is_published: number }>): Promise<void> {
    let query = 'UPDATE rooms SET';
    const params: any[] = [];
    const sets: string[] = [];
    if (fields.title !== undefined) { sets.push(' title = ?'); params.push(fields.title); }
    if (fields.maxParticipants !== undefined) { sets.push(' max_participants = ?'); params.push(fields.maxParticipants); }
    if (fields.timePerQuestion !== undefined) { sets.push(' time_per_question = ?'); params.push(fields.timePerQuestion); }
    if (fields.isPublic !== undefined) { sets.push(' is_public = ?'); params.push(fields.isPublic ? 1 : 0); }
    if (fields.startTime !== undefined) { sets.push(' start_time = ?'); params.push(fields.startTime); }
    if (fields.coverPhotoUrl !== undefined) { sets.push(' cover_photo_url = ?'); params.push(fields.coverPhotoUrl); }
    if (fields.status !== undefined) { sets.push(' status = ?'); params.push(fields.status); }
    if (fields.is_published !== undefined) { sets.push(' is_published = ?'); params.push(fields.is_published); }
    query += sets.join(',');
    query += ' WHERE id = ?';
    params.push(id);
    await pool.query(query, params);
  }
  async deleteRoom(id: number): Promise<void> {
    await pool.query('DELETE FROM rooms WHERE id = ?', [id]);
  }
  async isUserParticipant(userId: number, roomId: number): Promise<boolean> {
    const [rows] = await pool.query<any[]>('SELECT 1 FROM participants WHERE user_id = ? AND room_id = ?', [userId, roomId]);
    return !!rows && rows.length > 0;
  }
  async addParticipant(userId: number, roomId: number): Promise<void> {
    await pool.query('INSERT INTO participants (user_id, room_id) VALUES (?, ?)', [userId, roomId]);
  }
  async removeParticipant(userId: number, roomId: number): Promise<void> {
    await pool.query('DELETE FROM participants WHERE user_id = ? AND room_id = ?', [userId, roomId]);
  }
}
