import bcrypt from 'bcrypt';
import { IRoomRepository } from '../repositories/interfaces/RoomRepository.js';

export class RoomService {
  constructor(private readonly rooms: IRoomRepository) {}

  async listRooms() { return await this.rooms.getRoomsList(); }
  async roomsSnapshot() { return await this.rooms.getRoomsSnapshot(); }
  async getRoomRaw(roomId: number) { return await this.rooms.getById(roomId); }
  async listRecentPublicRooms() { return await this.rooms.getRecentPublicRooms(); }
  async listAllPublicRooms() { return await this.rooms.getAllPublicRooms(); }
  async listMyRooms(hostId: number) { return await this.rooms.getMyRooms(hostId); }
  async getParticipants(roomId: number) { return await this.rooms.getParticipants(roomId); }

  async getRoomInfoForUser(roomId: number, userId: number) {
    const room = await this.rooms.getById(roomId);
    if (!room) return { notFound: true };
    const total = await this.rooms.getQuestionsCount(roomId);
    const answered = await this.rooms.getAnswersCount(roomId, userId);
    const { total_score, position } = await this.rooms.getParticipantScorePosition(roomId, userId);
    return { room, total, answered, completed: answered >= total, total_score, position };
  }

  async getRoomById(roomId: number, userId: number) {
    const room = await this.rooms.getById(roomId);
    if (!room) return { notFound: true };
    if (Number(room.host_id) !== userId) {
      const isParticipant = await this.rooms.isUserParticipant(userId, roomId);
      if (!isParticipant) return { forbidden: true };
    }
    return { room };
  }

  async createRoom(params: { hostId: number; title: string; maxParticipants?: number; timePerQuestion?: number; isPublic?: boolean; password?: string | null; coverPhotoUrl?: string | null }) {
    const roomCode = this.generateRoomCode();
    const passwordHash = params.password ? await bcrypt.hash(params.password, 10) : null;
    const id = await this.rooms.createRoom({
      roomCode,
      hostId: params.hostId,
      title: params.title,
      maxParticipants: params.maxParticipants ?? 50,
      timePerQuestion: params.timePerQuestion ?? 30,
      isPublic: params.isPublic ?? true,
      passwordHash,
      startTime: null,
      coverPhotoUrl: params.coverPhotoUrl ?? null
    });
    return { id, roomCode };
  }

  async updateRoom(id: number, fields: Partial<{ title: string; maxParticipants: number; timePerQuestion: number; isPublic: boolean; startTime: Date | null; coverPhotoUrl: string | null }>, userId: number) {
    const room = await this.rooms.getById(id);
    if (!room) return { notFound: true };
    if (Number(room.host_id) !== userId) return { forbidden: true };
    await this.rooms.updateRoom(id, fields);
    return {};
  }

  async deleteRoom(id: number, userId: number) {
    const room = await this.rooms.getById(id);
    if (!room) return { notFound: true };
    if (Number(room.host_id) !== userId) return { forbidden: true };
    await this.rooms.deleteRoom(id);
    return {};
  }

  async joinRoom(id: number, userId: number, password?: string) {
    const room = await this.rooms.getById(id);
    if (!room) return { notFound: true };
    if (!room.is_public) {
      if (!password) return { passwordRequired: true };
      const isMatch = await bcrypt.compare(password, room.password_hash);
      if (!isMatch) return { invalidPassword: true };
    }
    const isParticipant = await this.rooms.isUserParticipant(userId, id);
    if (!isParticipant) await this.rooms.addParticipant(userId, id);
    return {};
  }

  async publishRoom(id: number, userId: number) {
    const room = await this.rooms.getById(id);
    if (!room) return { notFound: true };
    if (Number(room.host_id) !== userId) return { forbidden: true };
    const total = await this.rooms.getQuestionsCount(id);
    if (total === 0) return { badRequest: 'Add questions before publishing' };
    if (room.is_public) {
      await this.rooms.updateRoom(id, { status: 'published', is_published: 1 });
    } else {
      await this.rooms.updateRoom(id, { status: 'waiting' });
    }
    return {};
  }
  async leaveRoom(roomId: number, userId: number) {
    await this.rooms.removeParticipant(userId, roomId);
    return {};
  }

  private generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
