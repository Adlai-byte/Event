// Update existing user table with new columns
const mysql = require('mysql2/promise');
const { getPool } = require('../db');

async function updateUserTable() {
    const pool = getPool();
    
    try {
        console.log('Updating user table with new columns...');
        
        // Add new columns if they don't exist
        const columnsToAdd = [
            { name: 'u_role', definition: "ENUM('user', 'admin', 'provider') NOT NULL DEFAULT 'user'" },
            { name: 'u_phone', definition: 'VARCHAR(20) DEFAULT NULL' },
            { name: 'u_created_at', definition: 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP' },
            { name: 'u_updated_at', definition: 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
            { name: 'u_last_login', definition: 'TIMESTAMP NULL DEFAULT NULL' },
        ];
        
        // MySQL doesn't support IF NOT EXISTS in ALTER TABLE, so we'll check first
        for (const col of columnsToAdd) {
            try {
                // Check if column exists
                const [columns] = await pool.query(`
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'user' 
                    AND COLUMN_NAME = ?
                `, [col.name]);
                
                if (columns.length === 0) {
                    await pool.query(`ALTER TABLE \`user\` ADD COLUMN \`${col.name}\` ${col.definition}`);
                    console.log(`✓ Added column: ${col.name}`);
                } else {
                    console.log(`⊘ Column already exists: ${col.name}`);
                }
            } catch (err) {
                if (err.code !== 'ER_DUP_FIELDNAME') {
                    console.error(`Error adding column ${col.name}: ${err.message}`);
                }
            }
        }
        
        // Update admin user role
        await pool.query(
            "UPDATE `user` SET u_role = 'admin' WHERE u_email = 'admin@gmail.com'"
        );
        console.log('✓ Updated admin user role');
        
        // Add indexes if they don't exist
        try {
            // Check if index exists first
            const [indexes] = await pool.query(`
                SELECT INDEX_NAME 
                FROM INFORMATION_SCHEMA.STATISTICS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'user' 
                AND INDEX_NAME = 'idx_role'
            `);
            
            if (indexes.length === 0) {
                await pool.query("CREATE INDEX idx_role ON `user`(u_role)");
                console.log('✓ Added index on u_role');
            } else {
                console.log('⊘ Index already exists: idx_role');
            }
        } catch (err) {
            console.error('Error creating index:', err.message);
        }
        
        console.log('\n✅ User table updated successfully!');
        
    } catch (error) {
        console.error('❌ Update failed:', error);
    }
}

updateUserTable().catch(console.error);

