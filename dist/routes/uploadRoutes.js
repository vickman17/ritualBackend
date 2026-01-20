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
const cloudinary_js_1 = require("../config/cloudinary.js");
const router = express_1.default.Router();
const memoryStorage = multer_1.default.memoryStorage();
const baseFolder = process.env.CLOUDINARY_FOLDER || 'ritualquiz';
// Keep local folders creation for backward compatibility if needed
const uploadRoot = path_1.default.resolve(__dirname, '../../uploads');
try {
    if (!fs_1.default.existsSync(uploadRoot))
        fs_1.default.mkdirSync(uploadRoot, { recursive: true });
}
catch { }
const upload = (0, multer_1.default)({ storage: memoryStorage });
router.post('/question-image', authMiddleware_js_1.authenticateToken, upload.single('image'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ success: false, message: 'No image file uploaded' });
        return;
    }
    (0, cloudinary_js_1.uploadToCloudinary)(req.file.buffer, `${baseFolder}/questions`)
        .then(({ url }) => {
        res.json({ success: true, url });
    })
        .catch((err) => {
        res.status(500).json({ success: false, message: 'Upload failed', error: String(err) });
    });
});
const avatarUpload = (0, multer_1.default)({ storage: memoryStorage });
router.post('/avatar-image', authMiddleware_js_1.authenticateToken, avatarUpload.single('image'), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ success: false, message: 'No image file uploaded' });
        return;
    }
    try {
        const { url } = await (0, cloudinary_js_1.uploadToCloudinary)(req.file.buffer, `${baseFolder}/avatars`);
        const userId = req.user?.id;
        if (userId) {
            await index_js_1.container.userService.updateAvatar(Number(userId), url);
        }
        res.json({ success: true, url });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Upload failed', error: String(err) });
    }
});
const coverUpload = (0, multer_1.default)({ storage: memoryStorage });
router.post('/room-cover', authMiddleware_js_1.authenticateToken, coverUpload.single('image'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ success: false, message: 'No image file uploaded' });
        return;
    }
    (0, cloudinary_js_1.uploadToCloudinary)(req.file.buffer, `${baseFolder}/rooms_cover`)
        .then(({ url }) => {
        res.json({ success: true, url });
    })
        .catch((err) => {
        res.status(500).json({ success: false, message: 'Upload failed', error: String(err) });
    });
});
exports.default = router;
//# sourceMappingURL=uploadRoutes.js.map