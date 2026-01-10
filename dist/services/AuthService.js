"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class AuthService {
    constructor(users, jwtSecret) {
        this.users = users;
        this.jwtSecret = jwtSecret;
    }
    async register(username, email, password, role, defaultAvatar) {
        const existing = await this.users.findByEmailOrUsername(email, username);
        if (existing.length > 0) {
            return { conflict: true };
        }
        const salt = await bcrypt_1.default.genSalt(10);
        const passwordHash = await bcrypt_1.default.hash(password, salt);
        const id = await this.users.createUser(username, email, passwordHash, role || 'participant', defaultAvatar);
        const token = jsonwebtoken_1.default.sign({ id, username, role: role || 'participant' }, this.jwtSecret, { expiresIn: '24h' });
        return { id, token, role: role || 'participant', avatar_url: defaultAvatar };
    }
    async login(email, password) {
        const users = await this.users.findByEmail(email);
        if (users.length === 0)
            return { invalid: true };
        const user = users[0];
        const isMatch = await bcrypt_1.default.compare(password, user['password_hash']);
        if (!isMatch)
            return { invalid: true };
        let currentAvatar = user['avatar_url'] ? String(user['avatar_url']) : '';
        const needsAvatar = !currentAvatar || /^(?!https?:\/\/)(?!\/uploads\/)/i.test(currentAvatar);
        if (needsAvatar) {
            const chosen = this.pickRandomSiggyAvatar();
            if (chosen) {
                await this.users.updateAvatar(Number(user['id']), chosen);
                currentAvatar = chosen;
                user['avatar_url'] = chosen;
            }
        }
        else if (currentAvatar && currentAvatar.startsWith('/uploads/')) {
            try {
                const rel = currentAvatar.replace(/^\/uploads\//, '');
                const fsPath = path_1.default.resolve(__dirname, '../uploads', rel);
                if (!fs_1.default.existsSync(fsPath)) {
                    const chosen = this.pickRandomSiggyAvatar();
                    if (chosen) {
                        await this.users.updateAvatar(Number(user['id']), chosen);
                        currentAvatar = chosen;
                        user['avatar_url'] = chosen;
                    }
                }
            }
            catch { }
        }
        const token = jsonwebtoken_1.default.sign({ id: user['id'], username: user['username'], role: user['role'] }, this.jwtSecret, { expiresIn: '24h' });
        return { token, user, avatar_url: String(currentAvatar || '') };
    }
    async discordUpsert(discordId, username, email, avatarUrl) {
        const byDiscord = await this.users.findByDiscordId(discordId);
        let userId;
        if (byDiscord.length > 0) {
            const usr = byDiscord[0];
            userId = Number(usr.id);
            await this.users.linkDiscord(userId, discordId, avatarUrl, username);
        }
        else {
            let existingEmailId = null;
            if (email)
                existingEmailId = await this.users.findIdByEmail(email);
            if (existingEmailId) {
                userId = existingEmailId;
                await this.users.linkDiscord(userId, discordId, avatarUrl, username);
            }
            else {
                userId = await this.users.createDiscordUser(username, email, avatarUrl);
            }
        }
        const token = jsonwebtoken_1.default.sign({ id: userId, username, role: 'participant' }, this.jwtSecret, { expiresIn: '24h' });
        return { userId, token };
    }
    pickRandomSiggyAvatar() {
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
}
exports.AuthService = AuthService;
