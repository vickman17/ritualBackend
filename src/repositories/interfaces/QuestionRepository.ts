export interface IQuestionRepository {
  getMaxOrder(roomId: number): Promise<number>;
  addQuestion(roomId: number, text: string, options: string[], correctIndex: number, orderIndex: number, imageUrl?: string | null): Promise<number>;
  deleteQuestion(id: number): Promise<void>;
  getQuestions(roomId: number): Promise<any[]>;
  getRoomIdForQuestion(id: number): Promise<number | null>;
}
