import { type Response } from 'express';
import { container } from '../container/index.js';
import { type AuthRequest } from '../middleware/authMiddleware.js';
import fs from 'fs';
import path from 'path';

export const updateMyAvatar = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  const { avatarUrl } = req.body as { avatarUrl?: string };
  if (!avatarUrl || typeof avatarUrl !== 'string') {
    res.status(400).json({ success: false, message: 'avatarUrl is required' });
    return;
  }
  try {
    await container.userService.updateAvatar(req.user.id, avatarUrl);
    res.json({ success: true });
  } catch (e: any) {
    console.error('updateMyAvatar error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getMyRecentPlayed = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  try {
    const items = await container.userService.getMyRecentPlayed(req.user.id);
    res.json({ success: true, recent: items });
  } catch (e: any) {
    console.error('getMyRecentPlayed error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getMyScore = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  try {
    const summary = await container.userService.getMyScore(req.user.id);
    res.json({ success: true, total_score: summary.total_score, correct: summary.correct, answered: summary.answered });
  } catch (e: any) {
    console.error('getMyScore error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
