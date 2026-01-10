"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.container = void 0;
const UserRepositoryMySQL_js_1 = require("../repositories/mysql/UserRepositoryMySQL.js");
const RoomRepositoryMySQL_js_1 = require("../repositories/mysql/RoomRepositoryMySQL.js");
const QuestionRepositoryMySQL_js_1 = require("../repositories/mysql/QuestionRepositoryMySQL.js");
const AnswerRepositoryMySQL_js_1 = require("../repositories/mysql/AnswerRepositoryMySQL.js");
const UserRepositoryMongo_js_1 = require("../repositories/mongo/UserRepositoryMongo.js");
const RoomRepositoryMongo_js_1 = require("../repositories/mongo/RoomRepositoryMongo.js");
const QuestionRepositoryMongo_js_1 = require("../repositories/mongo/QuestionRepositoryMongo.js");
const AnswerRepositoryMongo_js_1 = require("../repositories/mongo/AnswerRepositoryMongo.js");
const AuthService_js_1 = require("../services/AuthService.js");
const UserService_js_1 = require("../services/UserService.js");
const RoomService_js_1 = require("../services/RoomService.js");
const QuestionService_js_1 = require("../services/QuestionService.js");
const AnswerService_js_1 = require("../services/AnswerService.js");
const driver = (process.env.DB_DRIVER || 'mysql').toLowerCase();
const useMongo = driver === 'mongo' || driver === 'mongodb';
const userRepository = useMongo ? new UserRepositoryMongo_js_1.UserRepositoryMongo() : new UserRepositoryMySQL_js_1.UserRepositoryMySQL();
const roomRepository = useMongo ? new RoomRepositoryMongo_js_1.RoomRepositoryMongo() : new RoomRepositoryMySQL_js_1.RoomRepositoryMySQL();
const questionRepository = useMongo ? new QuestionRepositoryMongo_js_1.QuestionRepositoryMongo() : new QuestionRepositoryMySQL_js_1.QuestionRepositoryMySQL();
const answerRepository = useMongo ? new AnswerRepositoryMongo_js_1.AnswerRepositoryMongo() : new AnswerRepositoryMySQL_js_1.AnswerRepositoryMySQL();
const jwtSecret = process.env.JWT_SECRET || '';
if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
}
exports.container = {
    authService: new AuthService_js_1.AuthService(userRepository, jwtSecret),
    userService: new UserService_js_1.UserService(userRepository),
    roomService: new RoomService_js_1.RoomService(roomRepository),
    questionService: new QuestionService_js_1.QuestionService(questionRepository, roomRepository),
    answerService: new AnswerService_js_1.AnswerService(answerRepository),
};
