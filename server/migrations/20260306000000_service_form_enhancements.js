/**
 * Migration: Service form enhancements
 * Adds columns: s_travel_radius_km, s_min_booking_hours, s_max_booking_hours,
 *               s_lead_time_days, s_tags, s_inclusions, s_status
 */

const { getPool } = require('../db');

/**
 * Helper: add a column only if it does not already exist.
 * Checks INFORMATION_SCHEMA to avoid errors on re-run.
 */
async function addColumnIfNotExists(pool, table, column, definition, after) {
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  if (rows.length === 0) {
    const afterClause = after ? ` AFTER \`${after}\`` : '';
    await pool.query(
      `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}${afterClause}`
    );
    console.log(`  Added column ${table}.${column}`);
  } else {
    console.log(`  Column ${table}.${column} already exists — skipped`);
  }
}

exports.up = async function () {
  const pool = getPool();

  console.log('Running migration: service_form_enhancements (up)');

  // 1. s_travel_radius_km INT DEFAULT NULL after s_address
  await addColumnIfNotExists(pool, 'service', 's_travel_radius_km',
    'INT DEFAULT NULL', 's_address');

  // 2. s_min_booking_hours DECIMAL(4,1) DEFAULT NULL after s_duration
  await addColumnIfNotExists(pool, 'service', 's_min_booking_hours',
    'DECIMAL(4,1) DEFAULT NULL', 's_duration');

  // 3. s_max_booking_hours DECIMAL(4,1) DEFAULT NULL after s_min_booking_hours
  await addColumnIfNotExists(pool, 'service', 's_max_booking_hours',
    'DECIMAL(4,1) DEFAULT NULL', 's_min_booking_hours');

  // 4. s_lead_time_days INT DEFAULT 0 after s_max_booking_hours
  await addColumnIfNotExists(pool, 'service', 's_lead_time_days',
    'INT DEFAULT 0', 's_max_booking_hours');

  // 5. s_tags JSON DEFAULT NULL after s_lead_time_days
  await addColumnIfNotExists(pool, 'service', 's_tags',
    'JSON DEFAULT NULL', 's_lead_time_days');

  // 6. s_inclusions JSON DEFAULT NULL after s_tags
  await addColumnIfNotExists(pool, 'service', 's_inclusions',
    'JSON DEFAULT NULL', 's_tags');

  // 7. s_status ENUM('draft','active','inactive') NOT NULL DEFAULT 'active' after s_is_active
  await addColumnIfNotExists(pool, 'service', 's_status',
    "ENUM('draft','active','inactive') NOT NULL DEFAULT 'active'", 's_is_active');

  // 8. Migrate existing data: sync s_status from s_is_active
  const [result] = await pool.query(`
    UPDATE \`service\`
    SET s_status = CASE WHEN s_is_active = 1 THEN 'active' ELSE 'inactive' END
    WHERE s_status = 'active' AND s_is_active = 0
  `);
  console.log(`  Synced s_status from s_is_active — ${result.affectedRows} rows updated`);

  console.log('Migration complete: service_form_enhancements');
};

exports.down = async function () {
  const pool = getPool();

  console.log('Running migration: service_form_enhancements (down)');

  const columns = [
    's_travel_radius_km', 's_min_booking_hours', 's_max_booking_hours',
    's_lead_time_days', 's_tags', 's_inclusions', 's_status',
  ];

  for (const col of columns) {
    const [rows] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service' AND COLUMN_NAME = ?`,
      [col]
    );
    if (rows.length > 0) {
      await pool.query(`ALTER TABLE \`service\` DROP COLUMN \`${col}\``);
      console.log(`  Dropped column service.${col}`);
    } else {
      console.log(`  Column service.${col} not found — skipped`);
    }
  }

  console.log('Rollback complete: service_form_enhancements');
};
