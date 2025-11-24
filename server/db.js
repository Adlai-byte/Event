// Simple MySQL connection pool for the `event` database
// Uses mysql2/promise and tests the connection on first import

// Load environment variables
require('dotenv').config();

const mysql = require('mysql2/promise');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'event';
const DB_PORT = Number(process.env.DB_PORT || 3306);

let pool;

function getPool() {
	if (!pool) {
		pool = mysql.createPool({
			host: DB_HOST,
			user: DB_USER,
			password: DB_PASSWORD,
			database: DB_NAME,
			port: DB_PORT,
			waitForConnections: true,
			connectionLimit: 10,
			queueLimit: 0,
		});
		// fire-and-forget a quick connection test
		(async () => {
			try {
				const connection = await pool.getConnection();
				await connection.ping();
				connection.release();
				console.log('successfully connected to database');
			} catch (error) {
				console.error('database connection failed:', error.message);
			}
		})();
	}
	return pool;
}

module.exports = {
	getPool,
};


