"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyScore = exports.getMyRecentPlayed = exports.updateMyAvatar = void 0;
const index_js_1 = require("../container/index.js");
const updateMyAvatar = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    const { avatarUrl } = req.body;
    if (!avatarUrl || typeof avatarUrl !== 'string') {
        res.status(400).json({ success: false, message: 'avatarUrl is required' });
        return;
    }
    try {
        await index_js_1.container.userService.updateAvatar(req.user.id, avatarUrl);
        res.json({ success: true });
    }
    catch (e) {
        console.error('updateMyAvatar error:', e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.updateMyAvatar = updateMyAvatar;
const getMyRecentPlayed = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    try {
        const items = await index_js_1.container.userService.getMyRecentPlayed(req.user.id);
        res.json({ success: true, recent: items });
    }
    catch (e) {
        console.error('getMyRecentPlayed error:', e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getMyRecentPlayed = getMyRecentPlayed;
const getMyScore = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    try {
        const summary = await index_js_1.container.userService.getMyScore(req.user.id);
        res.json({ success: true, total_score: summary.total_score, correct: summary.correct, answered: summary.answered });
    }
    catch (e) {
        console.error('getMyScore error:', e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getMyScore = getMyScore;
//# sourceMappingURL=userController.js.map