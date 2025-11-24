const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function updateImageColumn() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'event',
    waitForConnections: true,
    connectionLimit: 10
  });

  try {
    console.log('Updating si_image_url column to TEXT...');
    await pool.query('ALTER TABLE service_image MODIFY COLUMN si_image_url TEXT NOT NULL');
    console.log('✅ Column updated successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error updating column:', err.message);
    process.exit(1);
  }
}

updateImageColumn();




