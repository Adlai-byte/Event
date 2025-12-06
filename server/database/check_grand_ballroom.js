const mysql = require('mysql2/promise');

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'event'
};

async function checkGrandBallroomOwner() {
    let connection;
    try {
        connection = await mysql.createConnection(DB_CONFIG);
        
        const [rows] = await connection.query(
            `SELECT 
                s.s_name as service_name,
                u.u_fname,
                u.u_lname,
                u.u_email,
                u.u_phone
             FROM service s
             JOIN user u ON s.s_provider_id = u.iduser
             WHERE s.s_name LIKE '%Grand Ballroom%'`
        );
        
        if (rows.length > 0) {
            console.log('\n=== Grand Ballroom Owner ===');
            rows.forEach(row => {
                console.log(`Service: ${row.service_name}`);
                console.log(`Owner: ${row.u_fname} ${row.u_lname}`);
                console.log(`Email: ${row.u_email}`);
                if (row.u_phone) console.log(`Phone: ${row.u_phone}`);
                console.log('');
            });
        } else {
            console.log('Grand Ballroom service not found in database.');
        }
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkGrandBallroomOwner();















