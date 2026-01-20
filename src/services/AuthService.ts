import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { IUserRepository } from '../repositories/interfaces/UserRepository.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

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
    const baseFolder = process.env.CLOUDINARY_FOLDER || 'ritualquiz';
    if (!currentAvatar) {
      const chosen = this.pickRandomSiggyAvatar();
      if (chosen) {
        try {
          const rel = chosen.replace(/^\/uploads\//, '');
          const fsPath = path.resolve(__dirname, '../../uploads', rel);
          if (fs.existsSync(fsPath)) {
            const buffer = fs.readFileSync(fsPath);
            const uploaded = await uploadToCloudinary(buffer, `${baseFolder}/avatars`);
            currentAvatar = uploaded.url;
            await this.users.updateAvatar(Number(user['id']), currentAvatar);
            user['avatar_url'] = currentAvatar;
          }
        } catch {}
      }
    } else if (currentAvatar.startsWith('/uploads/')) {
      try {
        const rel = currentAvatar.replace(/^\/uploads\//, '');
        const fsPath = path.resolve(__dirname, '../../uploads', rel);
        if (fs.existsSync(fsPath)) {
          const buffer = fs.readFileSync(fsPath);
          const uploaded = await uploadToCloudinary(buffer, `${baseFolder}/avatars`);
          currentAvatar = uploaded.url;
          await this.users.updateAvatar(Number(user['id']), currentAvatar);
          user['avatar_url'] = currentAvatar;
        } else {
          const chosen = this.pickRandomSiggyAvatar();
          if (chosen) {
            const rel2 = chosen.replace(/^\/uploads\//, '');
            const fsPath2 = path.resolve(__dirname, '../../uploads', rel2);
            if (fs.existsSync(fsPath2)) {
              const buffer2 = fs.readFileSync(fsPath2);
              const uploaded2 = await uploadToCloudinary(buffer2, `${baseFolder}/avatars`);
              currentAvatar = uploaded2.url;
              await this.users.updateAvatar(Number(user['id']), currentAvatar);
              user['avatar_url'] = currentAvatar;
            }
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
