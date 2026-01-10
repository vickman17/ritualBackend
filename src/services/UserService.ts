import { IUserRepository } from '../repositories/interfaces/UserRepository.js';

export class UserService {
  constructor(private readonly users: IUserRepository) {}

  async updateAvatar(userId: number, avatarUrl: string) {
    await this.users.updateAvatar(userId, avatarUrl);
  }

  async getMyScore(userId: number) {
    return await this.users.getScoreSummary(userId);
  }

  async getMyRecentPlayed(userId: number) {
    return await this.users.getRecentPlayed(userId);
  }
}

