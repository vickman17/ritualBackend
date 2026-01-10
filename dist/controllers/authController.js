"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.discordCallback = exports.discordRedirect = exports.login = exports.register = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const index_js_1 = require("../container/index.js");
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
}
function pickRandomSiggyAvatar() {
    try {
        const dir = path_1.default.resolve(__dirname, '../../uploads', 'siggy');
        if (!fs_1.default.existsSync(dir))
            return null;
        const files = fs_1.default.readdirSync(dir).filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f));
        if (files.length === 0)
            return null;
        const chosen = files[Math.floor(Math.random() * files.length)];
        return `/uploads/siggy/${chosen}`;
    }
    catch {
        return null;
    }
}
const register = async (req, res) => {
    const { username, email, password, role } = req.body;
    if (req.method === "GET") {
        res.status(400).json({ success: false, message: 'Please use POST method for registration' });
        return;
    }
    if (!username || !email || !password) {
        res.status(400).json({ success: false, message: 'Please provide all required fields' });
        return;
    }
    try {
        const defaultAvatar = pickRandomSiggyAvatar();
        const result = await index_js_1.container.authService.register(username, email, password, role, defaultAvatar || '');
        if (result.conflict) {
            res.status(409).json({ success: false, message: 'User already exists' });
            return;
        }
        res.status(201).json({
            success: true,
            token: result.token,
            user: { id: result.id, username, email, role: result.role, avatar_url: result.avatar_url || '' }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.register = register;
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ success: false, message: 'Please provide email and password' });
        return;
    }
    try {
        const result = await index_js_1.container.authService.login(email, password);
        if (result.invalid) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }
        const user = result.user;
        const publicAvatarLogin = result.avatar_url;
        res.json({
            success: true,
            token: result.token,
            user: { id: user['id'], username: user['username'], email: user['email'], role: user['role'], avatar_url: publicAvatarLogin }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
exports.login = login;
const discordRedirect = async (req, res) => {
    try {
        const clientId = process.env.DISCORD_CLIENT_ID;
        const redirectUri = process.env.DISCORD_REDIRECT_URI;
        if (!clientId || !redirectUri) {
            res.status(500).json({ success: false, message: 'Discord OAuth not configured: set DISCORD_CLIENT_ID and DISCORD_REDIRECT_URI in .env' });
            return;
        }
        const scope = encodeURIComponent('identify email');
        const state = Math.random().toString(36).slice(2);
        const url = `https://discord.com/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;
        console.log('Discord OAuth authorize URL:', url);
        res.redirect(url);
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Discord redirect error' });
    }
};
exports.discordRedirect = discordRedirect;
const discordCallback = async (req, res) => {
    try {
        const code = req.query.code;
        if (!code) {
            res.status(400).send('Missing code');
            return;
        }
        const clientId = process.env.DISCORD_CLIENT_ID;
        const clientSecret = process.env.DISCORD_CLIENT_SECRET;
        const redirectUri = process.env.DISCORD_REDIRECT_URI;
        if (!clientId || !clientSecret || !redirectUri) {
            res.status(500).send('Discord OAuth not configured');
            return;
        }
        const body = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
        });
        const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
        });
        const tokenJson = await tokenRes.json();
        if (!tokenRes.ok) {
            res.status(400).send('Discord token exchange failed');
            return;
        }
        const accessToken = tokenJson.access_token;
        const userRes = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const dUser = await userRes.json();
        if (!userRes.ok) {
            res.status(400).send('Discord user fetch failed');
            return;
        }
        const discordId = String(dUser.id);
        const username = String(dUser.username);
        const email = dUser.email ? String(dUser.email) : '';
        const avatarUrl = dUser.avatar ? `https://cdn.discordapp.com/avatars/${discordId}/${dUser.avatar}.png` : null;
        const { userId, token } = await index_js_1.container.authService.discordUpsert(discordId, username, email, avatarUrl);
        // Return a small HTML to postMessage back to opener
        const payload = {
            success: true,
            token,
            user: { id: userId, username, email, role: 'participant' },
        };
        res.setHeader('Content-Type', 'text/html');
        res.send(`<!doctype html><html><body><script>try{window.opener&&window.opener.postMessage(${JSON.stringify(payload)},'*');}catch(e){};window.close();</script><p>Login completed. You can close this window.</p></body></html>`);
    }
    catch (e) {
        console.error('Discord callback error:', e);
        res.status(500).send('Server error');
    }
};
exports.discordCallback = discordCallback;
