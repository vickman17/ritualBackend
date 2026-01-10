export interface IAnswerRepository {
  getCorrectAnswerIndex(questionId: number, roomId: number): Promise<number | null>;
  getRoomTiming(roomId: number): Promise<{ time_per_question: number; start_time: any; is_public: number } | null>;
  upsertAnswer(roomId: number, questionId: number, userId: number, selectedIndex: number, isCorrect: number, score: number): Promise<void>;
  updateParticipantTotal(roomId: number, userId: number): Promise<void>;
  recomputePositions(roomId: number): Promise<void>;
  getLeaderboard(roomId: number): Promise<any[]>;
  getGlobalLeaderboard(): Promise<any[]>;
  getMyAnswers(roomId: number, userId: number): Promise<any[]>;
  getQuestionCountsByRoomIds(roomIds: number[]): Promise<Array<{ room_id: number; total: number }>>;
  getAnswerCountsByRoomIds(userId: number, roomIds: number[]): Promise<Array<{ room_id: number; answered: number }>>;
}

