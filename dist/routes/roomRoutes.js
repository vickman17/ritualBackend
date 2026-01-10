"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const roomController_js_1 = require("../controllers/roomController.js");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const router = express_1.default.Router();
// Public routes (or semi-protected) - register BEFORE parameterized routes
router.get('/', roomController_js_1.getRooms);
router.get('/public', roomController_js_1.getAllPublicRooms);
router.get('/public-recent', roomController_js_1.getRecentPublicRooms);
// Protected routes (require login)
router.post('/create', authMiddleware_js_1.authenticateToken, roomController_js_1.createRoom);
router.post('/join/:id', authMiddleware_js_1.authenticateToken, roomController_js_1.joinRoom);
router.post('/leave/:id', authMiddleware_js_1.authenticateToken, roomController_js_1.leaveRoom);
router.post('/publish/:id', authMiddleware_js_1.authenticateToken, roomController_js_1.publishRoom);
router.get('/my-rooms', authMiddleware_js_1.authenticateToken, roomController_js_1.getMyRooms);
router.get('/:id/participants', authMiddleware_js_1.authenticateToken, roomController_js_1.getRoomParticipants);
router.get('/:id/info', authMiddleware_js_1.authenticateToken, roomController_js_1.getRoomInfoForUser);
router.get('/:id', authMiddleware_js_1.authenticateToken, roomController_js_1.getRoomById);
router.put('/:id', authMiddleware_js_1.authenticateToken, roomController_js_1.updateRoom);
router.delete('/:id', authMiddleware_js_1.authenticateToken, roomController_js_1.deleteRoom);
exports.default = router;
