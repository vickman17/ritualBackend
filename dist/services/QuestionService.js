"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionService = void 0;
class QuestionService {
    constructor(questions, rooms) {
        this.questions = questions;
        this.rooms = rooms;
    }
    async addQuestion(roomId, userId, text, options, correctIndex, imageUrl) {
        const room = await this.rooms.getById(roomId);
        if (!room)
            return { notFound: true };
        const hostId = Number(room.host_id);
        if (hostId !== userId)
            return { forbidden: true };
        const nextOrder = (await this.questions.getMaxOrder(roomId)) + 1;
        const id = await this.questions.addQuestion(roomId, text, options, correctIndex, nextOrder, imageUrl);
        return { id };
    }
    async getQuestions(roomId) {
        return await this.questions.getQuestions(roomId);
    }
    async deleteQuestion(id, userId, roomId) {
        const room = await this.rooms.getById(roomId);
        if (!room)
            return { notFound: true };
        const hostId = Number(room.host_id);
        if (hostId !== userId)
            return { forbidden: true };
        await this.questions.deleteQuestion(id);
        return {};
    }
    async deleteQuestionByIdWithOwnership(id, userId) {
        const roomId = await this.questions.getRoomIdForQuestion(id);
        if (!roomId)
            return { notFound: true };
        const room = await this.rooms.getById(roomId);
        if (!room)
            return { notFound: true };
        const hostId = Number(room.host_id);
        if (hostId !== userId)
            return { forbidden: true };
        await this.questions.deleteQuestion(id);
        return {};
    }
}
exports.QuestionService = QuestionService;
//# sourceMappingURL=QuestionService.js.map