import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDB() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
    });

    const dbName = process.env.DB_NAME || 'drive_sheopals';
    console.log(`Creating database ${dbName} if not exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.query(`USE \`${dbName}\``);

    const schemaPath = path.join(__dirname, '../db/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Splitting by semicolon and filtering out empty queries
    const queries = schemaSql
        .split(';')
        .map((q) => q.trim())
        .filter((q) => q.length > 0);

    console.log('Running schema creation queries...');
    for (const query of queries) {
        await connection.query(query);
    }

    console.log('Database initialized successfully!');
    await connection.end();
}

initDB().catch((err) => {
    console.error('Error initializing database:', err);
    process.exit(1);
});
