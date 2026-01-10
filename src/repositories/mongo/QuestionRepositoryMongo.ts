import { getCollection, nextId } from '../../config/mongo.js';
import { IQuestionRepository } from '../interfaces/QuestionRepository.js';

export class QuestionRepositoryMongo implements IQuestionRepository {
  async getMaxOrder(roomId: number): Promise<number> {
    const col = await getCollection<any>('questions');
    const doc = await col.find({ room_id: roomId }).sort({ order_index: -1 }).limit(1).toArray();
    const top = doc[0];
    return top ? Number(top.order_index) || 0 : 0;
  }
  async addQuestion(roomId: number, text: string, options: string[], correctIndex: number, orderIndex: number, imageUrl?: string | null): Promise<number> {
    const col = await getCollection<any>('questions');
    const id = await nextId('questions');
    await col.insertOne({
      id,
      room_id: roomId,
      question_text: text,
      options: JSON.stringify(options),
      correct_answer_index: correctIndex,
      order_index: orderIndex,
      image_url: imageUrl || null
    });
    return id;
  }
  async deleteQuestion(id: number): Promise<void> {
    const col = await getCollection<any>('questions');
    await col.deleteOne({ id });
  }
  async getQuestions(roomId: number): Promise<any[]> {
    const col = await getCollection<any>('questions');
    return await col.find({ room_id: roomId }).sort({ order_index: 1 }).toArray();
  }
  async getRoomIdForQuestion(id: number): Promise<number | null> {
    const col = await getCollection<any>('questions');
    const q = await col.findOne({ id }, { projection: { room_id: 1 } });
    return q ? Number(q.room_id) : null;
  }
}

