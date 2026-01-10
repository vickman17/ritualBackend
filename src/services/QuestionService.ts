import { IQuestionRepository } from '../repositories/interfaces/QuestionRepository.js';
import { IRoomRepository } from '../repositories/interfaces/RoomRepository.js';

export class QuestionService {
  constructor(private readonly questions: IQuestionRepository, private readonly rooms: IRoomRepository) {}

  async addQuestion(roomId: number, userId: number, text: string, options: string[], correctIndex: number, imageUrl?: string | null) {
    const room = await this.rooms.getById(roomId);
    if (!room) return { notFound: true };
    const hostId = Number(room.host_id);
    if (hostId !== userId) return { forbidden: true };
    const nextOrder = (await this.questions.getMaxOrder(roomId)) + 1;
    const id = await this.questions.addQuestion(roomId, text, options, correctIndex, nextOrder, imageUrl);
    return { id };
  }

  async getQuestions(roomId: number) {
    return await this.questions.getQuestions(roomId);
  }

  async deleteQuestion(id: number, userId: number, roomId: number) {
    const room = await this.rooms.getById(roomId);
    if (!room) return { notFound: true };
    const hostId = Number(room.host_id);
    if (hostId !== userId) return { forbidden: true };
    await this.questions.deleteQuestion(id);
    return {};
  }
  async deleteQuestionByIdWithOwnership(id: number, userId: number) {
    const roomId = await this.questions.getRoomIdForQuestion(id);
    if (!roomId) return { notFound: true };
    const room = await this.rooms.getById(roomId);
    if (!room) return { notFound: true };
    const hostId = Number(room.host_id);
    if (hostId !== userId) return { forbidden: true };
    await this.questions.deleteQuestion(id);
    return {};
  }
}
