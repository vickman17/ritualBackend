import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { IUserRepository } from '../repositories/interfaces/UserRepository.js';

export class AuthService {
  constructor(private readonly users: IUserRepository, private readonly jwtSecret: string) {}

  async register(username: string, email: string, password: string, role: string | undefined, defaultAvatar: string) {
    const existing = await this.users.findByEmailOrUsername(email, username);
    if (existing.length > 0) {
      return { conflict: true };
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const id = await this.users.createUser(username, email, passwordHash, role || 'participant', defaultAvatar);
    const token = jwt.sign({ id, username, role: role || 'participant' }, this.jwtSecret, { expiresIn: '24h' });
    return { id, token, role: role || 'participant', avatar_url: defaultAvatar };
  }
  
  async login(email: string, password: string) {
    const users = await this.users.findByEmail(email);
    if (users.length === 0) return { invalid: true };
    const user = users[0];
    const isMatch = await bcrypt.compare(password, user['password_hash']);
    if (!isMatch) return { invalid: true };
    let currentAvatar = user['avatar_url'] ? String(user['avatar_url']) : '';
    const needsAvatar = !currentAvatar || /^(?!https?:\/\/)(?!\/uploads\/)/i.test(currentAvatar);
    if (needsAvatar) {
      const chosen = this.pickRandomSiggyAvatar();
      if (chosen) {
        await this.users.updateAvatar(Number(user['id']), chosen);
        currentAvatar = chosen;
        user['avatar_url'] = chosen;
      }
    } else if (currentAvatar && currentAvatar.startsWith('/uploads/')) {
      try {
        const rel = currentAvatar.replace(/^\/uploads\//, '');
        const fsPath = path.resolve(__dirname, '../uploads', rel);
        if (!fs.existsSync(fsPath)) {
          const chosen = this.pickRandomSiggyAvatar();
          if (chosen) {
            await this.users.updateAvatar(Number(user['id']), chosen);
            currentAvatar = chosen;
            user['avatar_url'] = chosen;
          }
        }
      } catch {}
    }
    const token = jwt.sign({ id: user['id'], username: user['username'], role: user['role'] }, this.jwtSecret, { expiresIn: '24h' });
    return { token, user, avatar_url: String(currentAvatar || '') };
  }

  async discordUpsert(discordId: string, username: string, email: string, avatarUrl: string | null) {
    const byDiscord = await this.users.findByDiscordId(discordId);
    let userId: number;
    if (byDiscord.length > 0) {
      const usr = byDiscord[0] as any;
      userId = Number(usr.id);
      await this.users.linkDiscord(userId, discordId, avatarUrl, username);
    } else {
      let existingEmailId: number | null = null;
      if (email) existingEmailId = await this.users.findIdByEmail(email);
      if (existingEmailId) {
        userId = existingEmailId;
        await this.users.linkDiscord(userId, discordId, avatarUrl, username);
      } else {
        userId = await this.users.createDiscordUser(username, email, avatarUrl);
      }
    }
    const token = jwt.sign({ id: userId, username, role: 'participant' }, this.jwtSecret, { expiresIn: '24h' });
    return { userId, token };
  }

  private pickRandomSiggyAvatar(): string | null {
    try {
      const dir = path.resolve(__dirname,'../../uploads', 'siggy');
      if (!fs.existsSync(dir)) return null;
      const files = fs.readdirSync(dir).filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f));
      if (files.length === 0) return null;
      const chosen = files[Math.floor(Math.random() * files.length)];
      return `/uploads/siggy/${chosen}`;
    } catch {
      return null;
    }
  }
}
