"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const userController_js_1 = require("../controllers/userController.js");
const router = express_1.default.Router();
router.patch('/me/avatar', authMiddleware_js_1.authenticateToken, userController_js_1.updateMyAvatar);
router.get('/me/score', authMiddleware_js_1.authenticateToken, userController_js_1.getMyScore);
router.get('/me/recent-played', authMiddleware_js_1.authenticateToken, userController_js_1.getMyRecentPlayed);
exports.default = router;
