export interface IUserRepository {
  findByEmailOrUsername(email: string, username: string): Promise<any[]>;
  findByEmail(email: string): Promise<any[]>;
  findByDiscordId(discordId: string): Promise<any[]>;
  findIdByEmail(email: string): Promise<number | null>;
  createUser(username: string, email: string, passwordHash: string, role: string, avatarUrl: string): Promise<number>;
  updateAvatar(userId: number, avatarUrl: string): Promise<void>;
  getScoreSummary(userId: number): Promise<{ total_score: number; correct: number; answered: number }>;
  getRecentPlayed(userId: number): Promise<Array<{ id: number; title: string; room_code: string; last_played: any; answered: number; total_score: number }>>;
  linkDiscord(userId: number, discordId: string, avatarUrl: string | null, username: string): Promise<void>;
  createDiscordUser(username: string, email: string, avatarUrl: string | null): Promise<number>;
}
