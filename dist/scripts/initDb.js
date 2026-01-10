"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
async function initDb() {
    const connection = await promise_1.default.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
    });
    try {
        console.log('Connected to MySQL server.');
        const dbName = process.env.DB_NAME;
        if (!dbName)
            throw new Error('DB_NAME is not defined');
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        console.log(`Database '${dbName}' created or already exists.`);
        await connection.changeUser({ database: dbName });
        // Path to schema.sql: ../../../database/schema.sql
        // Adjust based on where this script is run. Assuming run via ts-node from backend root.
        // If run from backend root: src/scripts/initDb.ts
        // path.join(process.cwd(), '../database/schema.sql') might be safer if running from backend root.
        // Or relative to __dirname:
        const schemaPath = path_1.default.resolve(__dirname, '../../../database/schema.sql');
        console.log(`Reading schema from: ${schemaPath}`);
        const schema = await promises_1.default.readFile(schemaPath, 'utf8');
        console.log('Executing schema...');
        await connection.query(schema);
        console.log('Database initialized successfully!');
    }
    catch (error) {
        console.error('Error initializing database:', error);
    }
    finally {
        await connection.end();
    }
}
initDb();
