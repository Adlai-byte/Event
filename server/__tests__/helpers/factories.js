// __tests__/helpers/factories.js
// Data factory functions for integration tests.

const { getPool } = require('../../db');

let seq = 0;
function nextSeq() { return ++seq; }

async function createUser(overrides = {}) {
  const n = nextSeq();
  const defaults = {
    u_fname: `Test${n}`,
    u_lname: `User${n}`,
    u_email: `testuser${n}@event.test`,
    u_role: 'user',
  };
  const data = { ...defaults, ...overrides };
  const cols = Object.keys(data);
  const vals = Object.values(data);
  const [result] = await getPool().query(
    `INSERT INTO user (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
    vals,
  );
  return { id: result.insertId, ...data };
}

async function createService(providerId, overrides = {}) {
  const n = nextSeq();
  const defaults = {
    s_provider_id: providerId,
    s_name: `Test Service ${n}`,
    s_description: `Description ${n}`,
    s_category: 'photography',
    s_base_price: 1000 + n,
    s_city: 'Davao City',
    s_state: 'Davao del Sur',
    s_is_active: 1,
  };
  const data = { ...defaults, ...overrides };
  const cols = Object.keys(data);
  const vals = Object.values(data);
  const [result] = await getPool().query(
    `INSERT INTO service (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
    vals,
  );
  return { id: result.insertId, ...data };
}

async function createBooking(clientId, serviceId, overrides = {}) {
  const n = nextSeq();
  const defaults = {
    b_client_id: clientId,
    b_event_name: `Event ${n}`,
    b_event_date: '2026-06-15',
    b_start_time: '10:00',
    b_end_time: '16:00',
    b_location: 'Davao City',
    b_total_cost: 5000,
    b_status: 'pending',
  };
  const data = { ...defaults, ...overrides };
  const cols = Object.keys(data);
  const vals = Object.values(data);
  const [result] = await getPool().query(
    `INSERT INTO booking (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
    vals,
  );
  const bookingId = result.insertId;

  // Also insert booking_service link
  if (serviceId) {
    await getPool().query(
      `INSERT INTO booking_service (bs_booking_id, bs_service_id, bs_quantity, bs_unit_price, bs_total_price) VALUES (?,?,?,?,?)`,
      [bookingId, serviceId, 1, data.b_total_cost, data.b_total_cost],
    );
  }

  return { id: bookingId, ...data };
}

async function createPackage(serviceId, overrides = {}) {
  const n = nextSeq();
  const defaults = {
    sp_service_id: serviceId,
    sp_name: `Package ${n}`,
    sp_description: `Package description ${n}`,
    sp_base_price: 2000 + n,
  };
  const data = { ...defaults, ...overrides };
  const cols = Object.keys(data);
  const vals = Object.values(data);
  const [result] = await getPool().query(
    `INSERT INTO service_package (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
    vals,
  );
  return { id: result.insertId, ...data };
}

async function createConversation(bookingId, overrides = {}) {
  const defaults = {
    c_booking_id: bookingId,
    c_is_active: 1,
  };
  const data = { ...defaults, ...overrides };
  const cols = Object.keys(data);
  const vals = Object.values(data);
  const [result] = await getPool().query(
    `INSERT INTO conversation (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
    vals,
  );
  return { id: result.insertId, ...data };
}

async function addConversationParticipant(conversationId, userId, userEmail) {
  await getPool().query(
    `INSERT INTO conversation_participant (cp_conversation_id, cp_user_id) VALUES (?,?)`,
    [conversationId, userId],
  );
}

async function createMessage(conversationId, senderEmail, overrides = {}) {
  const n = nextSeq();
  // Resolve sender email to user ID for the message table
  const [userRows] = await getPool().query(
    'SELECT iduser FROM user WHERE u_email = ?',
    [senderEmail],
  );
  const senderId = userRows.length > 0 ? userRows[0].iduser : 1;
  const defaults = {
    m_conversation_id: conversationId,
    m_sender_id: senderId,
    m_content: `Test message ${n}`,
    m_message_type: 'text',
  };
  const data = { ...defaults, ...overrides };
  const cols = Object.keys(data);
  const vals = Object.values(data);
  const [result] = await getPool().query(
    `INSERT INTO message (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
    vals,
  );
  return { id: result.insertId, ...data };
}

async function createNotification(userEmail, overrides = {}) {
  const n = nextSeq();
  // Resolve user email to user ID for the notification table
  const [userRows] = await getPool().query(
    'SELECT iduser FROM user WHERE u_email = ?',
    [userEmail],
  );
  const userId = userRows.length > 0 ? userRows[0].iduser : 1;
  const defaults = {
    n_user_id: userId,
    n_title: `Notification ${n}`,
    n_message: `Notification message ${n}`,
    n_type: 'general',
    n_is_read: 0,
  };
  const data = { ...defaults, ...overrides };
  const cols = Object.keys(data);
  const vals = Object.values(data);
  const [result] = await getPool().query(
    `INSERT INTO notification (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
    vals,
  );
  return { id: result.insertId, ...data };
}

async function createHiringRequest(clientEmail, overrides = {}) {
  const n = nextSeq();
  // Look up the user ID from the email
  const [userRows] = await getPool().query('SELECT iduser FROM `user` WHERE u_email = ?', [clientEmail]);
  const clientId = userRows.length > 0 ? userRows[0].iduser : null;
  if (!clientId) throw new Error(`User not found for email: ${clientEmail}`);
  const defaults = {
    hr_client_id: clientId,
    hr_title: `Hiring Request ${n}`,
    hr_description: `Need help with event ${n}`,
    hr_budget_min: 1000,
    hr_budget_max: 5000,
    hr_start_date: '2026-06-01',
    hr_end_date: '2026-06-30',
    hr_city: 'Davao City',
    hr_state: 'Davao del Sur',
    hr_status: 'open',
  };
  const data = { ...defaults, ...overrides };
  const cols = Object.keys(data);
  const vals = Object.values(data);
  const [result] = await getPool().query(
    `INSERT INTO hiring_request (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
    vals,
  );
  return { id: result.insertId, ...data };
}

async function createProposal(hiringRequestId, providerEmail, overrides = {}) {
  const n = nextSeq();
  // Look up the provider user ID from the email
  const [userRows] = await getPool().query('SELECT iduser FROM `user` WHERE u_email = ?', [providerEmail]);
  const providerId = userRows.length > 0 ? userRows[0].iduser : null;
  if (!providerId) throw new Error(`Provider not found for email: ${providerEmail}`);
  const defaults = {
    p_hiring_request_id: hiringRequestId,
    p_provider_id: providerId,
    p_title: `Proposal ${n}`,
    p_description: `Proposal description ${n}`,
    p_proposed_budget: 3000 + n,
    p_start_date: '2026-06-01',
    p_end_date: '2026-06-30',
    p_status: 'submitted',
  };
  const data = { ...defaults, ...overrides };
  const cols = Object.keys(data);
  const vals = Object.values(data);
  const [result] = await getPool().query(
    `INSERT INTO proposal (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
    vals,
  );
  return { id: result.insertId, ...data };
}

async function createJobPosting(providerEmail, overrides = {}) {
  const n = nextSeq();
  const defaults = {
    jp_provider_email: providerEmail,
    jp_job_title: `Job Posting ${n}`,
    jp_description: `Job description ${n}`,
    jp_deadline_date: '2026-12-31',
    jp_status: 'active',
  };
  const data = { ...defaults, ...overrides };
  const cols = Object.keys(data);
  const vals = Object.values(data);
  // Ensure the table and job_type column exist before inserting
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS \`provider_job_posting\` (
      \`idjob_posting\` INT(11) NOT NULL AUTO_INCREMENT,
      \`jp_provider_email\` VARCHAR(255) NOT NULL,
      \`jp_job_title\` VARCHAR(200) NOT NULL,
      \`jp_description\` TEXT NOT NULL,
      \`jp_deadline_date\` DATE NOT NULL,
      \`jp_status\` ENUM('active', 'closed', 'expired') NOT NULL DEFAULT 'active',
      \`jp_created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`jp_updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`idjob_posting\`),
      INDEX \`idx_provider\` (\`jp_provider_email\`),
      INDEX \`idx_status\` (\`jp_status\`),
      INDEX \`idx_deadline\` (\`jp_deadline_date\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  const [result] = await getPool().query(
    `INSERT INTO provider_job_posting (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
    vals,
  );
  return { id: result.insertId, ...data };
}

async function createJobApplication(jobPostingId, applicantEmail, overrides = {}) {
  const n = nextSeq();
  const defaults = {
    ja_job_posting_id: jobPostingId,
    ja_user_email: applicantEmail,
    ja_resume_file: Buffer.from('fake-pdf-content'),
    ja_resume_file_name: `resume_${n}.pdf`,
    ja_status: 'pending',
  };
  const data = { ...defaults, ...overrides };
  const cols = Object.keys(data);
  const vals = Object.values(data);
  // Ensure the job_application table exists
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS \`job_application\` (
      \`idjob_application\` INT(11) NOT NULL AUTO_INCREMENT,
      \`ja_job_posting_id\` INT(11) NOT NULL,
      \`ja_user_email\` VARCHAR(255) NOT NULL,
      \`ja_resume_file\` LONGBLOB NOT NULL,
      \`ja_resume_file_name\` VARCHAR(255) NOT NULL,
      \`ja_status\` ENUM('pending', 'reviewed', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
      \`ja_created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`ja_updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`idjob_application\`),
      INDEX \`idx_job_posting\` (\`ja_job_posting_id\`),
      INDEX \`idx_user\` (\`ja_user_email\`),
      INDEX \`idx_status\` (\`ja_status\`),
      FOREIGN KEY (\`ja_job_posting_id\`) REFERENCES \`provider_job_posting\`(\`idjob_posting\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  const [result] = await getPool().query(
    `INSERT INTO job_application (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
    vals,
  );
  return { id: result.insertId, ...data };
}

async function createPaymentMethod(userEmail, overrides = {}) {
  const n = nextSeq();
  // Resolve user email to user ID (pm_user_id is an integer FK)
  const [userRows] = await getPool().query(
    'SELECT iduser FROM user WHERE u_email = ?',
    [userEmail],
  );
  const userId = userRows.length > 0 ? userRows[0].iduser : null;
  if (!userId) throw new Error(`User not found for email: ${userEmail}`);
  const defaults = {
    pm_user_id: userId,
    pm_type: 'gcash',
    pm_account_name: `Account ${n}`,
    pm_account_number: `0900000${n}`,
    pm_is_default: 0,
  };
  const data = { ...defaults, ...overrides };
  const cols = Object.keys(data);
  const vals = Object.values(data);
  const [result] = await getPool().query(
    `INSERT INTO payment_method (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
    vals,
  );
  return { id: result.insertId, ...data };
}

async function createCompletedPayment(bookingId, userEmail) {
  const [userRows] = await getPool().query(
    'SELECT iduser FROM user WHERE u_email = ?',
    [userEmail],
  );
  const userId = userRows.length > 0 ? userRows[0].iduser : null;
  if (!userId) throw new Error(`User not found for email: ${userEmail}`);
  const [result] = await getPool().query(
    `INSERT INTO payment (p_booking_id, p_user_id, p_amount, p_currency, p_status, p_payment_method, p_transaction_id)
     VALUES (?, ?, 5000, 'PHP', 'completed', 'Cash on Hand', ?)`,
    [bookingId, userId, `TEST-${Date.now()}-${bookingId}`],
  );
  return { id: result.insertId };
}

module.exports = {
  createUser,
  createService,
  createBooking,
  createPackage,
  createConversation,
  addConversationParticipant,
  createMessage,
  createNotification,
  createHiringRequest,
  createProposal,
  createJobPosting,
  createJobApplication,
  createPaymentMethod,
  createCompletedPayment,
};
