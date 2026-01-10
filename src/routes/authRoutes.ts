import express from 'express';
import { register, login, discordRedirect, discordCallback } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/discord', discordRedirect);
router.get('/discord/callback', discordCallback);

export default router;
