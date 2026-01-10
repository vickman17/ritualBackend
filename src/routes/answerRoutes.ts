import express from 'express';
import { authenticateToken, type AuthRequest } from '../middleware/authMiddleware.js';
import { container } from '../container/index.js';

const router = express.Router();

router.post('/submit', authenticateToken, async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const { roomId, questionId, selectedIndex } = req.body || {};
  if (roomId === undefined || questionId === undefined || selectedIndex === undefined) {
    res.status(400).json({ success: false, message: 'Missing fields' });
    return;
  }

  try {
    const qId = Number(questionId);
    const rId = Number(roomId);
    const sel = Number(selectedIndex);
    if (Number.isNaN(qId) || Number.isNaN(rId) || Number.isNaN(sel)) {
      res.status(400).json({ success: false, message: 'Invalid numeric fields' });
      return;
    }

    const result = await container.answerService.submit(rId, qId, (req.user as any).id, sel, Number(req.body?.elapsedMs || 0));
    if (result.questionNotFound) {
      res.status(404).json({ success: false, message: 'Question not found' });
      return;
    }
    if (result.roomNotFound) {
      res.status(404).json({ success: false, message: 'Room not found' });
      return;
    }
    if (result.gameNotStarted) {
      res.status(400).json({ success: false, message: 'Game not started' });
      return;
    }
    res.json({ success: true, isCorrect: result.isCorrect, score: result.score, timeLeft: result.timeLeft, timePerQuestion: result.timePerQuestion });
  } catch (e: any) {
    console.error('Submit answer error:', e);
    res.status(500).json({ success: false, message: 'Server error', error: e?.message });
  }
});

router.get('/leaderboard/:roomId', authenticateToken, async (req: AuthRequest, res) => {
  const { roomId } = req.params;
  try {
    const rows = await container.answerService.leaderboard(Number(roomId));
    res.json({ success: true, leaderboard: rows });
  } catch (e: any) {
    console.error('Leaderboard error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/leaderboard-global', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const leaderboard = await container.answerService.globalLeaderboard();
    res.json({ success: true, leaderboard });
  } catch (e: any) {
    console.error('Global leaderboard error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/my/:roomId', authenticateToken, async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  const { roomId } = req.params;
  try {
    const rows = await container.answerService.myAnswers(Number(roomId), (req.user as any).id as number);
    res.json({ success: true, answers: rows });
  } catch (e: any) {
    console.error('Get my answers error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/my-status', authenticateToken, async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  try {
    const roomIds = Array.isArray(req.body?.roomIds) ? req.body.roomIds.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n)) : [];
    if (roomIds.length === 0) {
      res.json({ success: true, status: [] });
      return;
    }
    const status = await container.answerService.myStatus((req.user as any).id as number, roomIds);
    res.json({ success: true, status });
  } catch (e: any) {
    console.error('my-status error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
