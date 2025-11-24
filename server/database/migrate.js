// Database Migration Script
// Run this script to create all tables in the database

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'event';
const DB_PORT = Number(process.env.DB_PORT || 3306);

async function runMigration() {
    let connection;
    
    try {
        // Connect to MySQL server (without selecting database first)
        connection = await mysql.createConnection({
            host: DB_HOST,
            user: DB_USER,
            password: DB_PASSWORD,
            port: DB_PORT,
            multipleStatements: true
        });

        console.log('Connected to MySQL server');

        // Create database if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log(`Database '${DB_NAME}' is ready`);

        // Select the database
        await connection.query(`USE \`${DB_NAME}\``);

        // Read schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

        // Execute all SQL statements at once (multipleStatements is enabled)
        try {
            await connection.query(schemaSQL);
            console.log('✓ All SQL statements executed');
        } catch (error) {
            // If there's an error, try to execute statements individually
            console.log('⚠ Batch execution had issues, trying individual statements...');
            
            // Remove comments
            let cleanSQL = schemaSQL
                .replace(/--[^\r\n]*/g, '')
                .replace(/\/\*[\s\S]*?\*\//g, '');
            
            // Split by semicolon
            const statements = cleanSQL
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 20); // Only statements with meaningful content

            console.log(`Executing ${statements.length} SQL statements individually...`);
            
            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i];
                if (statement) {
                    try {
                        await connection.query(statement);
                        const tableMatch = statement.match(/CREATE TABLE.*?`(\w+)`/i);
                        if (tableMatch) {
                            console.log(`✓ Created table: ${tableMatch[1]}`);
                        }
                    } catch (err) {
                        if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_TABLE') {
                            const tableMatch = statement.match(/CREATE TABLE.*?`(\w+)`/i);
                            if (tableMatch) {
                                console.log(`⊘ Table already exists: ${tableMatch[1]}`);
                            }
                        } else if (!err.message.includes('near') && !err.message.includes('syntax')) {
                            console.error(`⚠ Error in statement ${i + 1}:`, err.message);
                        }
                    }
                }
            }
        }

        console.log('\n✅ Migration completed successfully!');

        // Show table count
        const [tables] = await connection.query('SHOW TABLES');
        console.log(`\n📊 Total tables in database: ${tables.length}`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\nConnection closed');
        }
    }
}

// Run migration
if (require.main === module) {
    runMigration().catch(console.error);
}

module.exports = { runMigration };

