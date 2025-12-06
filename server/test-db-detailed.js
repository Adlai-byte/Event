// Detailed database connection test
const path = require('path');
// Load .env from root directory (parent of server)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mysql = require('mysql2/promise');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'event';
const DB_PORT = Number(process.env.DB_PORT || 3306);

console.log('=== Database Connection Test ===');
console.log('Host:', DB_HOST);
console.log('User:', DB_USER);
console.log('Password:', DB_PASSWORD ? '***' : '(empty)');
console.log('Database:', DB_NAME);
console.log('Port:', DB_PORT);
console.log('');

(async () => {
    let connection;
    try {
        console.log('Attempting to connect...');
        connection = await mysql.createConnection({
            host: DB_HOST,
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_NAME,
            port: DB_PORT,
            connectTimeout: 5000
        });

        console.log('✓ Connected successfully!');
        
        // Test query
        const [rows] = await connection.query('SELECT DATABASE() as current_db, VERSION() as version');
        console.log('Current Database:', rows[0].current_db);
        console.log('MySQL Version:', rows[0].version);
        
        // Check if database exists and has tables
        const [tables] = await connection.query('SHOW TABLES');
        console.log(`✓ Database has ${tables.length} table(s)`);
        
        await connection.end();
        console.log('\n✓ Connection test completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n✗ Connection failed!');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        console.error('Error SQL State:', error.sqlState);
        console.error('Full Error:', error);
        
        if (error.code === 'ECONNREFUSED') {
            console.error('\nPossible issues:');
            console.error('- MySQL server is not running');
            console.error('- Wrong host or port');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('\nPossible issues:');
            console.error('- Wrong username or password');
            console.error('- User does not have access to this database');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.error('\nPossible issues:');
            console.error('- Database does not exist');
            console.error('- Try running: node database/migrate.js');
        }
        
        if (connection) {
            await connection.end();
        }
        process.exit(1);
    }
})();

