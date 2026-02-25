// server/svc/hiringService.js
// Pure database queries and business logic for hiring, proposals, job postings, and job applications.
// No req/res knowledge — takes plain params, returns data or throws.

const { getPool } = require('../db');

// ============================================
// Shared SQL fragments
// ============================================

const JOB_POSTING_TABLE_DDL = `
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const JOB_APPLICATION_TABLE_DDL = `
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const NOTIFICATION_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS \`notification\` (
    \`idnotification\` INT(11) NOT NULL AUTO_INCREMENT,
    \`n_user_id\` INT(11) NOT NULL,
    \`n_title\` VARCHAR(255) NOT NULL,
    \`n_message\` TEXT NOT NULL,
    \`n_type\` VARCHAR(50) NOT NULL DEFAULT 'info',
    \`n_is_read\` TINYINT(1) NOT NULL DEFAULT 0,
    \`n_created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`idnotification\`),
    INDEX \`idx_user\` (\`n_user_id\`),
    INDEX \`idx_read\` (\`n_is_read\`),
    INDEX \`idx_created\` (\`n_created_at\`),
    FOREIGN KEY (\`n_user_id\`) REFERENCES \`user\`(\`iduser\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

// ============================================
// Helpers
// ============================================

async function ensureJobPostingTable() {
  const pool = getPool();
  await pool.query(JOB_POSTING_TABLE_DDL);
}

async function ensureJobApplicationTable() {
  const pool = getPool();
  await pool.query(JOB_APPLICATION_TABLE_DDL);
}

async function ensureNotificationTable() {
  const pool = getPool();
  await pool.query(NOTIFICATION_TABLE_DDL);
}

async function ensureJobTypeColumn() {
  const pool = getPool();
  try {
    await pool.query(
      "ALTER TABLE `provider_job_posting` ADD COLUMN `jp_job_type` ENUM('full_time', 'part_time') NOT NULL DEFAULT 'full_time' AFTER `jp_deadline_date`"
    );
  } catch (alterErr) {
    // Column might already exist, ignore error
    if (alterErr.message && !alterErr.message.includes('Duplicate column name')) {
      console.log('Note: jp_job_type column may already exist');
    }
  }
}

async function ensureInterviewColumns() {
  const pool = getPool();
  try {
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'job_application'
      AND COLUMN_NAME IN ('ja_interview_date', 'ja_interview_time', 'ja_interview_description', 'ja_rejection_note')
    `);

    const existingColumns = columns.map((col) => col.COLUMN_NAME);

    if (!existingColumns.includes('ja_interview_date')) {
      await pool.query(`ALTER TABLE job_application ADD COLUMN ja_interview_date DATE NULL`);
    }
    if (!existingColumns.includes('ja_interview_time')) {
      await pool.query(`ALTER TABLE job_application ADD COLUMN ja_interview_time TIME NULL`);
    }
    if (!existingColumns.includes('ja_interview_description')) {
      await pool.query(`ALTER TABLE job_application ADD COLUMN ja_interview_description TEXT NULL`);
    }
    if (!existingColumns.includes('ja_rejection_note')) {
      await pool.query(`ALTER TABLE job_application ADD COLUMN ja_rejection_note TEXT NULL`);
    }
  } catch (alterErr) {
    console.log('Note: Interview/rejection columns check failed:', alterErr.message);
  }
}

async function ensureHireNoteColumn() {
  const pool = getPool();
  try {
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'job_application'
      AND COLUMN_NAME = 'ja_hire_note'
    `);
    if (columns.length === 0) {
      await pool.query(`ALTER TABLE job_application ADD COLUMN ja_hire_note TEXT NULL`);
    }
  } catch (alterErr) {
    console.log('Note: Hire note column check failed:', alterErr.message);
  }
}

async function ensureRejectionNoteColumn() {
  const pool = getPool();
  try {
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'job_application'
      AND COLUMN_NAME = 'ja_rejection_note'
    `);
    if (columns.length === 0) {
      await pool.query(`ALTER TABLE job_application ADD COLUMN ja_rejection_note TEXT NULL`);
    }
  } catch (alterErr) {
    console.log('Note: Rejection note column check failed:', alterErr.message);
  }
}

/**
 * Resolve a clientId/providerId that may be an email string to a numeric user ID.
 * Returns the numeric user ID or null if not found.
 */
async function resolveUserId(idOrEmail) {
  const pool = getPool();
  let userId = parseInt(idOrEmail);
  if (isNaN(userId)) {
    const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [idOrEmail]);
    if (userRows.length === 0) return null;
    userId = userRows[0].iduser;
  }
  return userId;
}

/**
 * Map a raw hiring_request row (with aggregated requirements/skills) to the API shape.
 */
function mapHiringRequestRow(row) {
  return {
    idhiring_request: row.idhiring_request,
    hr_client_id: row.hr_client_id,
    hr_provider_id: row.hr_provider_id,
    hr_service_id: row.hr_service_id,
    hr_event_id: row.hr_event_id,
    hr_title: row.hr_title,
    hr_description: row.hr_description,
    hr_budget_min: row.hr_budget_min,
    hr_budget_max: row.hr_budget_max,
    hr_currency: row.hr_currency,
    hr_start_date: row.hr_start_date,
    hr_end_date: row.hr_end_date,
    hr_is_flexible: row.hr_is_flexible,
    hr_city: row.hr_city,
    hr_state: row.hr_state,
    hr_address: row.hr_address,
    hr_location_type: row.hr_location_type,
    hr_status: row.hr_status,
    hr_experience_level: row.hr_experience_level,
    hr_contract_type: row.hr_contract_type,
    hr_selected_proposal_id: row.hr_selected_proposal_id,
    hr_created_at: row.hr_created_at,
    hr_updated_at: row.hr_updated_at,
    requirements: row.requirements ? row.requirements.split('|||') : [],
    skills: row.skills ? row.skills.split('|||') : [],
  };
}

// ============================================
// HIRING REQUESTS
// ============================================

/**
 * Create a new hiring request with requirements and skills.
 * @returns {{ hiringRequestId: number }}
 */
async function createHiringRequest({
  clientId, serviceId, eventId, title, description,
  budget, timeline, location, requirements, skillsRequired,
  experienceLevel, contractType, status,
}) {
  const pool = getPool();

  const userId = await resolveUserId(clientId);
  if (userId === null) {
    const err = new Error('Client not found');
    err.statusCode = 404;
    err.errorCode = 'NOT_FOUND';
    throw err;
  }

  const [result] = await pool.query(`
    INSERT INTO hiring_request (
      hr_client_id, hr_service_id, hr_event_id, hr_title, hr_description,
      hr_budget_min, hr_budget_max, hr_currency,
      hr_start_date, hr_end_date, hr_is_flexible,
      hr_city, hr_state, hr_address, hr_location_type,
      hr_status, hr_experience_level, hr_contract_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    userId,
    serviceId ? parseInt(serviceId) : null,
    eventId ? parseInt(eventId) : null,
    title,
    description,
    budget.min || 0,
    budget.max || 0,
    budget.currency || 'PHP',
    timeline.startDate,
    timeline.endDate,
    timeline.isFlexible ? 1 : 0,
    location.city || '',
    location.state || '',
    location.address || null,
    location.type || 'on-site',
    status,
    experienceLevel || 'any',
    contractType || 'fixed_price',
  ]);

  const hiringRequestId = result.insertId;

  // Insert requirements
  if (requirements && Array.isArray(requirements) && requirements.length > 0) {
    const requirementValues = requirements.map((r, index) => [hiringRequestId, r, index]);
    await pool.query(`
      INSERT INTO hiring_requirement (hrq_hiring_request_id, hrq_requirement, hrq_order)
      VALUES ?
    `, [requirementValues]);
  }

  // Insert skills
  if (skillsRequired && Array.isArray(skillsRequired) && skillsRequired.length > 0) {
    const skillValues = skillsRequired.map(skill => [hiringRequestId, skill]);
    await pool.query(`
      INSERT INTO hiring_skill (hs_hiring_request_id, hs_skill)
      VALUES ?
    `, [skillValues]);
  }

  return { hiringRequestId };
}

/**
 * Get hiring requests with optional filters.
 * @returns {{ hiringRequests: Array }}
 */
async function getHiringRequests({ clientId, providerId, status, serviceId, maxBudget, location, hiringRequestId }) {
  const pool = getPool();

  let query = `
    SELECT hr.*,
      GROUP_CONCAT(DISTINCT hrq.hrq_requirement ORDER BY hrq.hrq_order SEPARATOR '|||') as requirements,
      GROUP_CONCAT(DISTINCT hs.hs_skill SEPARATOR '|||') as skills
    FROM hiring_request hr
    LEFT JOIN hiring_requirement hrq ON hr.idhiring_request = hrq.hrq_hiring_request_id
    LEFT JOIN hiring_skill hs ON hr.idhiring_request = hs.hs_hiring_request_id
    WHERE 1=1
  `;
  const params = [];

  if (hiringRequestId) {
    query += ' AND hr.idhiring_request = ?';
    params.push(parseInt(hiringRequestId));
  } else if (clientId) {
    const userId = await resolveUserId(clientId);
    if (userId !== null) {
      query += ' AND hr.hr_client_id = ?';
      params.push(userId);
    }
  }

  if (status) {
    query += ' AND hr.hr_status = ?';
    params.push(status);
  }
  if (serviceId) {
    query += ' AND hr.hr_service_id = ?';
    params.push(parseInt(serviceId));
  }
  if (maxBudget) {
    query += ' AND hr.hr_budget_max <= ?';
    params.push(parseFloat(maxBudget));
  }
  if (location) {
    query += ' AND (hr.hr_city LIKE ? OR hr.hr_state LIKE ?)';
    const locationParam = `%${location}%`;
    params.push(locationParam, locationParam);
  }

  query += ' GROUP BY hr.idhiring_request ORDER BY hr.hr_created_at DESC';

  const [rows] = await pool.query(query, params);
  return { hiringRequests: rows.map(mapHiringRequestRow) };
}

/**
 * Get a single hiring request by id.
 * @returns {{ hiringRequest: Object }} or null if not found
 */
async function getHiringRequestById(id) {
  const pool = getPool();
  const [rows] = await pool.query(`
    SELECT hr.*,
      GROUP_CONCAT(DISTINCT hrq.hrq_requirement ORDER BY hrq.hrq_order SEPARATOR '|||') as requirements,
      GROUP_CONCAT(DISTINCT hs.hs_skill SEPARATOR '|||') as skills
    FROM hiring_request hr
    LEFT JOIN hiring_requirement hrq ON hr.idhiring_request = hrq.hrq_hiring_request_id
    LEFT JOIN hiring_skill hs ON hr.idhiring_request = hs.hs_hiring_request_id
    WHERE hr.idhiring_request = ?
    GROUP BY hr.idhiring_request
  `, [id]);

  if (rows.length === 0) return null;
  return { hiringRequest: mapHiringRequestRow(rows[0]) };
}

/**
 * Update a hiring request. Returns the client email if status changed (for socket events).
 * @returns {{ clientEmail: string|null }}
 */
async function updateHiringRequest(id, updates) {
  const pool = getPool();

  const updateFields = [];
  const updateValues = [];

  if (updates.title !== undefined) {
    updateFields.push('hr_title = ?');
    updateValues.push(updates.title);
  }
  if (updates.description !== undefined) {
    updateFields.push('hr_description = ?');
    updateValues.push(updates.description);
  }
  if (updates.status !== undefined) {
    updateFields.push('hr_status = ?');
    updateValues.push(updates.status);
  }
  if (updates.budget) {
    if (updates.budget.min !== undefined) {
      updateFields.push('hr_budget_min = ?');
      updateValues.push(updates.budget.min);
    }
    if (updates.budget.max !== undefined) {
      updateFields.push('hr_budget_max = ?');
      updateValues.push(updates.budget.max);
    }
    if (updates.budget.currency !== undefined) {
      updateFields.push('hr_currency = ?');
      updateValues.push(updates.budget.currency);
    }
  }
  if (updates.timeline) {
    if (updates.timeline.startDate) {
      updateFields.push('hr_start_date = ?');
      updateValues.push(updates.timeline.startDate);
    }
    if (updates.timeline.endDate) {
      updateFields.push('hr_end_date = ?');
      updateValues.push(updates.timeline.endDate);
    }
    if (updates.timeline.isFlexible !== undefined) {
      updateFields.push('hr_is_flexible = ?');
      updateValues.push(updates.timeline.isFlexible ? 1 : 0);
    }
  }
  if (updates.location) {
    if (updates.location.city !== undefined) {
      updateFields.push('hr_city = ?');
      updateValues.push(updates.location.city);
    }
    if (updates.location.state !== undefined) {
      updateFields.push('hr_state = ?');
      updateValues.push(updates.location.state);
    }
    if (updates.location.address !== undefined) {
      updateFields.push('hr_address = ?');
      updateValues.push(updates.location.address);
    }
    if (updates.location.type !== undefined) {
      updateFields.push('hr_location_type = ?');
      updateValues.push(updates.location.type);
    }
  }

  if (updateFields.length === 0) {
    const err = new Error('No fields to update');
    err.statusCode = 400;
    err.errorCode = 'VALIDATION_ERROR';
    throw err;
  }

  updateValues.push(id);
  await pool.query(
    `UPDATE hiring_request SET ${updateFields.join(', ')} WHERE idhiring_request = ?`,
    updateValues
  );

  // Update requirements if provided
  if (updates.requirements && Array.isArray(updates.requirements)) {
    await pool.query('DELETE FROM hiring_requirement WHERE hrq_hiring_request_id = ?', [id]);
    if (updates.requirements.length > 0) {
      const requirementValues = updates.requirements.map((r, index) => [id, r, index]);
      await pool.query(`
        INSERT INTO hiring_requirement (hrq_hiring_request_id, hrq_requirement, hrq_order)
        VALUES ?
      `, [requirementValues]);
    }
  }

  // Update skills if provided
  if (updates.skillsRequired && Array.isArray(updates.skillsRequired)) {
    await pool.query('DELETE FROM hiring_skill WHERE hs_hiring_request_id = ?', [id]);
    if (updates.skillsRequired.length > 0) {
      const skillValues = updates.skillsRequired.map(skill => [id, skill]);
      await pool.query(`
        INSERT INTO hiring_skill (hs_hiring_request_id, hs_skill)
        VALUES ?
      `, [skillValues]);
    }
  }

  // If status changed, return the client email for socket notification
  let clientEmail = null;
  if (updates.status !== undefined) {
    const [emailRows] = await pool.query(
      `SELECT u.u_email AS clientEmail
       FROM hiring_request hr
       INNER JOIN user u ON hr.hr_client_id = u.iduser
       WHERE hr.idhiring_request = ?`,
      [id]
    );
    if (emailRows.length > 0) {
      clientEmail = emailRows[0].clientEmail;
    }
  }

  return { clientEmail };
}

// ============================================
// PROPOSALS
// ============================================

/**
 * Create a new proposal with deliverables.
 * @returns {{ proposalId: number }}
 */
async function createProposal({
  providerId, hiringRequestId, title, description,
  proposedBudget, timeline, deliverables, terms, status,
}) {
  const pool = getPool();

  const userId = await resolveUserId(providerId);
  if (userId === null) {
    const err = new Error('Provider not found');
    err.statusCode = 404;
    err.errorCode = 'NOT_FOUND';
    throw err;
  }

  const [result] = await pool.query(`
    INSERT INTO proposal (
      p_provider_id, p_hiring_request_id, p_title, p_description,
      p_proposed_budget, p_start_date, p_end_date, p_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    userId,
    parseInt(hiringRequestId),
    title,
    description,
    proposedBudget,
    timeline.startDate,
    timeline.endDate,
    status,
  ]);

  const proposalId = result.insertId;

  // Insert deliverables
  if (deliverables && Array.isArray(deliverables) && deliverables.length > 0) {
    const deliverableValues = deliverables.map((del, index) => [proposalId, del, index]);
    await pool.query(`
      INSERT INTO proposal_deliverable (pd_proposal_id, pd_deliverable, pd_order)
      VALUES ?
    `, [deliverableValues]);
  }

  return { proposalId };
}

/**
 * Get proposals with optional filters.
 * @returns {{ proposals: Array }}
 */
async function getProposals({ providerId, hiringRequestId, proposalId }) {
  const pool = getPool();

  let query = `
    SELECT p.*,
      GROUP_CONCAT(DISTINCT pd.pd_deliverable ORDER BY pd.pd_order SEPARATOR '|||') as deliverables
    FROM proposal p
    LEFT JOIN proposal_deliverable pd ON p.idproposal = pd.pd_proposal_id
    WHERE 1=1
  `;
  const params = [];

  if (proposalId) {
    query += ' AND p.idproposal = ?';
    params.push(parseInt(proposalId));
  } else if (providerId) {
    const userId = await resolveUserId(providerId);
    if (userId !== null) {
      query += ' AND p.p_provider_id = ?';
      params.push(userId);
    }
  } else if (hiringRequestId) {
    query += ' AND p.p_hiring_request_id = ?';
    params.push(parseInt(hiringRequestId));
  }

  query += ' GROUP BY p.idproposal ORDER BY p.p_submitted_at DESC';

  const [rows] = await pool.query(query, params);

  const proposals = rows.map(row => ({
    idproposal: row.idproposal,
    p_provider_id: row.p_provider_id,
    p_hiring_request_id: row.p_hiring_request_id,
    p_title: row.p_title,
    p_description: row.p_description,
    p_proposed_budget: row.p_proposed_budget,
    p_start_date: row.p_start_date,
    p_end_date: row.p_end_date,
    p_status: row.p_status,
    p_client_feedback: row.p_client_feedback,
    p_submitted_at: row.p_submitted_at,
    p_updated_at: row.p_updated_at,
    deliverables: row.deliverables ? row.deliverables.split('|||') : [],
  }));

  return { proposals };
}

/**
 * Accept a proposal — within a transaction: accept the proposal, close the hiring request,
 * and reject all other proposals. Returns client+provider emails for socket events.
 * @returns {{ clientEmail: string|null, providerEmail: string|null }}
 */
async function acceptProposal(proposalId, hiringRequestId) {
  const pool = getPool();

  await pool.query('START TRANSACTION');
  try {
    // Update proposal status
    await pool.query(
      'UPDATE proposal SET p_status = ? WHERE idproposal = ?',
      ['accepted', proposalId]
    );

    // Update hiring request
    await pool.query(
      'UPDATE hiring_request SET hr_status = ?, hr_selected_proposal_id = ? WHERE idhiring_request = ?',
      ['closed', proposalId, parseInt(hiringRequestId)]
    );

    // Reject other proposals for this hiring request
    await pool.query(
      'UPDATE proposal SET p_status = ? WHERE p_hiring_request_id = ? AND idproposal != ?',
      ['rejected', parseInt(hiringRequestId), proposalId]
    );

    await pool.query('COMMIT');
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }

  // Fetch emails for socket events (outside transaction)
  const [emailRows] = await pool.query(
    `SELECT
       (SELECT u.u_email FROM user u WHERE u.iduser = hr.hr_client_id) AS clientEmail,
       (SELECT u.u_email FROM user u WHERE u.iduser = p.p_provider_id) AS providerEmail
     FROM proposal p
     INNER JOIN hiring_request hr ON p.p_hiring_request_id = hr.idhiring_request
     WHERE p.idproposal = ?`,
    [proposalId]
  );

  return {
    clientEmail: emailRows.length > 0 ? emailRows[0].clientEmail : null,
    providerEmail: emailRows.length > 0 ? emailRows[0].providerEmail : null,
  };
}

/**
 * Reject a proposal with optional reason. Returns provider email for socket events.
 * @returns {{ providerEmail: string|null }}
 */
async function rejectProposal(proposalId, reason) {
  const pool = getPool();

  await pool.query(
    'UPDATE proposal SET p_status = ?, p_client_feedback = ? WHERE idproposal = ?',
    ['rejected', reason || 'Proposal rejected', proposalId]
  );

  const [emailRows] = await pool.query(
    `SELECT u.u_email AS providerEmail
     FROM proposal p
     INNER JOIN user u ON p.p_provider_id = u.iduser
     WHERE p.idproposal = ?`,
    [proposalId]
  );

  return {
    providerEmail: emailRows.length > 0 ? emailRows[0].providerEmail : null,
  };
}

// ============================================
// JOB POSTINGS
// ============================================

/**
 * Initialize the provider_job_posting table.
 */
async function initJobPostingTable() {
  await ensureJobPostingTable();
  return { message: 'Table created successfully' };
}

/**
 * Get all job postings for a specific provider.
 * @returns {{ jobPostings: Array }}
 */
async function getProviderJobPostings(providerEmail) {
  const pool = getPool();

  await ensureJobPostingTable();

  // Update expired postings
  await pool.query(
    `UPDATE provider_job_posting
     SET jp_status = 'expired'
     WHERE jp_provider_email = ?
     AND jp_deadline_date < CURDATE()
     AND jp_status = 'active'`,
    [providerEmail]
  );

  await ensureJobTypeColumn();

  const [rows] = await pool.query(
    `SELECT
       jp.idjob_posting as id,
       jp.jp_job_title as jobTitle,
       jp.jp_description as description,
       jp.jp_deadline_date as deadlineDate,
       COALESCE(jp.jp_job_type, 'full_time') as jobType,
       jp.jp_status as status,
       jp.jp_created_at as createdAt,
       jp.jp_updated_at as updatedAt,
       TRIM(CONCAT_WS(', ',
         NULLIF(u.u_address, ''),
         NULLIF(u.u_city, ''),
         NULLIF(CONCAT(u.u_state, ' ', u.u_zip_code), ' ')
       )) as location
     FROM provider_job_posting jp
     LEFT JOIN user u ON jp.jp_provider_email COLLATE utf8mb4_unicode_ci = u.u_email COLLATE utf8mb4_unicode_ci
     WHERE jp.jp_provider_email = ?
     ORDER BY jp.jp_created_at DESC`,
    [providerEmail]
  );

  return { jobPostings: rows };
}

/**
 * Create a new job posting.
 * @returns {{ message: string, jobPostingId: number }}
 */
async function createJobPosting({ providerEmail, jobTitle, description, deadlineDate, jobType }) {
  const pool = getPool();

  await ensureJobPostingTable();
  await ensureJobTypeColumn();

  const [result] = await pool.query(
    `INSERT INTO provider_job_posting
     (jp_provider_email, jp_job_title, jp_description, jp_deadline_date, jp_job_type, jp_status)
     VALUES (?, ?, ?, ?, ?, 'active')`,
    [providerEmail, jobTitle, description, deadlineDate, jobType]
  );

  return { message: 'Job posting created successfully', jobPostingId: result.insertId };
}

/**
 * Update a job posting. Caller is responsible for validation (deadline in future, etc.).
 * @param {number} jobPostingId
 * @param {string} providerEmail
 * @param {{ jobTitle?: string, description?: string, deadlineDate?: string, status?: string }} fields
 */
async function updateJobPosting(jobPostingId, providerEmail, fields) {
  const pool = getPool();

  const updates = [];
  const values = [];

  if (fields.jobTitle) {
    updates.push('jp_job_title = ?');
    values.push(fields.jobTitle);
  }
  if (fields.description) {
    updates.push('jp_description = ?');
    values.push(fields.description);
  }
  if (fields.deadlineDate) {
    updates.push('jp_deadline_date = ?');
    values.push(fields.deadlineDate);
  }
  if (fields.status) {
    updates.push('jp_status = ?');
    values.push(fields.status);
  }

  if (updates.length === 0) {
    const err = new Error('No fields to update');
    err.statusCode = 400;
    err.errorCode = 'VALIDATION_ERROR';
    throw err;
  }

  values.push(jobPostingId, providerEmail);

  await pool.query(
    `UPDATE provider_job_posting
     SET ${updates.join(', ')}
     WHERE idjob_posting = ? AND jp_provider_email = ?`,
    values
  );

  return { message: 'Job posting updated successfully' };
}

/**
 * Delete a job posting.
 */
async function deleteJobPosting(jobPostingId, providerEmail) {
  const pool = getPool();

  await pool.query(
    `DELETE FROM provider_job_posting
     WHERE idjob_posting = ? AND jp_provider_email = ?`,
    [jobPostingId, providerEmail]
  );

  return { message: 'Job posting deleted successfully' };
}

/**
 * Get all active job postings (public, paginated).
 * @returns {{ rows: Array, total: number }}
 */
async function getPublicJobPostings({ status = 'active', search, limit, offset }) {
  const pool = getPool();

  await ensureJobPostingTable();

  // Update expired postings
  await pool.query(
    `UPDATE provider_job_posting
     SET jp_status = 'expired'
     WHERE jp_deadline_date < CURDATE()
     AND jp_status = 'active'`
  );

  await ensureJobTypeColumn();

  const fromClause = `
    FROM provider_job_posting jp
    LEFT JOIN user u ON jp.jp_provider_email COLLATE utf8mb4_unicode_ci = u.u_email COLLATE utf8mb4_unicode_ci`;
  let where = ' WHERE 1=1';
  const params = [];

  if (status && status !== 'all') {
    where += ` AND jp.jp_status = ?`;
    params.push(status);
  } else {
    where += ` AND jp.jp_status IN ('active', 'closed')`;
  }

  if (search) {
    where += ` AND (jp.jp_job_title LIKE ? OR jp.jp_description LIKE ?)`;
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
  }

  // Count total matching rows
  const [countResult] = await pool.query(
    `SELECT COUNT(*) as total ${fromClause}${where}`, params
  );
  const total = countResult[0].total;

  // Main query with pagination
  const selectClause = `
    SELECT
      jp.idjob_posting as id,
      jp.jp_job_title as jobTitle,
      jp.jp_description as description,
      jp.jp_deadline_date as deadlineDate,
      COALESCE(jp.jp_job_type, 'full_time') as jobType,
      jp.jp_status as status,
      jp.jp_created_at as createdAt,
      jp.jp_updated_at as updatedAt,
      u.u_fname as providerFirstName,
      u.u_lname as providerLastName,
      u.u_email as providerEmail,
      TRIM(CONCAT_WS(', ',
        NULLIF(u.u_address, ''),
        NULLIF(u.u_city, ''),
        NULLIF(CONCAT(u.u_state, ' ', u.u_zip_code), ' ')
      )) as location`;

  const paginationParams = [...params, limit, offset];
  const [rows] = await pool.query(
    `${selectClause}${fromClause}${where} ORDER BY jp.jp_created_at DESC LIMIT ? OFFSET ?`,
    paginationParams
  );

  return { rows, total };
}

// ============================================
// JOB APPLICATIONS
// ============================================

/**
 * Initialize the job_application table.
 */
async function initJobApplicationTable() {
  await ensureJobApplicationTable();
  return { message: 'Table created successfully' };
}

/**
 * Submit a job application.
 */
async function submitJobApplication({ jobPostingId, userEmail, resumeFile, resumeFileName }) {
  const pool = getPool();

  await ensureJobApplicationTable();

  // Check if user already applied
  const [existing] = await pool.query(
    `SELECT idjob_application FROM job_application
     WHERE ja_job_posting_id = ? AND ja_user_email = ?`,
    [jobPostingId, userEmail]
  );

  if (existing.length > 0) {
    const err = new Error('You have already applied to this job posting');
    err.statusCode = 409;
    err.errorCode = 'CONFLICT';
    throw err;
  }

  // Convert base64 to buffer
  const resumeBuffer = Buffer.from(resumeFile, 'base64');

  await pool.query(
    `INSERT INTO job_application
     (ja_job_posting_id, ja_user_email, ja_resume_file, ja_resume_file_name, ja_status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [jobPostingId, userEmail, resumeBuffer, resumeFileName]
  );

  return { message: 'Application submitted successfully' };
}

/**
 * Get job applications for a provider's job postings.
 * @returns {{ applications: Array }}
 */
async function getProviderJobApplications(providerEmail, jobPostingId) {
  const pool = getPool();

  await ensureInterviewColumns();

  let query = `
    SELECT
      ja.idjob_application as id,
      ja.ja_job_posting_id as jobPostingId,
      ja.ja_user_email as userEmail,
      ja.ja_resume_file_name as resumeFileName,
      ja.ja_status as status,
      ja.ja_interview_date as interviewDate,
      ja.ja_interview_time as interviewTime,
      ja.ja_interview_description as interviewDescription,
      ja.ja_rejection_note as rejectionNote,
      ja.ja_created_at as appliedAt,
      jp.jp_job_title as jobTitle,
      u.u_fname as applicantFirstName,
      u.u_lname as applicantLastName,
      u.u_email as applicantEmail
    FROM job_application ja
    INNER JOIN provider_job_posting jp ON ja.ja_job_posting_id = jp.idjob_posting
    LEFT JOIN user u ON ja.ja_user_email = u.u_email COLLATE utf8mb4_unicode_ci
    WHERE jp.jp_provider_email = ?
  `;

  const params = [providerEmail];

  if (jobPostingId) {
    query += ` AND ja.ja_job_posting_id = ?`;
    params.push(jobPostingId);
  }

  query += ` ORDER BY ja.ja_created_at DESC`;

  const [rows] = await pool.query(query, params);
  return { applications: rows };
}

/**
 * Schedule (or reschedule) an interview for a job application.
 * Returns applicant info needed for notifications and socket events.
 * @returns {{ applicantEmail, applicantUserId, jobTitle, isReschedule, existingInterviewDate, existingInterviewTime }}
 */
async function scheduleInterview(applicationId, providerEmail, { interviewDate, interviewTime, interviewDescription }) {
  const pool = getPool();

  // Ensure interview columns exist
  try {
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'job_application'
      AND COLUMN_NAME IN ('ja_interview_date', 'ja_interview_time', 'ja_interview_description')
    `);
    const existingColumns = columns.map((col) => col.COLUMN_NAME);
    if (!existingColumns.includes('ja_interview_date')) {
      await pool.query(`ALTER TABLE job_application ADD COLUMN ja_interview_date DATE NULL`);
    }
    if (!existingColumns.includes('ja_interview_time')) {
      await pool.query(`ALTER TABLE job_application ADD COLUMN ja_interview_time TIME NULL`);
    }
    if (!existingColumns.includes('ja_interview_description')) {
      await pool.query(`ALTER TABLE job_application ADD COLUMN ja_interview_description TEXT NULL`);
    }
  } catch (alterErr) {
    console.log('Note: Interview columns check failed:', alterErr.message);
  }

  // Verify the application belongs to a job posting by this provider
  const [verify] = await pool.query(
    `SELECT ja.idjob_application
     FROM job_application ja
     INNER JOIN provider_job_posting jp ON ja.ja_job_posting_id = jp.idjob_posting
     WHERE ja.idjob_application = ? AND jp.jp_provider_email = ?`,
    [applicationId, providerEmail]
  );

  if (verify.length === 0) {
    const err = new Error('Application not found or access denied');
    err.statusCode = 404;
    err.errorCode = 'NOT_FOUND';
    throw err;
  }

  // Get applicant info and check if interview already exists
  const [applicationRows] = await pool.query(
    `SELECT ja.ja_user_email, ja.ja_interview_date, ja.ja_interview_time, u.iduser, jp.jp_job_title
     FROM job_application ja
     INNER JOIN provider_job_posting jp ON ja.ja_job_posting_id = jp.idjob_posting
     LEFT JOIN user u ON ja.ja_user_email = u.u_email COLLATE utf8mb4_unicode_ci
     WHERE ja.idjob_application = ?`,
    [applicationId]
  );

  if (applicationRows.length === 0) {
    const err = new Error('Application not found');
    err.statusCode = 404;
    err.errorCode = 'NOT_FOUND';
    throw err;
  }

  const applicantEmail = applicationRows[0].ja_user_email;
  const applicantUserId = applicationRows[0].iduser;
  const jobTitle = applicationRows[0].jp_job_title || 'the job';
  const existingInterviewDate = applicationRows[0].ja_interview_date;
  const existingInterviewTime = applicationRows[0].ja_interview_time;
  const isReschedule = !!(existingInterviewDate && existingInterviewTime);

  // Update application with interview schedule
  await pool.query(
    `UPDATE job_application
     SET ja_interview_date = ?,
         ja_interview_time = ?,
         ja_interview_description = ?,
         ja_status = 'reviewed'
     WHERE idjob_application = ?`,
    [interviewDate, interviewTime, interviewDescription || null, applicationId]
  );

  return { applicantEmail, applicantUserId, jobTitle, isReschedule, existingInterviewDate, existingInterviewTime };
}

/**
 * Create an interview notification in the notification table.
 */
async function createInterviewNotification({
  applicantUserId, jobTitle, isReschedule,
  interviewDate, interviewTime, interviewDescription,
  existingInterviewDate, existingInterviewTime,
}) {
  const pool = getPool();

  await ensureNotificationTable();

  // Format interview date and time for display
  const interviewDateObj = new Date(interviewDate);
  const formattedDate = interviewDateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const [hours, minutes] = interviewTime.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  const formattedTime = `${displayHour}:${minutes} ${ampm}`;

  let notificationTitle = isReschedule ? 'Interview Rescheduled' : 'Interview Scheduled';
  let notificationMessage = '';

  if (isReschedule) {
    const oldDateObj = new Date(existingInterviewDate);
    const oldFormattedDate = oldDateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const [oldHours, oldMinutes] = existingInterviewTime.split(':');
    const oldHour = parseInt(oldHours);
    const oldAmpm = oldHour >= 12 ? 'PM' : 'AM';
    const oldDisplayHour = oldHour % 12 || 12;
    const oldFormattedTime = `${oldDisplayHour}:${oldMinutes} ${oldAmpm}`;

    notificationMessage = `Your interview for "${jobTitle}" has been rescheduled.\n\n`;
    notificationMessage += `\u{1F4C5} Previous: ${oldFormattedDate} at ${oldFormattedTime}\n`;
    notificationMessage += `\u{1F4C5} New Date: ${formattedDate}\n`;
    notificationMessage += `\u{1F555} New Time: ${formattedTime}\n`;
  } else {
    notificationMessage = `You have been scheduled for an interview for "${jobTitle}".\n\n`;
    notificationMessage += `\u{1F4C5} Date: ${formattedDate}\n`;
    notificationMessage += `\u{1F555} Time: ${formattedTime}\n`;
  }

  if (interviewDescription && interviewDescription.trim()) {
    notificationMessage += `\n\u{1F4DD} Instructions:\n${interviewDescription.trim()}`;
  }

  await pool.query(
    'INSERT INTO `notification` (n_user_id, n_title, n_message, n_type, n_is_read) VALUES (?, ?, ?, ?, ?)',
    [
      applicantUserId,
      notificationTitle,
      notificationMessage,
      isReschedule ? 'interview_rescheduled' : 'interview_scheduled',
      0,
    ]
  );

  console.log(`\u2705 Notification created for applicant user ID ${applicantUserId}`);

  return { formattedDate, formattedTime, notificationTitle };
}

/**
 * Reject a job application with a note. Returns applicant email for socket events.
 * @returns {{ applicantEmail: string|null }}
 */
async function rejectJobApplication(applicationId, providerEmail, rejectionNote) {
  const pool = getPool();

  await ensureRejectionNoteColumn();

  // Verify the application belongs to a job posting by this provider
  const [verify] = await pool.query(
    `SELECT ja.idjob_application
     FROM job_application ja
     INNER JOIN provider_job_posting jp ON ja.ja_job_posting_id = jp.idjob_posting
     WHERE ja.idjob_application = ? AND jp.jp_provider_email = ?`,
    [applicationId, providerEmail]
  );

  if (verify.length === 0) {
    const err = new Error('Application not found or access denied');
    err.statusCode = 404;
    err.errorCode = 'NOT_FOUND';
    throw err;
  }

  // Update application with rejection
  await pool.query(
    `UPDATE job_application
     SET ja_status = 'rejected',
         ja_rejection_note = ?
     WHERE idjob_application = ?`,
    [rejectionNote.trim(), applicationId]
  );

  // Get applicant email for socket event
  const [appRows] = await pool.query(
    'SELECT ja_user_email FROM job_application WHERE idjob_application = ?',
    [applicationId]
  );

  return {
    applicantEmail: appRows.length > 0 ? appRows[0].ja_user_email : null,
  };
}

/**
 * Accept/hire an applicant after interview. Returns applicant email for socket events.
 * @returns {{ applicantEmail: string|null }}
 */
async function acceptJobApplication(applicationId, providerEmail, hireNote) {
  const pool = getPool();

  await ensureHireNoteColumn();

  // Verify the application belongs to a job posting by this provider
  const [verify] = await pool.query(
    `SELECT ja.idjob_application, ja.ja_interview_date, ja.ja_interview_time
     FROM job_application ja
     INNER JOIN provider_job_posting jp ON ja.ja_job_posting_id = jp.idjob_posting
     WHERE ja.idjob_application = ? AND jp.jp_provider_email = ?`,
    [applicationId, providerEmail]
  );

  if (verify.length === 0) {
    const err = new Error('Application not found or access denied');
    err.statusCode = 404;
    err.errorCode = 'NOT_FOUND';
    throw err;
  }

  const application = verify[0];

  // Check if interview was scheduled
  if (!application.ja_interview_date || !application.ja_interview_time) {
    const err = new Error('Interview must be scheduled before hiring');
    err.statusCode = 400;
    err.errorCode = 'VALIDATION_ERROR';
    throw err;
  }

  // Check if interview time has passed
  const interviewDateTime = new Date(`${application.ja_interview_date}T${application.ja_interview_time}`);
  const now = new Date();

  if (interviewDateTime > now) {
    const err = new Error('Cannot hire applicant before the scheduled interview time');
    err.statusCode = 400;
    err.errorCode = 'VALIDATION_ERROR';
    throw err;
  }

  // Update application status to accepted
  await pool.query(
    `UPDATE job_application
     SET ja_status = 'accepted',
         ja_hire_note = ?
     WHERE idjob_application = ?`,
    [hireNote.trim(), applicationId]
  );

  // Get applicant email for socket event
  const [appRows] = await pool.query(
    'SELECT ja_user_email FROM job_application WHERE idjob_application = ?',
    [applicationId]
  );

  return {
    applicantEmail: appRows.length > 0 ? appRows[0].ja_user_email : null,
  };
}

/**
 * Get job applications for a specific user.
 * @returns {{ applications: Array }}
 */
async function getUserJobApplications(userEmail) {
  const pool = getPool();

  await ensureInterviewColumns();

  const query = `
    SELECT
      ja.idjob_application as id,
      ja.ja_job_posting_id as jobPostingId,
      ja.ja_user_email as userEmail,
      ja.ja_resume_file_name as resumeFileName,
      ja.ja_status as status,
      ja.ja_interview_date as interviewDate,
      ja.ja_interview_time as interviewTime,
      ja.ja_interview_description as interviewDescription,
      ja.ja_rejection_note as rejectionNote,
      ja.ja_created_at as appliedAt,
      jp.jp_job_title as jobTitle,
      jp.jp_description as jobDescription,
      jp.jp_deadline_date as deadlineDate,
      jp.jp_status as jobStatus,
      u.u_fname as providerFirstName,
      u.u_lname as providerLastName,
      u.u_email as providerEmail
    FROM job_application ja
    INNER JOIN provider_job_posting jp ON ja.ja_job_posting_id = jp.idjob_posting
    LEFT JOIN user u ON jp.jp_provider_email = u.u_email COLLATE utf8mb4_unicode_ci
    WHERE ja.ja_user_email = ?
    ORDER BY ja.ja_created_at DESC
  `;

  const [rows] = await pool.query(query, [userEmail]);
  return { applications: rows };
}

/**
 * Download resume for a job application (provider access only).
 * Returns { resumeFile, resumeFileName } or null if not found/access denied.
 */
async function getApplicationResume(applicationId, providerEmail) {
  const pool = getPool();

  const [verify] = await pool.query(
    `SELECT ja.idjob_application, ja.ja_resume_file, ja.ja_resume_file_name
     FROM job_application ja
     INNER JOIN provider_job_posting jp ON ja.ja_job_posting_id = jp.idjob_posting
     WHERE ja.idjob_application = ? AND jp.jp_provider_email = ?`,
    [applicationId, providerEmail]
  );

  if (verify.length === 0) return null;

  return {
    resumeFile: verify[0].ja_resume_file,
    resumeFileName: verify[0].ja_resume_file_name,
  };
}

module.exports = {
  // Hiring requests
  createHiringRequest,
  getHiringRequests,
  getHiringRequestById,
  updateHiringRequest,
  // Proposals
  createProposal,
  getProposals,
  acceptProposal,
  rejectProposal,
  // Job postings
  initJobPostingTable,
  getProviderJobPostings,
  createJobPosting,
  updateJobPosting,
  deleteJobPosting,
  getPublicJobPostings,
  // Job applications
  initJobApplicationTable,
  submitJobApplication,
  getProviderJobApplications,
  scheduleInterview,
  createInterviewNotification,
  rejectJobApplication,
  acceptJobApplication,
  getUserJobApplications,
  getApplicationResume,
};
