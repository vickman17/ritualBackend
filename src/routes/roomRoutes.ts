import express from 'express';
import { createRoom, getRooms, getMyRooms, getRoomById, updateRoom, deleteRoom, joinRoom, leaveRoom, getRoomParticipants, getRoomInfoForUser, publishRoom, getRecentPublicRooms, getAllPublicRooms } from '../controllers/roomController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes (or semi-protected) - register BEFORE parameterized routes
router.get('/', getRooms);
router.get('/public', getAllPublicRooms);
router.get('/public-recent', getRecentPublicRooms);

// Protected routes (require login)
router.post('/create', authenticateToken, createRoom);
router.post('/join/:id', authenticateToken, joinRoom);
router.post('/leave/:id', authenticateToken, leaveRoom);
router.post('/publish/:id', authenticateToken, publishRoom);
router.get('/my-rooms', authenticateToken, getMyRooms);
router.get('/:id/participants', authenticateToken, getRoomParticipants);
router.get('/:id/info', authenticateToken, getRoomInfoForUser);
router.get('/:id', authenticateToken, getRoomById);
router.put('/:id', authenticateToken, updateRoom);
router.delete('/:id', authenticateToken, deleteRoom);

export default router;
