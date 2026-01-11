"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_js_1 = require("../controllers/authController.js");
const router = express_1.default.Router();
router.post('/register', authController_js_1.register);
router.post('/login', authController_js_1.login);
router.get('/discord', authController_js_1.discordRedirect);
router.get('/discord/callback', authController_js_1.discordCallback);
exports.default = router;
//# sourceMappingURL=authRoutes.js.map