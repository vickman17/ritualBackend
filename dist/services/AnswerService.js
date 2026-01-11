"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnswerService = void 0;
class AnswerService {
    constructor(answers) {
        this.answers = answers;
    }
    async submit(roomId, questionId, userId, selectedIndex, elapsedMs) {
        const correctIndex = await this.answers.getCorrectAnswerIndex(questionId, roomId);
        if (correctIndex === null)
            return { questionNotFound: true };
        const isCorrect = selectedIndex === correctIndex ? 1 : 0;
        const timing = await this.answers.getRoomTiming(roomId);
        if (!timing)
            return { roomNotFound: true };
        const tpq = Number(timing.time_per_question) || 30;
        const isPublic = !!timing.is_public;
        let timeLeft = tpq;
        if (isPublic) {
            const elapsedSeconds = Math.max(0, Math.floor((Number(elapsedMs || 0)) / 1000));
            timeLeft = Math.max(0, tpq - elapsedSeconds);
        }
        else {
            const rawStart = timing.start_time;
            let start = null;
            if (rawStart instanceof Date)
                start = rawStart;
            else if (rawStart)
                start = new Date(String(rawStart).replace(' ', 'T'));
            if (!start || isNaN(start.getTime())) {
                return { gameNotStarted: true };
            }
            const now = new Date();
            const elapsedSeconds = Math.max(0, (now.getTime() - start.getTime()) / 1000);
            timeLeft = Math.max(0, Math.ceil(tpq - (elapsedSeconds % tpq)));
        }
        const maxPoints = 100;
        const score = isCorrect ? Math.max(0, Math.round((timeLeft / tpq) * maxPoints)) : 0;
        await this.answers.upsertAnswer(roomId, questionId, userId, selectedIndex, isCorrect, score);
        await this.answers.updateParticipantTotal(roomId, userId);
        await this.answers.recomputePositions(roomId);
        return { isCorrect, score, timeLeft, timePerQuestion: tpq };
    }
    async leaderboard(roomId) {
        return await this.answers.getLeaderboard(roomId);
    }
    async globalLeaderboard() {
        const rows = await this.answers.getGlobalLeaderboard();
        return rows.map((r, idx) => ({
            user_id: r.user_id,
            username: r.username,
            score: Number(r.total_score) || 0,
            correct: Number(r.correct) || 0,
            answered: Number(r.answered) || 0,
            rooms: Number(r.rooms) || 0,
            position: idx + 1,
        }));
    }
    async globalLeaderboardSnapshot() {
        const rows = await this.answers.getGlobalLeaderboard();
        return rows.map((r, idx) => ({
            userId: r.user_id,
            username: r.username,
            avatarUrl: r.avatar_url || '',
            score: Number(r.total_score) || 0,
            correct: Number(r.correct) || 0,
            answered: Number(r.answered) || 0,
            rooms: Number(r.rooms) || 0,
            position: idx + 1,
        }));
    }
    async myAnswers(roomId, userId) {
        return await this.answers.getMyAnswers(roomId, userId);
    }
    async myStatus(userId, roomIds) {
        const qCounts = await this.answers.getQuestionCountsByRoomIds(roomIds);
        const aCounts = await this.answers.getAnswerCountsByRoomIds(userId, roomIds);
        const qMap = new Map();
        for (const r of qCounts)
            qMap.set(Number(r.room_id), Number(r.total));
        const aMap = new Map();
        for (const r of aCounts)
            aMap.set(Number(r.room_id), Number(r.answered));
        return roomIds.map((rid) => {
            const total = qMap.get(rid) || 0;
            const answered = aMap.get(rid) || 0;
            return { roomId: rid, participated: answered > 0, completed: answered >= total && total > 0 };
        });
    }
}
exports.AnswerService = AnswerService;
//# sourceMappingURL=AnswerService.js.map