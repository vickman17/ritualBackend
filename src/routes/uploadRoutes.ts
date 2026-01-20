import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { container } from '../container/index.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

const router = express.Router();

const memoryStorage = multer.memoryStorage();
const baseFolder = process.env.CLOUDINARY_FOLDER || 'ritualquiz';

// Keep local folders creation for backward compatibility if needed
const uploadRoot = path.resolve(__dirname, '../../uploads');
try { if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true }); } catch {}

const upload = multer({ storage: memoryStorage });

router.post('/question-image', authenticateToken, upload.single('image'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No image file uploaded' });
    return;
  }
  uploadToCloudinary(req.file.buffer, `${baseFolder}/questions`)
    .then(({ url }) => {
      res.json({ success: true, url });
    })
    .catch((err) => {
      res.status(500).json({ success: false, message: 'Upload failed', error: String(err) });
    });
});

const avatarUpload = multer({ storage: memoryStorage });

router.post('/avatar-image', authenticateToken, avatarUpload.single('image'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No image file uploaded' });
    return;
  }
  try {
    const { url } = await uploadToCloudinary(req.file.buffer, `${baseFolder}/avatars`);
    const userId = (req as any).user?.id;
    if (userId) {
      await container.userService.updateAvatar(Number(userId), url);
    }
    res.json({ success: true, url });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Upload failed', error: String(err) });
  }
});

const coverUpload = multer({ storage: memoryStorage });

router.post('/room-cover', authenticateToken, coverUpload.single('image'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No image file uploaded' });
    return;
  }
  uploadToCloudinary(req.file.buffer, `${baseFolder}/rooms_cover`)
    .then(({ url }) => {
      res.json({ success: true, url });
    })
    .catch((err) => {
      res.status(500).json({ success: false, message: 'Upload failed', error: String(err) });
    });
});

export default router;
