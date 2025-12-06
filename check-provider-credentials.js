// Quick script to check provider PayMongo credentials in the database
const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' });

async function checkCredentials() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'event',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log('\n=== Checking Provider PayMongo Credentials ===\n');
        
        const [providers] = await pool.query(`
            SELECT 
                u.iduser,
                u.u_email,
                u.u_fname,
                u.u_lname,
                u.u_role,
                u.u_paymongo_secret_key,
                u.u_paymongo_public_key,
                u.u_paymongo_mode,
                COUNT(s.idservice) as service_count
            FROM user u
            LEFT JOIN service s ON u.iduser = s.s_provider_id
            WHERE u.u_role = 'provider'
            GROUP BY u.iduser, u.u_email, u.u_fname, u.u_lname, u.u_role, 
                     u.u_paymongo_secret_key, u.u_paymongo_public_key, u.u_paymongo_mode
            ORDER BY u.u_email
        `);

        if (providers.length === 0) {
            console.log('No providers found in database.');
            return;
        }

        providers.forEach(provider => {
            console.log(`\nProvider: ${provider.u_fname} ${provider.u_lname} (${provider.u_email})`);
            console.log(`  Services: ${provider.service_count}`);
            if (provider.u_paymongo_secret_key) {
                const keyPrefix = provider.u_paymongo_secret_key.substring(0, 15) + '...';
                const mode = provider.u_paymongo_mode || (provider.u_paymongo_secret_key.startsWith('sk_test_') ? 'test' : 'live');
                console.log(`  ✅ Secret Key: ${keyPrefix}`);
                console.log(`  ✅ Mode: ${mode}`);
                if (provider.u_paymongo_public_key) {
                    const pubKeyPrefix = provider.u_paymongo_public_key.substring(0, 15) + '...';
                    console.log(`  ✅ Public Key: ${pubKeyPrefix}`);
                } else {
                    console.log(`  ⚠️  Public Key: Not set`);
                }
            } else {
                console.log(`  ❌ No PayMongo credentials configured`);
            }
        });

        console.log('\n=== Checking Recent Bookings ===\n');
        
        const [bookings] = await pool.query(`
            SELECT 
                b.idbooking,
                b.b_event_name,
                b.b_status,
                GROUP_CONCAT(DISTINCT CONCAT(u.u_fname, ' ', u.u_lname) SEPARATOR ', ') as providers
            FROM booking b
            INNER JOIN booking_service bs ON b.idbooking = bs.bs_booking_id
            INNER JOIN service s ON bs.bs_service_id = s.idservice
            INNER JOIN user u ON s.s_provider_id = u.iduser
            GROUP BY b.idbooking, b.b_event_name, b.b_status
            ORDER BY b.b_created_at DESC
            LIMIT 5
        `);

        if (bookings.length > 0) {
            bookings.forEach(booking => {
                console.log(`Booking #${booking.idbooking}: ${booking.b_event_name}`);
                console.log(`  Status: ${booking.b_status}`);
                console.log(`  Provider(s): ${booking.providers}`);
            });
        } else {
            console.log('No bookings found.');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkCredentials();











