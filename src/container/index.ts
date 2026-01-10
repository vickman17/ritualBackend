import { UserRepositoryMySQL } from '../repositories/mysql/UserRepositoryMySQL.js';
import { RoomRepositoryMySQL } from '../repositories/mysql/RoomRepositoryMySQL.js';
import { QuestionRepositoryMySQL } from '../repositories/mysql/QuestionRepositoryMySQL.js';
import { AnswerRepositoryMySQL } from '../repositories/mysql/AnswerRepositoryMySQL.js';
import { UserRepositoryMongo } from '../repositories/mongo/UserRepositoryMongo.js';
import { RoomRepositoryMongo } from '../repositories/mongo/RoomRepositoryMongo.js';
import { QuestionRepositoryMongo } from '../repositories/mongo/QuestionRepositoryMongo.js';
import { AnswerRepositoryMongo } from '../repositories/mongo/AnswerRepositoryMongo.js';
import { AuthService } from '../services/AuthService.js';
import { UserService } from '../services/UserService.js';
import { RoomService } from '../services/RoomService.js';
import { QuestionService } from '../services/QuestionService.js';
import { AnswerService } from '../services/AnswerService.js';

const driver = (process.env.DB_DRIVER || 'mysql').toLowerCase();
const useMongo = driver === 'mongo' || driver === 'mongodb';
const userRepository = useMongo ? new UserRepositoryMongo() : new UserRepositoryMySQL();
const roomRepository = useMongo ? new RoomRepositoryMongo() : new RoomRepositoryMySQL();
const questionRepository = useMongo ? new QuestionRepositoryMongo() : new QuestionRepositoryMySQL();
const answerRepository = useMongo ? new AnswerRepositoryMongo() : new AnswerRepositoryMySQL();

const jwtSecret = process.env.JWT_SECRET || '';
if (!jwtSecret) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

export const container = {
  authService: new AuthService(userRepository, jwtSecret),
  userService: new UserService(userRepository),
  roomService: new RoomService(roomRepository),
  questionService: new QuestionService(questionRepository, roomRepository),
  answerService: new AnswerService(answerRepository),
};
