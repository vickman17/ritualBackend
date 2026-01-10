import { getCollection, nextId } from '../../config/mongo.js';
import { IRoomRepository } from '../interfaces/RoomRepository.js';

export class RoomRepositoryMongo implements IRoomRepository {
  async getById(id: number): Promise<any | null> {
    const col = await getCollection<any>('rooms');
    return await col.findOne({ id });
  }
  async getRoomsList(): Promise<any[]> {
    const rooms = await getCollection<any>('rooms');
    const questions = await getCollection<any>('questions');
    const participants = await getCollection<any>('participants');
    const base = await rooms.find({}).sort({ created_at: -1 }).toArray();
    const result: any[] = [];
    for (const r of base) {
      const qCount = await questions.countDocuments({ room_id: r.id });
      const participant_count = await participants.countDocuments({ room_id: r.id });
      const isPublic = !!r.is_public;
      const isPublished = !!r.is_published;
      const hasQuestions = qCount > 0;
      const waitingOrPublished = (String(r.status || '').toLowerCase() === 'waiting' || String(r.status || '').toLowerCase() === 'published');
      const privateOk = !isPublic && waitingOrPublished && !!r.start_time && hasQuestions;
      const publicOk = isPublic && isPublished && hasQuestions;
      if (publicOk || privateOk) {
        result.push({ ...r, participant_count });
      }
    }
    return result;
  }
  async getRoomsSnapshot(): Promise<any[]> {
    const rooms = await getCollection<any>('rooms');
    const pipeline: any[] = [
      {
        $lookup: {
          from: 'questions',
          let: { rid: '$id' },
          pipeline: [{ $match: { $expr: { $eq: ['$room_id', '$$rid'] } } }, { $count: 'total' }],
          as: 'qCount'
        }
      },
      {
        $lookup: {
          from: 'participants',
          let: { rid: '$id' },
          pipeline: [{ $match: { $expr: { $eq: ['$room_id', '$$rid'] } } }, { $count: 'total' }],
          as: 'pCount'
        }
      },
      {
        $addFields: {
          total_questions: { $ifNull: [{ $arrayElemAt: ['$qCount.total', 0] }, 0] },
          participant_count: { $ifNull: [{ $arrayElemAt: ['$pCount.total', 0] }, 0] }
        }
      },
      {
        $match: {
          $expr: {
            $and: [
              { $gt: ['$total_questions', 0] },
              {
                $or: [
                  { $and: [{ $eq: ['$is_public', 1] }, { $eq: [{ $ifNull: ['$is_published', 0] }, 1] }] },
                  { $and: [{ $eq: ['$is_public', 0] }, { $ne: ['$start_time', null] }] }
                ]
              }
            ]
          }
        }
      },
      {
        $project: {
          _id: 0,
          id: 1,
          title: 1,
          is_public: 1,
          status: 1,
          start_time: 1,
          time_per_question: 1,
          cover_photo_url: 1,
          total_questions: 1,
          participant_count: 1,
          is_published: { $ifNull: ['$is_published', 0] }
        }
      }
    ];
    return await rooms.aggregate(pipeline).toArray();
  }
  async getRecentPublicRooms(): Promise<any[]> {
    const col = await getCollection<any>('rooms');
    const participants = await getCollection<any>('participants');
    const rooms = await col.find({ is_public: 1, is_published: 1 }).sort({ published_at: -1, created_at: -1 }).limit(20).toArray();
    const result: any[] = [];
    for (const r of rooms) {
      const participant_count = await participants.countDocuments({ room_id: r.id });
      result.push({ ...r, participant_count });
    }
    return result;
  }
  async getAllPublicRooms(): Promise<any[]> {
    const col = await getCollection<any>('rooms');
    const participants = await getCollection<any>('participants');
    const rooms = await col.find({ is_public: 1, is_published: 1 }).sort({ published_at: -1, created_at: -1 }).toArray();
    const result: any[] = [];
    for (const r of rooms) {
      const participant_count = await participants.countDocuments({ room_id: r.id });
      result.push({ ...r, participant_count });
    }
    return result;
  }
  async getMyRooms(hostId: number): Promise<any[]> {
    const col = await getCollection<any>('rooms');
    const participants = await getCollection<any>('participants');
    const rooms = await col.find({ host_id: hostId }).sort({ created_at: -1 }).toArray();
    const result: any[] = [];
    for (const r of rooms) {
      const participant_count = await participants.countDocuments({ room_id: r.id });
      result.push({ ...r, participant_count });
    }
    return result;
  }
  async getParticipants(roomId: number): Promise<any[]> {
    const parts = await getCollection<any>('participants');
    const users = await getCollection<any>('users');
    const p = await parts.find({ room_id: roomId }).sort({ joined_at: -1 }).toArray();
    const result: any[] = [];
    for (const row of p) {
      const u = await users.findOne({ id: row.user_id }, { projection: { id: 1, username: 1 } });
      if (u) result.push({ id: u.id, username: u.username, joined_at: row.joined_at });
    }
    return result;
  }
  async getQuestionsCount(roomId: number): Promise<number> {
    const q = await getCollection<any>('questions');
    return await q.countDocuments({ room_id: roomId });
  }
  async getAnswersCount(roomId: number, userId: number): Promise<number> {
    const a = await getCollection<any>('answers');
    return await a.countDocuments({ room_id: roomId, user_id: userId });
  }
  async getParticipantScorePosition(roomId: number, userId: number): Promise<{ total_score: number; position: number | null }> {
    const parts = await getCollection<any>('participants');
    const me = await parts.findOne({ room_id: roomId, user_id: userId }, { projection: { total_score: 1, position: 1 } });
    const total_score = me ? Number(me.total_score) || 0 : 0;
    const position = me && me.position !== undefined ? Number(me.position) : null;
    return { total_score, position };
  }
  async createRoom(params: { roomCode: string; hostId: number; title: string; maxParticipants: number; timePerQuestion: number; isPublic: boolean; passwordHash: string | null; startTime: Date | null; coverPhotoUrl: string | null }): Promise<number> {
    const col = await getCollection<any>('rooms');
    const id = await nextId('rooms');
    await col.insertOne({
      id,
      room_code: params.roomCode,
      host_id: params.hostId,
      title: params.title,
      max_participants: params.maxParticipants,
      time_per_question: params.timePerQuestion,
      is_public: params.isPublic ? 1 : 0,
      password_hash: params.passwordHash,
      start_time: params.startTime || null,
      cover_photo_url: params.coverPhotoUrl || null,
      status: 'waiting',
      is_published: 0,
      created_at: new Date()
    });
    return id;
  }
  async updateRoom(id: number, fields: Partial<{ title: string; maxParticipants: number; timePerQuestion: number; isPublic: boolean; startTime: Date | null; coverPhotoUrl: string | null; status: string; is_published: number }>): Promise<void> {
    const col = await getCollection<any>('rooms');
    const set: any = {};
    if (fields.title !== undefined) set.title = fields.title;
    if (fields.maxParticipants !== undefined) set.max_participants = fields.maxParticipants;
    if (fields.timePerQuestion !== undefined) set.time_per_question = fields.timePerQuestion;
    if (fields.isPublic !== undefined) set.is_public = fields.isPublic ? 1 : 0;
    if (fields.startTime !== undefined) set.start_time = fields.startTime;
    if (fields.coverPhotoUrl !== undefined) set.cover_photo_url = fields.coverPhotoUrl;
    if (fields.status !== undefined) set.status = fields.status;
    if (fields.is_published !== undefined) set.is_published = fields.is_published;
    await col.updateOne({ id }, { $set: set });
  }
  async deleteRoom(id: number): Promise<void> {
    const col = await getCollection<any>('rooms');
    await col.deleteOne({ id });
  }
  async isUserParticipant(userId: number, roomId: number): Promise<boolean> {
    const parts = await getCollection<any>('participants');
    const row = await parts.findOne({ user_id: userId, room_id: roomId }, { projection: { _id: 1 } });
    return !!row;
  }
  async addParticipant(userId: number, roomId: number): Promise<void> {
    const parts = await getCollection<any>('participants');
    await parts.updateOne({ user_id: userId, room_id: roomId }, { $setOnInsert: { joined_at: new Date(), total_score: 0, position: null } }, { upsert: true });
  }
  async removeParticipant(userId: number, roomId: number): Promise<void> {
    const parts = await getCollection<any>('participants');
    await parts.deleteOne({ user_id: userId, room_id: roomId });
  }
}
