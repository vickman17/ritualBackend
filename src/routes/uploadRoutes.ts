import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { container } from '../container/index.js';

const router = express.Router();

const uploadRoot = path.resolve(__dirname, '../../uploads');
const questionDir = path.join(uploadRoot, 'questions');
const avatarDir = path.join(uploadRoot, 'avatars');
const coverDir = path.join(uploadRoot, 'rooms_cover');
try { if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true }); } catch {}
try { if (!fs.existsSync(questionDir)) fs.mkdirSync(questionDir, { recursive: true }); } catch {}
try { if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true }); } catch {}
try { if (!fs.existsSync(coverDir)) fs.mkdirSync(coverDir, { recursive: true }); } catch {}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, questionDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '') || '.png';
    cb(null, `q-${unique}${ext}`);
  }
});

const upload = multer({ storage });

router.post('/question-image', authenticateToken, upload.single('image'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No image file uploaded' });
    return;
  }
  const urlPath = `/uploads/questions/${req.file.filename}`;
  res.json({ success: true, url: urlPath });
});

// Avatar upload
const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '') || '.png';
    cb(null, `avatar-${unique}${ext}`);
  }
});
const avatarUpload = multer({ storage: avatarStorage });

router.post('/avatar-image', authenticateToken, avatarUpload.single('image'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No image file uploaded' });
    return;
  }
  const urlPath = `/uploads/avatars/${req.file.filename}`;
  // Optionally update user avatar_url
  try {
    const userId = (req as any).user?.id;
    if (userId) {
      await container.userService.updateAvatar(Number(userId), urlPath);
    }
  } catch {}
  res.json({ success: true, url: urlPath });
});

// Room cover upload
const coverStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, coverDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '') || '.png';
    cb(null, `cover-${unique}${ext}`);
  }
});
const coverUpload = multer({ storage: coverStorage });

router.post('/room-cover', authenticateToken, coverUpload.single('image'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No image file uploaded' });
    return;
  }
  const urlPath = `/uploads/rooms_cover/${req.file.filename}`;
  res.json({ success: true, url: urlPath });
});

export default router;
