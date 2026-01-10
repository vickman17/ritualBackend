import { type Request, type Response } from 'express';
import { container } from '../container/index.js';
import { type AuthRequest } from '../middleware/authMiddleware.js';

export const addQuestion = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const { roomId } = req.params;
  const { questionText, options, correctAnswerIndex, imageUrl } = req.body;

  if (!questionText || !options || correctAnswerIndex === undefined) {
    res.status(400).json({ success: false, message: 'Missing required fields' });
    return;
  }

  try {
    const svc = container.questionService;
    const userId = (req.user as any).id as number;
    const result = await svc.addQuestion(Number(roomId), userId, String(questionText), options as string[], Number(correctAnswerIndex), imageUrl);
    if (result.notFound) {
      res.status(404).json({ success: false, message: 'Room not found' });
      return;
    }
    if (result.forbidden) {
      res.status(403).json({ success: false, message: 'Not authorized to edit this room' });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Question added',
      question: {
        id: result.id,
        questionText,
        options,
        correctAnswerIndex,
        orderIndex: undefined,
        imageUrl: imageUrl || null
      }
    });

  } catch (error: any) {
    console.error('Add Question Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteQuestion = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const { id } = req.params;

  try {
    const svc = container.questionService;
    const resDel = await svc.deleteQuestionByIdWithOwnership(Number(id), (req.user as any).id as number);
    if (resDel.notFound) {
      res.status(404).json({ success: false, message: 'Question not found' });
      return;
    }
    if (resDel.forbidden) {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }

    res.json({ success: true, message: 'Question deleted' });

  } catch (error: any) {
    console.error('Delete Question Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getQuestions = async (req: AuthRequest, res: Response) => {
  const { roomId } = req.params;

  try {
    const svc = container.questionService;
    const questions = await svc.getQuestions(Number(roomId));
    const parsedQuestions = questions.map((q: any) => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
    }));
    res.json({ success: true, questions: parsedQuestions });
  } catch (error: any) {
    console.error('Get Questions Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
