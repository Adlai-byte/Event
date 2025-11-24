// Simple runner to test the DB connection and exit
const { getPool } = require('./db');

(async () => {
	try {
		const pool = getPool();
		const conn = await pool.getConnection();
		await conn.ping();
		conn.release();
		// Success message is also logged by db.js on init
		process.exit(0);
	} catch (err) {
		console.error('database connection failed:', err.message);
		process.exit(1);
	}
})();

















