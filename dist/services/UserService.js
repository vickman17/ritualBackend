"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
class UserService {
    constructor(users) {
        this.users = users;
    }
    async updateAvatar(userId, avatarUrl) {
        await this.users.updateAvatar(userId, avatarUrl);
    }
    async getMyScore(userId) {
        return await this.users.getScoreSummary(userId);
    }
    async getMyRecentPlayed(userId) {
        return await this.users.getRecentPlayed(userId);
    }
}
exports.UserService = UserService;
//# sourceMappingURL=UserService.js.map