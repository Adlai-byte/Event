const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'event',
    multipleStatements: true
};

async function createPaymentMethodsTable() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(DB_CONFIG);
        console.log('✓ Connected to database');

        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS \`payment_method\` (
                \`idpayment_method\` INT(11) NOT NULL AUTO_INCREMENT,
                \`pm_user_id\` INT(11) NOT NULL,
                \`pm_type\` ENUM('gcash', 'paymaya', 'bank', 'credit_card') NOT NULL DEFAULT 'gcash',
                \`pm_account_name\` VARCHAR(100) NOT NULL,
                \`pm_account_number\` VARCHAR(50) NOT NULL,
                \`pm_is_default\` TINYINT(1) NOT NULL DEFAULT 0,
                \`pm_created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`pm_updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`idpayment_method\`),
                INDEX \`idx_user\` (\`pm_user_id\`),
                INDEX \`idx_default\` (\`pm_user_id\`, \`pm_is_default\`),
                FOREIGN KEY (\`pm_user_id\`) REFERENCES \`user\`(\`iduser\`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        console.log('Creating payment_method table...');
        await connection.query(createTableSQL);
        console.log('✓ payment_method table created successfully!');

        // Verify table exists
        const [tables] = await connection.query(
            "SHOW TABLES LIKE 'payment_method'"
        );
        if (tables.length > 0) {
            console.log('✓ Table verification: payment_method exists');
        } else {
            console.log('✗ Warning: Table verification failed');
        }

    } catch (err) {
        console.error('✗ Error creating payment_method table:', err.message);
        if (err.code === 'ER_NO_SUCH_TABLE') {
            console.error('  Note: Referenced table (user) might not exist. Please ensure the user table exists first.');
        }
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('✓ Database connection closed');
        }
    }
}

// Run the script
createPaymentMethodsTable()
    .then(() => {
        console.log('\n✅ Script completed successfully!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n❌ Script failed:', err);
        process.exit(1);
    });





