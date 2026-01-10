import { getCollection, nextId } from '../../config/mongo.js';
import { IUserRepository } from '../interfaces/UserRepository.js';

export class UserRepositoryMongo implements IUserRepository {
  async findByEmailOrUsername(email: string, username: string): Promise<any[]> {
    const col = await getCollection<any>('users');
    return await col.find({ $or: [{ email }, { username }] }).toArray();
  }
  async findByEmail(email: string): Promise<any[]> {
    const col = await getCollection<any>('users');
    return await col.find({ email }).toArray();
  }
  async findByDiscordId(discordId: string): Promise<any[]> {
    const col = await getCollection<any>('users');
    return await col.find({ discord_id: discordId }).toArray();
  }
  async findIdByEmail(email: string): Promise<number | null> {
    const col = await getCollection<any>('users');
    const doc = await col.findOne({ email }, { projection: { id: 1 } });
    return doc ? Number(doc.id) : null;
  }
  async createUser(username: string, email: string, passwordHash: string, role: string, avatarUrl: string): Promise<number> {
    const col = await getCollection<any>('users');
    const id = await nextId('users');
    await col.insertOne({ id, username, email, password_hash: passwordHash, role, avatar_url: avatarUrl || '' });
    return id;
  }
  async updateAvatar(userId: number, avatarUrl: string): Promise<void> {
    const col = await getCollection<any>('users');
    await col.updateOne({ id: userId }, { $set: { avatar_url: avatarUrl } }, { upsert: false });
  }
  async getScoreSummary(userId: number): Promise<{ total_score: number; correct: number; answered: number }> {
    const answers = await getCollection<any>('answers');
    const agg = await answers.aggregate([
      { $match: { user_id: userId } },
      {
        $group: {
          _id: null,
          total_score: { $sum: { $ifNull: ['$score', 0] } },
          correct: { $sum: { $ifNull: ['$is_correct', 0] } },
          answered: { $sum: 1 }
        }
      }
    ]).toArray();
    const r = agg[0] || { total_score: 0, correct: 0, answered: 0 };
    return { total_score: Number(r.total_score) || 0, correct: Number(r.correct) || 0, answered: Number(r.answered) || 0 };
  }
  async getRecentPlayed(userId: number): Promise<Array<{ id: number; title: string; room_code: string; last_played: any; answered: number; total_score: number }>> {
    const answers = await getCollection<any>('answers');
    const rooms = await getCollection<any>('rooms');
    const agg = await answers.aggregate([
      { $match: { user_id: userId } },
      {
        $group: {
          _id: '$room_id',
          last_played: { $max: '$created_at' },
          answered: { $sum: 1 },
          total_score: { $sum: { $ifNull: ['$score', 0] } }
        }
      },
      { $sort: { last_played: -1 } },
      { $limit: 10 }
    ]).toArray();
    const result: Array<{ id: number; title: string; room_code: string; last_played: any; answered: number; total_score: number }> = [];
    for (const row of agg) {
      const rid = Number(row._id);
      const r = await rooms.findOne({ id: rid }, { projection: { id: 1, title: 1, room_code: 1 } });
      if (r) {
        result.push({
          id: Number(r.id),
          title: r.title,
          room_code: r.room_code,
          last_played: row.last_played,
          answered: Number(row.answered) || 0,
          total_score: Number(row.total_score) || 0
        });
      }
    }
    return result;
  }
  async linkDiscord(userId: number, discordId: string, avatarUrl: string | null, username: string): Promise<void> {
    const col = await getCollection<any>('users');
    await col.updateOne({ id: userId }, { $set: { discord_id: discordId, avatar_url: avatarUrl, username } });
  }
  async createDiscordUser(username: string, email: string, avatarUrl: string | null): Promise<number> {
    const col = await getCollection<any>('users');
    const id = await nextId('users');
    await col.insertOne({ id, username, email, password_hash: '', role: 'participant', discord_id: '', avatar_url: avatarUrl });
    return id;
  }
}

