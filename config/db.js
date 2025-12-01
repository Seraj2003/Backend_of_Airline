const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a pool
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT)
});

// Test connection
async function testConnection() {
    try {
        const connection = await db.getConnection();
        console.log('Database connected successfully');
        connection.release(); // release connection back to pool
    } catch (error) {
        console.error('Database connection error:', error);
    }
}

testConnection();

module.exports = db;
