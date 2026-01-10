import express from 'express';
import { addQuestion, deleteQuestion, getQuestions } from '../controllers/questionController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get questions for a room
router.get('/room/:roomId', authenticateToken, getQuestions);

// Add question to a room
router.post('/room/:roomId', authenticateToken, addQuestion);

// Delete a question
router.delete('/:id', authenticateToken, deleteQuestion);

export default router;
