"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const questionController_js_1 = require("../controllers/questionController.js");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const router = express_1.default.Router();
// Get questions for a room
router.get('/room/:roomId', authMiddleware_js_1.authenticateToken, questionController_js_1.getQuestions);
// Add question to a room
router.post('/room/:roomId', authMiddleware_js_1.authenticateToken, questionController_js_1.addQuestion);
// Delete a question
router.delete('/:id', authMiddleware_js_1.authenticateToken, questionController_js_1.deleteQuestion);
exports.default = router;
//# sourceMappingURL=questionRoutes.js.map