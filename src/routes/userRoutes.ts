import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { updateMyAvatar, getMyScore, getMyRecentPlayed } from '../controllers/userController.js';

const router = express.Router();

router.patch('/me/avatar', authenticateToken, updateMyAvatar);
router.get('/me/score', authenticateToken, getMyScore);
router.get('/me/recent-played', authenticateToken, getMyRecentPlayed);

export default router;
