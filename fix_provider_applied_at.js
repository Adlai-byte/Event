// Script to check and fix u_provider_applied_at column
const { getPool } = require('./server/db');

(async () => {
    try {
        const pool = getPool();
        
        // Check if column exists
        console.log('🔍 Checking if u_provider_applied_at column exists...');
        try {
            await pool.query('SELECT u_provider_applied_at FROM `user` LIMIT 1');
            console.log('✅ Column u_provider_applied_at exists');
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log('⚠️ Column does not exist. Creating it...');
                await pool.query('ALTER TABLE `user` ADD COLUMN u_provider_applied_at TIMESTAMP NULL DEFAULT NULL');
                console.log('✅ Column u_provider_applied_at created successfully');
            } else {
                throw err;
            }
        }
        
        // Check current values
        console.log('\n📊 Checking current u_provider_applied_at values...');
        const [rows] = await pool.query(`
            SELECT iduser, u_email, u_provider_status, u_provider_applied_at, u_created_at, u_updated_at
            FROM \`user\`
            WHERE u_provider_status IN ('pending', 'approved', 'rejected') OR u_role = 'provider'
            ORDER BY iduser DESC
            LIMIT 10
        `);
        
        console.log('\nCurrent values:');
        rows.forEach(row => {
            console.log(`User ${row.iduser} (${row.u_email}):`);
            console.log(`  Status: ${row.u_provider_status}`);
            console.log(`  Applied At: ${row.u_provider_applied_at || 'NULL'}`);
            console.log(`  Created At: ${row.u_created_at}`);
            console.log(`  Updated At: ${row.u_updated_at}`);
            console.log('');
        });
        
        // Update NULL values for pending/rejected applications to use u_updated_at if available
        console.log('🔄 Updating NULL u_provider_applied_at values...');
        const [updateResult] = await pool.query(`
            UPDATE \`user\`
            SET u_provider_applied_at = u_updated_at
            WHERE (u_provider_status IN ('pending', 'rejected') OR u_role = 'provider')
            AND u_provider_applied_at IS NULL
            AND u_updated_at IS NOT NULL
        `);
        
        console.log(`✅ Updated ${updateResult.affectedRows} records`);
        
        console.log('\n✅ Script completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
})();

