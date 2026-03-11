// MySQL connection pool for the `event` database
// Uses mysql2/promise with configurable pool settings

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mysql = require('mysql2/promise');
const logger = require('./lib/logger');

const isTest = process.env.NODE_ENV === 'test';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = isTest ? (process.env.DB_NAME_TEST || 'event_test') : (process.env.DB_NAME || 'event');
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_POOL_SIZE = Number(process.env.DB_POOL_SIZE || 50);
const DB_QUEUE_LIMIT = Number(process.env.DB_QUEUE_LIMIT || 100);

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
			connectionLimit: DB_POOL_SIZE,
			queueLimit: DB_QUEUE_LIMIT,
			connectTimeout: 5000,
			idleTimeout: 60000,
			enableKeepAlive: true,
			keepAliveInitialDelay: 30000,
		});

		// Connection test on first pool creation
		(async () => {
			try {
				const connection = await pool.getConnection();
				await connection.ping();
				connection.release();
				logger.info('Database connected', {
					host: DB_HOST,
					database: DB_NAME,
					poolSize: DB_POOL_SIZE,
				});
			} catch (error) {
				logger.error('Database connection failed', { error: error.message });
			}
		})();
	}
	return pool;
}

module.exports = { getPool };


