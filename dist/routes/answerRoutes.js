"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const index_js_1 = require("../container/index.js");
const router = express_1.default.Router();
router.post('/submit', authMiddleware_js_1.authenticateToken, async (req, res) => {
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
        const result = await index_js_1.container.answerService.submit(rId, qId, req.user.id, sel, Number(req.body?.elapsedMs || 0));
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
    }
    catch (e) {
        console.error('Submit answer error:', e);
        res.status(500).json({ success: false, message: 'Server error', error: e?.message });
    }
});
router.get('/leaderboard/:roomId', authMiddleware_js_1.authenticateToken, async (req, res) => {
    const { roomId } = req.params;
    try {
        const rows = await index_js_1.container.answerService.leaderboard(Number(roomId));
        res.json({ success: true, leaderboard: rows });
    }
    catch (e) {
        console.error('Leaderboard error:', e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
router.get('/leaderboard-global', authMiddleware_js_1.authenticateToken, async (req, res) => {
    try {
        const leaderboard = await index_js_1.container.answerService.globalLeaderboard();
        res.json({ success: true, leaderboard });
    }
    catch (e) {
        console.error('Global leaderboard error:', e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
router.get('/my/:roomId', authMiddleware_js_1.authenticateToken, async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    const { roomId } = req.params;
    try {
        const rows = await index_js_1.container.answerService.myAnswers(Number(roomId), req.user.id);
        res.json({ success: true, answers: rows });
    }
    catch (e) {
        console.error('Get my answers error:', e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
router.post('/my-status', authMiddleware_js_1.authenticateToken, async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    try {
        const roomIds = Array.isArray(req.body?.roomIds) ? req.body.roomIds.map((n) => Number(n)).filter((n) => Number.isFinite(n)) : [];
        if (roomIds.length === 0) {
            res.json({ success: true, status: [] });
            return;
        }
        const status = await index_js_1.container.answerService.myStatus(req.user.id, roomIds);
        res.json({ success: true, status });
    }
    catch (e) {
        console.error('my-status error:', e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=answerRoutes.js.map