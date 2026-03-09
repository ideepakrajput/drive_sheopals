import mysql from 'mysql2/promise';

// Global is used here to ensure the connection pool is not recreated on every hot reload in development
const globalForMySQL = global as unknown as {
    mysqlPool: mysql.Pool | undefined;
};

export const pool =
    globalForMySQL.mysqlPool ??
    mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'drive_sheopals',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
    });

if (process.env.NODE_ENV !== 'production') globalForMySQL.mysqlPool = pool;
