"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const index_js_1 = require("../container/index.js");
const router = express_1.default.Router();
const uploadRoot = path_1.default.resolve(__dirname, '../../uploads');
const questionDir = path_1.default.join(uploadRoot, 'questions');
const avatarDir = path_1.default.join(uploadRoot, 'avatars');
const coverDir = path_1.default.join(uploadRoot, 'rooms_cover');
try {
    if (!fs_1.default.existsSync(uploadRoot))
        fs_1.default.mkdirSync(uploadRoot, { recursive: true });
}
catch { }
try {
    if (!fs_1.default.existsSync(questionDir))
        fs_1.default.mkdirSync(questionDir, { recursive: true });
}
catch { }
try {
    if (!fs_1.default.existsSync(avatarDir))
        fs_1.default.mkdirSync(avatarDir, { recursive: true });
}
catch { }
try {
    if (!fs_1.default.existsSync(coverDir))
        fs_1.default.mkdirSync(coverDir, { recursive: true });
}
catch { }
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, questionDir),
    filename: (_req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname || '') || '.png';
        cb(null, `q-${unique}${ext}`);
    }
});
const upload = (0, multer_1.default)({ storage });
router.post('/question-image', authMiddleware_js_1.authenticateToken, upload.single('image'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ success: false, message: 'No image file uploaded' });
        return;
    }
    const urlPath = `/uploads/questions/${req.file.filename}`;
    res.json({ success: true, url: urlPath });
});
// Avatar upload
const avatarStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, avatarDir),
    filename: (_req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname || '') || '.png';
        cb(null, `avatar-${unique}${ext}`);
    }
});
const avatarUpload = (0, multer_1.default)({ storage: avatarStorage });
router.post('/avatar-image', authMiddleware_js_1.authenticateToken, avatarUpload.single('image'), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ success: false, message: 'No image file uploaded' });
        return;
    }
    const urlPath = `/uploads/avatars/${req.file.filename}`;
    // Optionally update user avatar_url
    try {
        const userId = req.user?.id;
        if (userId) {
            await index_js_1.container.userService.updateAvatar(Number(userId), urlPath);
        }
    }
    catch { }
    res.json({ success: true, url: urlPath });
});
// Room cover upload
const coverStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, coverDir),
    filename: (_req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname || '') || '.png';
        cb(null, `cover-${unique}${ext}`);
    }
});
const coverUpload = (0, multer_1.default)({ storage: coverStorage });
router.post('/room-cover', authMiddleware_js_1.authenticateToken, coverUpload.single('image'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ success: false, message: 'No image file uploaded' });
        return;
    }
    const urlPath = `/uploads/rooms_cover/${req.file.filename}`;
    res.json({ success: true, url: urlPath });
});
exports.default = router;
