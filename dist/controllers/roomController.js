"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishRoom = exports.leaveRoom = exports.joinRoom = exports.deleteRoom = exports.updateRoom = exports.getRoomById = exports.getRoomInfoForUser = exports.getRoomParticipants = exports.getMyRooms = exports.getAllPublicRooms = exports.getRecentPublicRooms = exports.getRooms = exports.createRoom = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const index_js_1 = require("../container/index.js");
// Helper to generate a random room code (e.g., "AB12CD")
const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
const createRoom = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    const { title, maxParticipants, timePerQuestion, isPublic, password, startTime, coverPhotoUrl } = req.body;
    if (!title) {
        res.status(400).json({ success: false, message: 'Room title is required' });
        return;
    }
    // If room is private, password is required
    if (isPublic === false && !password) {
        res.status(400).json({ success: false, message: 'Password is required for private rooms' });
        return;
    }
    try {
        const svc = index_js_1.container.roomService;
        const created = await svc.createRoom({
            hostId: req.user.id,
            title,
            maxParticipants,
            timePerQuestion,
            isPublic,
            password: password || null,
            coverPhotoUrl
        });
        res.status(201).json({
            success: true,
            message: 'Room created successfully',
            room: {
                id: created.id,
                roomCode: created.roomCode,
                title,
                isPublic: isPublic !== undefined ? isPublic : true,
                startTime: null,
                coverPhotoUrl: coverPhotoUrl || null
            }
        });
    }
    catch (error) {
        console.error('Create Room Error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.createRoom = createRoom;
const getRooms = async (req, res) => {
    try {
        const rooms = await index_js_1.container.roomService.listRooms();
        res.json({ success: true, rooms });
    }
    catch (error) {
        console.error('Get Rooms Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getRooms = getRooms;
const getRecentPublicRooms = async (_req, res) => {
    try {
        const rooms = await index_js_1.container.roomService.listRecentPublicRooms();
        res.json({ success: true, rooms });
    }
    catch (error) {
        console.error('Get Recent Public Rooms Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getRecentPublicRooms = getRecentPublicRooms;
const getAllPublicRooms = async (_req, res) => {
    try {
        const rooms = await index_js_1.container.roomService.listAllPublicRooms();
        res.json({ success: true, rooms });
    }
    catch (error) {
        console.error('Get All Public Rooms Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getAllPublicRooms = getAllPublicRooms;
const getMyRooms = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    try {
        const rooms = await index_js_1.container.roomService.listMyRooms(req.user.id);
        res.json({ success: true, rooms });
    }
    catch (error) {
        console.error('Get My Rooms Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getMyRooms = getMyRooms;
const getRoomParticipants = async (req, res) => {
    const { id } = req.params;
    try {
        const participants = await index_js_1.container.roomService.getParticipants(Number(id));
        res.json({ success: true, participants });
    }
    catch (error) {
        console.error('Get Participants Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getRoomParticipants = getRoomParticipants;
const getRoomInfoForUser = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    const { id } = req.params;
    try {
        const info = await index_js_1.container.roomService.getRoomInfoForUser(Number(id), req.user.id);
        if (info.notFound) {
            res.status(404).json({ success: false, message: 'Room not found' });
            return;
        }
        res.json({ success: true, room: info.room, total: info.total, answered: info.answered, completed: info.completed, total_score: info.total_score, position: info.position });
    }
    catch (error) {
        console.error('Get Room Info Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getRoomInfoForUser = getRoomInfoForUser;
const getRoomById = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    const { id } = req.params;
    try {
        const result = await index_js_1.container.roomService.getRoomById(Number(id), req.user.id);
        if (result.notFound) {
            res.status(404).json({ success: false, message: 'Room not found' });
            return;
        }
        if (result.forbidden) {
            res.status(403).json({ success: false, message: 'Not authorized' });
            return;
        }
        res.json({ success: true, room: result.room });
    }
    catch (error) {
        console.error('Get Room By ID Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getRoomById = getRoomById;
const updateRoom = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    const { id } = req.params;
    const { title, maxParticipants, timePerQuestion, isPublic, password, startTime, coverPhotoUrl } = req.body;
    try {
        const fields = {
            title,
            maxParticipants,
            timePerQuestion,
            isPublic,
            startTime: startTime || null,
            coverPhotoUrl: coverPhotoUrl ?? null
        };
        if (password) {
            const salt = await bcrypt_1.default.genSalt(10);
            const passwordHash = await bcrypt_1.default.hash(password, salt);
            fields.password_hash = passwordHash; // will be ignored
        }
        const result = await index_js_1.container.roomService.updateRoom(Number(id), fields, req.user.id);
        if (result?.notFound) {
            res.status(404).json({ success: false, message: 'Room not found' });
            return;
        }
        if (result?.forbidden) {
            res.status(403).json({ success: false, message: 'Not authorized' });
            return;
        }
        res.json({ success: true, message: 'Room updated successfully' });
    }
    catch (error) {
        console.error('Update Room Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.updateRoom = updateRoom;
const deleteRoom = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    const { id } = req.params;
    try {
        const result = await index_js_1.container.roomService.deleteRoom(Number(id), req.user.id);
        if (result?.notFound) {
            res.status(404).json({ success: false, message: 'Room not found' });
            return;
        }
        if (result?.forbidden) {
            res.status(403).json({ success: false, message: 'Not authorized' });
            return;
        }
        res.json({ success: true, message: 'Room deleted successfully' });
    }
    catch (error) {
        console.error('Delete Room Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.deleteRoom = deleteRoom;
const joinRoom = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    const { id } = req.params;
    const { password } = req.body;
    try {
        const result = await index_js_1.container.roomService.joinRoom(Number(id), req.user.id, password);
        if (result.notFound) {
            res.status(404).json({ success: false, message: 'Room not found' });
            return;
        }
        if (result.passwordRequired) {
            res.status(400).json({ success: false, message: 'Password required' });
            return;
        }
        if (result.invalidPassword) {
            res.status(403).json({ success: false, message: 'Invalid password' });
            return;
        }
        res.json({ success: true, message: 'Joined successfully' });
    }
    catch (error) {
        console.error('Join Room Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.joinRoom = joinRoom;
const leaveRoom = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    const { id } = req.params;
    try {
        await index_js_1.container.roomService.leaveRoom(Number(id), req.user.id);
        res.json({ success: true, message: 'Left room successfully' });
    }
    catch (error) {
        console.error('Leave Room Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.leaveRoom = leaveRoom;
const publishRoom = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    const { id } = req.params;
    try {
        const result = await index_js_1.container.roomService.publishRoom(Number(id), req.user.id);
        if (result.notFound) {
            res.status(404).json({ success: false, message: 'Room not found' });
            return;
        }
        if (result.forbidden) {
            res.status(403).json({ success: false, message: 'Not authorized' });
            return;
        }
        if (result.badRequest) {
            res.status(400).json({ success: false, message: result.badRequest });
            return;
        }
        res.json({ success: true, message: 'Room published' });
    }
    catch (error) {
        console.error('Publish Room Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.publishRoom = publishRoom;
//# sourceMappingURL=roomController.js.map