const { getPool } = require('../db');

async function addColumnIfNotExists(pool, table, column, definition) {
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  if (rows.length === 0) {
    await pool.query(
      `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`
    );
    console.log(`  Added column ${table}.${column}`);
  } else {
    console.log(`  Column ${table}.${column} already exists — skipped`);
  }
}

exports.up = async function () {
  const pool = getPool();
  console.log('Running migration: missing_sql_sync (up)');
  
  await addColumnIfNotExists(pool, 'service', 's_cancellation_policy_id', 'INT(11) DEFAULT NULL');
  await addColumnIfNotExists(pool, 'service', 's_deposit_percent', 'DECIMAL(5,2) DEFAULT 100.00');
  await addColumnIfNotExists(pool, 'service_availability', 'sa_specific_date', 'DATE DEFAULT NULL');
  await addColumnIfNotExists(pool, 'booking', 'b_deposit_paid', 'TINYINT(1) NOT NULL DEFAULT 0');
  await addColumnIfNotExists(pool, 'booking', 'b_balance_due_date', 'DATE DEFAULT NULL');
  await addColumnIfNotExists(pool, 'service_package', 'sp_billing_type', "ENUM('hourly','daily') NOT NULL DEFAULT 'hourly'");
  
  console.log('Migration complete: missing_sql_sync');
};

exports.down = async function () {
  const pool = getPool();
  console.log('Running migration: missing_sql_sync (down)');
  
  const columns = [
    { t: 'service', c: 's_cancellation_policy_id' },
    { t: 'service', c: 's_deposit_percent' },
    { t: 'service_availability', c: 'sa_specific_date' },
    { t: 'booking', c: 'b_deposit_paid' },
    { t: 'booking', c: 'b_balance_due_date' },
    { t: 'service_package', c: 'sp_billing_type' }
  ];
  
  for (const {t, c} of columns) {
    const [rows] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [t, c]
    );
    if (rows.length > 0) {
      await pool.query(`ALTER TABLE \`${t}\` DROP COLUMN \`${c}\``);
      console.log(`  Dropped column ${t}.${c}`);
    }
  }
  
  console.log('Rollback complete: missing_sql_sync');
};
