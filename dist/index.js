"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const db_js_1 = __importDefault(require("./config/db.js"));
const mongo_js_1 = require("./config/mongo.js");
const index_js_1 = require("./container/index.js");
const authRoutes_js_1 = __importDefault(require("./routes/authRoutes.js"));
const roomRoutes_js_1 = __importDefault(require("./routes/roomRoutes.js"));
const questionRoutes_js_1 = __importDefault(require("./routes/questionRoutes.js"));
const uploadRoutes_js_1 = __importDefault(require("./routes/uploadRoutes.js"));
const answerRoutes_js_1 = __importDefault(require("./routes/answerRoutes.js"));
const userRoutes_js_1 = __importDefault(require("./routes/userRoutes.js"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT ? Number(process.env.PORT) : 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Serve uploaded files (use existing folder only, resolved relative to this file)
const uploadRoot = path_1.default.resolve(__dirname, '../uploads');
app.use('/uploads', express_1.default.static(uploadRoot));
// Create HTTP server and Socket.io server
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*', // Allow all for dev, restrict in prod
        methods: ['GET', 'POST']
    }
});
// Socket.io Logic
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('join_room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined lobby ${roomId}`);
    });
    socket.on('join_game', async ({ roomId, userId }) => {
        socket.join(`game_${roomId}`);
        console.log(`User ${userId} joined game ${roomId}`);
        // Send immediate state
        await sendGameState(io, roomId);
    });
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
    // Live rooms feed subscription
    socket.on('subscribe_rooms', () => {
        socket.join('rooms_feed');
    });
    socket.on('subscribe_global_leaderboard', () => {
        socket.join('global_leaderboard');
    });
});
// Ensure DB schema has required columns
async function ensureSchema() {
    const driver = (process.env.DB_DRIVER || 'mysql').toLowerCase();
    if (driver === 'mongo' || driver === 'mongodb') {
        return;
    }
    try {
        const [cols] = await db_js_1.default.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'questions'`);
        const names = new Set(cols.map((c) => c.COLUMN_NAME));
        if (!names.has('image_url')) {
            await db_js_1.default.query(`ALTER TABLE questions ADD COLUMN image_url VARCHAR(512) NULL`);
            console.log('Added image_url column to questions');
        }
        // Answers table
        await db_js_1.default.query(`CREATE TABLE IF NOT EXISTS answers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_id INT NOT NULL,
        question_id INT NOT NULL,
        user_id INT NOT NULL,
        selected_index INT NOT NULL,
        is_correct TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_user_question (user_id, question_id)
      )`);
        // Ensure answers has required columns and indexes (migrate older schemas)
        const [ansCols] = await db_js_1.default.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'answers'`);
        const aNames = new Set(ansCols.map((c) => c.COLUMN_NAME));
        // Drop legacy foreign keys and indexes tied to participant_id
        const [fkRows] = await db_js_1.default.query(`SELECT CONSTRAINT_NAME 
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'answers' 
         AND COLUMN_NAME = 'participant_id' 
         AND REFERENCED_TABLE_NAME IS NOT NULL`);
        for (const r of fkRows) {
            const name = r.CONSTRAINT_NAME;
            try {
                await db_js_1.default.query(`ALTER TABLE answers DROP FOREIGN KEY \`${name}\``);
                console.log(`Dropped legacy FK on participant_id: ${name}`);
            }
            catch { }
        }
        const [idxOnParticipant] = await db_js_1.default.query(`SELECT DISTINCT INDEX_NAME 
       FROM INFORMATION_SCHEMA.STATISTICS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'answers' 
         AND COLUMN_NAME = 'participant_id'`);
        for (const r of idxOnParticipant) {
            const idx = r.INDEX_NAME;
            try {
                await db_js_1.default.query(`ALTER TABLE answers DROP INDEX \`${idx}\``);
                console.log(`Dropped legacy index on participant_id: ${idx}`);
            }
            catch { }
        }
        // room_id
        if (!aNames.has('room_id')) {
            await db_js_1.default.query(`ALTER TABLE answers ADD COLUMN room_id INT NULL`);
            await db_js_1.default.query(`UPDATE answers a JOIN questions q ON a.question_id = q.id SET a.room_id = q.room_id WHERE a.room_id IS NULL`);
            await db_js_1.default.query(`ALTER TABLE answers MODIFY COLUMN room_id INT NOT NULL`);
            console.log('Migrated answers: added room_id and backfilled');
        }
        // user_id
        if (!aNames.has('user_id')) {
            await db_js_1.default.query(`ALTER TABLE answers ADD COLUMN user_id INT NULL`);
            // Backfill from legacy participant_id if present
            const [legacyCols] = await db_js_1.default.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'answers'`);
            const legacyNames = new Set(legacyCols.map((c) => c.COLUMN_NAME));
            if (legacyNames.has('participant_id')) {
                await db_js_1.default.query(`UPDATE answers SET user_id = participant_id WHERE user_id IS NULL`);
                // Optional: drop legacy column
                try {
                    await db_js_1.default.query(`ALTER TABLE answers DROP COLUMN participant_id`);
                    console.log('Dropped legacy participant_id column');
                }
                catch { }
                console.log('Migrated answers: backfilled user_id from participant_id and dropped participant_id');
            }
            await db_js_1.default.query(`ALTER TABLE answers MODIFY COLUMN user_id INT NOT NULL`);
            console.log('Migrated answers: ensured user_id exists');
        }
        // question_id
        if (!aNames.has('question_id')) {
            await db_js_1.default.query(`ALTER TABLE answers ADD COLUMN question_id INT NOT NULL`);
            console.log('Migrated answers: added question_id');
        }
        // selected_index
        if (!aNames.has('selected_index')) {
            await db_js_1.default.query(`ALTER TABLE answers ADD COLUMN selected_index INT NOT NULL DEFAULT 0`);
            console.log('Migrated answers: added selected_index');
        }
        // is_correct
        if (!aNames.has('is_correct')) {
            await db_js_1.default.query(`ALTER TABLE answers ADD COLUMN is_correct TINYINT(1) NOT NULL DEFAULT 0`);
            console.log('Migrated answers: added is_correct');
        }
        // score
        if (!aNames.has('score')) {
            await db_js_1.default.query(`ALTER TABLE answers ADD COLUMN score INT NOT NULL DEFAULT 0`);
            console.log('Migrated answers: added score');
        }
        // created_at
        if (!aNames.has('created_at')) {
            await db_js_1.default.query(`ALTER TABLE answers ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
            console.log('Migrated answers: added created_at');
        }
        // Ensure unique index exists
        const [idxRows] = await db_js_1.default.query(`SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'answers' AND NON_UNIQUE = 0`);
        const idxNames = new Set(idxRows.map((r) => r.INDEX_NAME));
        if (!idxNames.has('uniq_user_question') && aNames.has('user_id') && aNames.has('question_id')) {
            await db_js_1.default.query(`ALTER TABLE answers ADD UNIQUE KEY uniq_user_question (user_id, question_id)`);
            console.log('Migrated answers: added unique index uniq_user_question');
        }
        // Participants table migrations
        const [partCols] = await db_js_1.default.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'participants'`);
        const pNames = new Set(partCols.map((c) => c.COLUMN_NAME));
        if (!pNames.has('total_score')) {
            await db_js_1.default.query(`ALTER TABLE participants ADD COLUMN total_score INT NOT NULL DEFAULT 0`);
            console.log('Migrated participants: added total_score');
        }
        if (!pNames.has('position')) {
            await db_js_1.default.query(`ALTER TABLE participants ADD COLUMN position INT NULL`);
            console.log('Migrated participants: added position');
        }
        // Rooms table migrations
        const [roomCols] = await db_js_1.default.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rooms'`);
        const rNames = new Set(roomCols.map((c) => c.COLUMN_NAME));
        if (!rNames.has('status')) {
            await db_js_1.default.query(`ALTER TABLE rooms ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'waiting'`);
            console.log('Migrated rooms: added status with default waiting');
        }
        if (!rNames.has('is_published')) {
            await db_js_1.default.query(`ALTER TABLE rooms ADD COLUMN is_published TINYINT(1) NOT NULL DEFAULT 0`);
            console.log('Migrated rooms: added is_published flag');
        }
        if (!rNames.has('published_at')) {
            await db_js_1.default.query(`ALTER TABLE rooms ADD COLUMN published_at TIMESTAMP NULL DEFAULT NULL`);
            console.log('Migrated rooms: added published_at timestamp');
        }
        if (!rNames.has('cover_photo_url')) {
            await db_js_1.default.query(`ALTER TABLE rooms ADD COLUMN cover_photo_url VARCHAR(512) NULL`);
            console.log('Migrated rooms: added cover_photo_url');
        }
        await db_js_1.default.query(`UPDATE rooms SET is_published = 1, published_at = COALESCE(published_at, NOW()) WHERE is_public = 1 AND LOWER(status) = 'published' AND is_published = 0`);
        // Users table migrations for Discord OAuth
        const [userCols] = await db_js_1.default.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`);
        const uNames = new Set(userCols.map((c) => c.COLUMN_NAME));
        if (!uNames.has('discord_id')) {
            await db_js_1.default.query(`ALTER TABLE users ADD COLUMN discord_id VARCHAR(64) NULL UNIQUE`);
            console.log('Migrated users: added discord_id');
        }
        if (!uNames.has('avatar_url')) {
            await db_js_1.default.query(`ALTER TABLE users ADD COLUMN avatar_url VARCHAR(512) NULL`);
            console.log('Migrated users: added avatar_url');
        }
    }
    catch (e) {
        console.error('ensureSchema error:', e);
    }
}
// Helper to calculate and send game state
async function sendGameState(io, roomId) {
    try {
        const rid = Number(roomId);
        if (!Number.isFinite(rid))
            return;
        const room = await index_js_1.container.roomService.getRoomRaw(rid);
        if (!room)
            return;
        if (!room.start_time) {
            io.to(`game_${roomId}`).emit('game_state', { error: 'Game not started' });
            return;
        }
        const questions = await index_js_1.container.questionService.getQuestions(rid);
        const totalQuestions = questions.length;
        if (totalQuestions === 0)
            return;
        const now = new Date();
        let start = null;
        if (room.start_time instanceof Date) {
            start = room.start_time;
        }
        else {
            const raw = String(room.start_time);
            start = new Date(raw.replace(' ', 'T'));
        }
        if (!start || isNaN(start.getTime())) {
            io.to(`game_${roomId}`).emit('game_state', { error: 'Invalid start time' });
            return;
        }
        // If not started yet, broadcast not-started state
        if (now.getTime() < start.getTime()) {
            io.to(`game_${roomId}`).emit('game_state', { error: 'Game not started' });
            return;
        }
        const elapsedSeconds = (now.getTime() - start.getTime()) / 1000;
        const timePerQuestion = room.time_per_question || 30;
        const currentIndex = Math.floor(elapsedSeconds / timePerQuestion);
        if (currentIndex >= totalQuestions) {
            io.to(`game_${roomId}`).emit('game_state', { finished: true });
        }
        else {
            const timeLeft = Math.max(0, Math.ceil(timePerQuestion - (elapsedSeconds % timePerQuestion)));
            io.to(`game_${roomId}`).emit('game_state', {
                finished: false,
                question: questions[currentIndex],
                index: currentIndex,
                total: totalQuestions,
                timeLeft: timeLeft
            });
        }
    }
    catch (err) {
        console.error("Game Loop Error:", err);
    }
}
// Global Game Loop (Ticks every second to keep everyone in sync)
setInterval(() => {
    // Ideally, we only loop through active rooms. 
    // For this demo, we'll just rely on 'join_game' to trigger state, 
    // OR we can iterate active socket rooms.
    // To satisfy "live updates without reload", we should broadcast frequently.
    // Optimisation: Only broadcast to rooms that have sockets connected
    const rooms = io.sockets.adapter.rooms;
    rooms.forEach((_, roomName) => {
        if (roomName.startsWith('game_')) {
            const roomId = roomName.replace('game_', '');
            sendGameState(io, roomId);
        }
    });
}, 1000);
// Helper to compute live room status for Join page
async function broadcastRoomsSnapshot() {
    try {
        const rows = await index_js_1.container.roomService.roomsSnapshot();
        const now = new Date();
        const snapshot = rows.map((r) => {
            let state = 'published';
            let countdown = null;
            if (r.is_public) {
                state = 'published';
            }
            else {
                // private room
                const total = Number(r.total_questions) || 0;
                const tpq = Number(r.time_per_question) || 30;
                let start = null;
                if (r.start_time instanceof Date)
                    start = r.start_time;
                else if (r.start_time)
                    start = new Date(String(r.start_time).replace(' ', 'T'));
                if (!start || isNaN(start.getTime())) {
                    state = 'waiting';
                }
                else if (now.getTime() < start.getTime()) {
                    state = 'waiting';
                    countdown = Math.max(0, Math.ceil((start.getTime() - now.getTime()) / 1000));
                }
                else {
                    const elapsedSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
                    const currentIndex = Math.floor(elapsedSeconds / tpq);
                    state = currentIndex >= total ? 'ended' : 'started';
                }
            }
            return {
                id: r.id,
                title: r.title,
                isPublic: !!r.is_public,
                participantCount: Number(r.participant_count) || 0,
                coverPhotoUrl: r.cover_photo_url || null,
                status: state,
                countdown,
            };
        });
        io.to('rooms_feed').emit('rooms_snapshot', snapshot);
    }
    catch (e) {
        console.error('broadcastRoomsSnapshot error:', e);
    }
}
setInterval(broadcastRoomsSnapshot, 3000);
async function broadcastGlobalLeaderboard() {
    try {
        const payload = await index_js_1.container.answerService.globalLeaderboardSnapshot();
        io.to('global_leaderboard').emit('global_leaderboard_snapshot', payload);
    }
    catch (e) {
        console.error('broadcastGlobalLeaderboard error:', e);
    }
}
setInterval(broadcastGlobalLeaderboard, 3000);
// Make io accessible in routes if needed (middleware)
app.use((req, res, next) => {
    req.io = io;
    next();
});
app.use('/api/auth', authRoutes_js_1.default);
app.use('/api/rooms', roomRoutes_js_1.default);
app.use('/api/questions', questionRoutes_js_1.default);
app.use('/api/upload', uploadRoutes_js_1.default);
app.use('/api/answers', answerRoutes_js_1.default);
app.use('/api/users', userRoutes_js_1.default);
app.get('/', (req, res) => {
    res.send('RitualQuiz Backend is running');
});
// Test DB connection
app.get('/api/health', async (req, res) => {
    try {
        const driver = (process.env.DB_DRIVER || 'mysql').toLowerCase();
        if (driver === 'mongo' || driver === 'mongodb') {
            const db = await (0, mongo_js_1.getDb)();
            await db.command({ ping: 1 });
            res.json({ status: 'ok', db: 'connected', driver: 'mongo' });
            return;
        }
        await db_js_1.default.query('SELECT 1');
        res.json({ status: 'ok', db: 'connected', driver: 'mysql' });
    }
    catch (error) {
        res.status(500).json({ status: 'error', db: error.message });
    }
});
ensureSchema().then(() => {
    server.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
});
// Prevent immediate exit if something else closes the event loop
setInterval(() => { }, 1000 * 60 * 60);
