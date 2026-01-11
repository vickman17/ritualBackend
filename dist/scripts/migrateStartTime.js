"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function migrate() {
    const connection = await promise_1.default.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ritualquiz_db'
    });
    try {
        console.log('Running migration...');
        // Check if columns exist first to avoid errors if run multiple times
        const [columns] = await connection.query('SHOW COLUMNS FROM rooms LIKE "start_time"');
        if (columns.length === 0) {
            await connection.query(`
        ALTER TABLE rooms 
        ADD COLUMN start_time DATETIME NULL AFTER password_hash;
        `);
            console.log('Migration successful: Added start_time to rooms table.');
        }
        else {
            console.log('Migration skipped: Columns already exist.');
        }
    }
    catch (error) {
        console.error('Migration failed:', error);
    }
    finally {
        await connection.end();
    }
}
migrate();
//# sourceMappingURL=migrateStartTime.js.map