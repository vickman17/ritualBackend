export interface IRoomRepository {
  getById(id: number): Promise<any | null>;
  getRoomsList(): Promise<any[]>;
  getRoomsSnapshot(): Promise<any[]>;
  getRecentPublicRooms(): Promise<any[]>;
  getAllPublicRooms(): Promise<any[]>;
  getMyRooms(hostId: number): Promise<any[]>;
  getParticipants(roomId: number): Promise<any[]>;
  getQuestionsCount(roomId: number): Promise<number>;
  getAnswersCount(roomId: number, userId: number): Promise<number>;
  getParticipantScorePosition(roomId: number, userId: number): Promise<{ total_score: number; position: number | null }>;
  createRoom(params: { roomCode: string; hostId: number; title: string; maxParticipants: number; timePerQuestion: number; isPublic: boolean; passwordHash: string | null; startTime: Date | null; coverPhotoUrl: string | null }): Promise<number>;
  updateRoom(id: number, fields: Partial<{ title: string; maxParticipants: number; timePerQuestion: number; isPublic: boolean; startTime: Date | null; coverPhotoUrl: string | null; status: string; is_published: number }>): Promise<void>;
  deleteRoom(id: number): Promise<void>;
  isUserParticipant(userId: number, roomId: number): Promise<boolean>;
  addParticipant(userId: number, roomId: number): Promise<void>;
  removeParticipant(userId: number, roomId: number): Promise<void>;
}
