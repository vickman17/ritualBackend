"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
class RoomService {
    constructor(rooms) {
        this.rooms = rooms;
    }
    async listRooms() { return await this.rooms.getRoomsList(); }
    async roomsSnapshot() { return await this.rooms.getRoomsSnapshot(); }
    async getRoomRaw(roomId) { return await this.rooms.getById(roomId); }
    async listRecentPublicRooms() { return await this.rooms.getRecentPublicRooms(); }
    async listAllPublicRooms() { return await this.rooms.getAllPublicRooms(); }
    async listMyRooms(hostId) { return await this.rooms.getMyRooms(hostId); }
    async getParticipants(roomId) { return await this.rooms.getParticipants(roomId); }
    async getRoomInfoForUser(roomId, userId) {
        const room = await this.rooms.getById(roomId);
        if (!room)
            return { notFound: true };
        const total = await this.rooms.getQuestionsCount(roomId);
        const answered = await this.rooms.getAnswersCount(roomId, userId);
        const { total_score, position } = await this.rooms.getParticipantScorePosition(roomId, userId);
        return { room, total, answered, completed: answered >= total, total_score, position };
    }
    async getRoomById(roomId, userId) {
        const room = await this.rooms.getById(roomId);
        if (!room)
            return { notFound: true };
        if (Number(room.host_id) !== userId) {
            const isParticipant = await this.rooms.isUserParticipant(userId, roomId);
            if (!isParticipant)
                return { forbidden: true };
        }
        return { room };
    }
    async createRoom(params) {
        const roomCode = this.generateRoomCode();
        const passwordHash = params.password ? await bcrypt_1.default.hash(params.password, 10) : null;
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
    async updateRoom(id, fields, userId) {
        const room = await this.rooms.getById(id);
        if (!room)
            return { notFound: true };
        if (Number(room.host_id) !== userId)
            return { forbidden: true };
        await this.rooms.updateRoom(id, fields);
        return {};
    }
    async deleteRoom(id, userId) {
        const room = await this.rooms.getById(id);
        if (!room)
            return { notFound: true };
        if (Number(room.host_id) !== userId)
            return { forbidden: true };
        await this.rooms.deleteRoom(id);
        return {};
    }
    async joinRoom(id, userId, password) {
        const room = await this.rooms.getById(id);
        if (!room)
            return { notFound: true };
        if (!room.is_public) {
            if (!password)
                return { passwordRequired: true };
            const isMatch = await bcrypt_1.default.compare(password, room.password_hash);
            if (!isMatch)
                return { invalidPassword: true };
        }
        const isParticipant = await this.rooms.isUserParticipant(userId, id);
        if (!isParticipant)
            await this.rooms.addParticipant(userId, id);
        return {};
    }
    async publishRoom(id, userId) {
        const room = await this.rooms.getById(id);
        if (!room)
            return { notFound: true };
        if (Number(room.host_id) !== userId)
            return { forbidden: true };
        const total = await this.rooms.getQuestionsCount(id);
        if (total === 0)
            return { badRequest: 'Add questions before publishing' };
        if (room.is_public) {
            await this.rooms.updateRoom(id, { status: 'published', is_published: 1 });
        }
        else {
            await this.rooms.updateRoom(id, { status: 'waiting' });
        }
        return {};
    }
    async leaveRoom(roomId, userId) {
        await this.rooms.removeParticipant(userId, roomId);
        return {};
    }
    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}
exports.RoomService = RoomService;
//# sourceMappingURL=RoomService.js.map