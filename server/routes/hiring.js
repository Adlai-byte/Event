const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { authMiddleware } = require('../middleware/auth');

// ============================================
// HIRING API ENDPOINTS
// ============================================

// Create hiring request
router.post('/hiring/requests', async (req, res) => {
    try {
        const pool = getPool();
        const {
            clientId,
            serviceId,
            eventId,
            title,
            description,
            budget,
            timeline,
            location,
            requirements,
            skillsRequired,
            experienceLevel,
            contractType,
            status = 'draft'
        } = req.body;

        if (!clientId || !title || !description || !budget || !timeline || !location) {
            return res.status(400).json({ ok: false, error: 'Missing required fields' });
        }

        // Get client user ID from email if needed
        let userId = parseInt(clientId);
        if (isNaN(userId)) {
            const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [clientId]);
            if (userRows.length === 0) {
                return res.status(404).json({ ok: false, error: 'Client not found' });
            }
            userId = userRows[0].iduser;
        }

        // Insert hiring request
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
            contractType || 'fixed_price'
        ]);

        const hiringRequestId = result.insertId;

        // Insert requirements
        if (requirements && Array.isArray(requirements) && requirements.length > 0) {
            const requirementValues = requirements.map((req, index) => [
                hiringRequestId,
                req,
                index
            ]);
            await pool.query(`
                INSERT INTO hiring_requirement (hrq_hiring_request_id, hrq_requirement, hrq_order)
                VALUES ?
            `, [requirementValues]);
        }

        // Insert skills
        if (skillsRequired && Array.isArray(skillsRequired) && skillsRequired.length > 0) {
            const skillValues = skillsRequired.map(skill => [
                hiringRequestId,
                skill
            ]);
            await pool.query(`
                INSERT INTO hiring_skill (hs_hiring_request_id, hs_skill)
                VALUES ?
            `, [skillValues]);
        }

        return res.json({
            ok: true,
            hiringRequestId: hiringRequestId
        });
    } catch (err) {
        console.error('Create hiring request failed:', err);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Get hiring requests
router.get('/hiring/requests', async (req, res) => {
    try {
        const pool = getPool();
        const { clientId, providerId, status, serviceId, maxBudget, location, hiringRequestId } = req.query;

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
            let userId = parseInt(clientId);
            if (isNaN(userId)) {
                const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [clientId]);
                if (userRows.length > 0) {
                    userId = userRows[0].iduser;
                }
            }
            query += ' AND hr.hr_client_id = ?';
            params.push(userId);
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

        const hiringRequests = rows.map(row => ({
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
            skills: row.skills ? row.skills.split('|||') : []
        }));

        return res.json({
            ok: true,
            hiringRequests: hiringRequests
        });
    } catch (err) {
        console.error('Get hiring requests failed:', err);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Get single hiring request
router.get('/hiring/requests/:id', async (req, res) => {
    try {
        const pool = getPool();
        const id = parseInt(req.params.id);

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

        if (rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Hiring request not found' });
        }

        const row = rows[0];
        const hiringRequest = {
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
            skills: row.skills ? row.skills.split('|||') : []
        };

        return res.json({
            ok: true,
            hiringRequest: hiringRequest
        });
    } catch (err) {
        console.error('Get hiring request failed:', err);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Update hiring request
router.put('/hiring/requests/:id', async (req, res) => {
    try {
        const pool = getPool();
        const id = parseInt(req.params.id);
        const updates = req.body;

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
            return res.status(400).json({ ok: false, error: 'No fields to update' });
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
                const requirementValues = updates.requirements.map((req, index) => [id, req, index]);
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

        return res.json({ ok: true, message: 'Hiring request updated successfully' });
    } catch (err) {
        console.error('Update hiring request failed:', err);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Create proposal
router.post('/hiring/proposals', async (req, res) => {
    try {
        const pool = getPool();
        const {
            providerId,
            hiringRequestId,
            title,
            description,
            proposedBudget,
            timeline,
            deliverables,
            terms,
            status = 'submitted'
        } = req.body;

        if (!providerId || !hiringRequestId || !title || !description || !proposedBudget || !timeline || !deliverables) {
            return res.status(400).json({ ok: false, error: 'Missing required fields' });
        }

        // Get provider user ID from email if needed
        let userId = parseInt(providerId);
        if (isNaN(userId)) {
            const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [providerId]);
            if (userRows.length === 0) {
                return res.status(404).json({ ok: false, error: 'Provider not found' });
            }
            userId = userRows[0].iduser;
        }

        // Insert proposal
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
            status
        ]);

        const proposalId = result.insertId;

        // Insert deliverables
        if (deliverables && Array.isArray(deliverables) && deliverables.length > 0) {
            const deliverableValues = deliverables.map((del, index) => [
                proposalId,
                del,
                index
            ]);
            await pool.query(`
                INSERT INTO proposal_deliverable (pd_proposal_id, pd_deliverable, pd_order)
                VALUES ?
            `, [deliverableValues]);
        }

        return res.json({
            ok: true,
            proposalId: proposalId
        });
    } catch (err) {
        console.error('Create proposal failed:', err);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Get proposals
router.get('/hiring/proposals', async (req, res) => {
    try {
        const pool = getPool();
        const { providerId, hiringRequestId, proposalId } = req.query;

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
            let userId = parseInt(providerId);
            if (isNaN(userId)) {
                const [userRows] = await pool.query('SELECT iduser FROM `user` WHERE u_email = ?', [providerId]);
                if (userRows.length > 0) {
                    userId = userRows[0].iduser;
                }
            }
            query += ' AND p.p_provider_id = ?';
            params.push(userId);
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
            deliverables: row.deliverables ? row.deliverables.split('|||') : []
        }));

        return res.json({
            ok: true,
            proposals: proposals
        });
    } catch (err) {
        console.error('Get proposals failed:', err);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Accept proposal
router.post('/hiring/proposals/:id/accept', async (req, res) => {
    try {
        const pool = getPool();
        const proposalId = parseInt(req.params.id);
        const { hiringRequestId } = req.body;

        if (!hiringRequestId) {
            return res.status(400).json({ ok: false, error: 'Hiring request ID is required' });
        }

        // Start transaction
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

            return res.json({ ok: true, message: 'Proposal accepted successfully' });
        } catch (err) {
            await pool.query('ROLLBACK');
            throw err;
        }
    } catch (err) {
        console.error('Accept proposal failed:', err);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Reject proposal
router.post('/hiring/proposals/:id/reject', async (req, res) => {
    try {
        const pool = getPool();
        const proposalId = parseInt(req.params.id);
        const { reason } = req.body;

        await pool.query(
            'UPDATE proposal SET p_status = ?, p_client_feedback = ? WHERE idproposal = ?',
            ['rejected', reason || 'Proposal rejected', proposalId]
        );

        return res.json({ ok: true, message: 'Proposal rejected successfully' });
    } catch (err) {
        console.error('Reject proposal failed:', err);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// ============================================
// PROVIDER JOB POSTINGS API
// ============================================

// Create provider job posting table if it doesn't exist
router.get('/provider/job-postings/init-table', async (req, res) => {
    try {
        const pool = getPool();
        await pool.query(`
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
        `);
        return res.json({ ok: true, message: 'Table created successfully' });
    } catch (err) {
        console.error('Init table failed:', err);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Get all job postings for a provider
router.get('/provider/job-postings', async (req, res) => {
    try {
        const pool = getPool();
        const { providerEmail } = req.query;

        if (!providerEmail) {
            return res.status(400).json({ ok: false, error: 'Provider email is required' });
        }

        // Initialize table if needed
        await pool.query(`
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
        `);

        // Update expired postings
        await pool.query(
            `UPDATE provider_job_posting
             SET jp_status = 'expired'
             WHERE jp_provider_email = ?
             AND jp_deadline_date < CURDATE()
             AND jp_status = 'active'`,
            [providerEmail]
        );

        // Check if jp_job_type column exists, if not add it
        try {
            await pool.query('ALTER TABLE `provider_job_posting` ADD COLUMN `jp_job_type` ENUM(\'full_time\', \'part_time\') NOT NULL DEFAULT \'full_time\' AFTER `jp_deadline_date`');
        } catch (alterErr) {
            // Column might already exist, ignore error
            if (alterErr.message && !alterErr.message.includes('Duplicate column name')) {
                console.log('Note: jp_job_type column may already exist');
            }
        }

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

        return res.json({ ok: true, jobPostings: rows });
    } catch (err) {
        console.error('Get job postings failed:', err);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Create a new job posting
router.post('/provider/job-postings', async (req, res) => {
    try {
        const pool = getPool();
        const { providerEmail, jobTitle, description, deadlineDate, jobType } = req.body;

        if (!providerEmail || !jobTitle || !description || !deadlineDate || !jobType) {
            return res.status(400).json({ ok: false, error: 'All fields are required' });
        }

        // Validate jobType
        if (jobType !== 'full_time' && jobType !== 'part_time') {
            return res.status(400).json({ ok: false, error: 'Job type must be either full_time or part_time' });
        }

        // Validate deadline date is in the future
        const deadline = new Date(deadlineDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (deadline < today) {
            return res.status(400).json({ ok: false, error: 'Deadline date must be in the future' });
        }

        // Initialize table if needed
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`provider_job_posting\` (
                \`idjob_posting\` INT(11) NOT NULL AUTO_INCREMENT,
                \`jp_provider_email\` VARCHAR(255) NOT NULL,
                \`jp_job_title\` VARCHAR(200) NOT NULL,
                \`jp_description\` TEXT NOT NULL,
                \`jp_deadline_date\` DATE NOT NULL,
                \`jp_job_type\` ENUM('full_time', 'part_time') NOT NULL DEFAULT 'full_time',
                \`jp_status\` ENUM('active', 'closed', 'expired') NOT NULL DEFAULT 'active',
                \`jp_created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`jp_updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`idjob_posting\`),
                INDEX \`idx_provider\` (\`jp_provider_email\`),
                INDEX \`idx_status\` (\`jp_status\`),
                INDEX \`idx_deadline\` (\`jp_deadline_date\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Check if jp_job_type column exists, if not add it
        try {
            await pool.query('ALTER TABLE `provider_job_posting` ADD COLUMN `jp_job_type` ENUM(\'full_time\', \'part_time\') NOT NULL DEFAULT \'full_time\' AFTER `jp_deadline_date`');
        } catch (alterErr) {
            // Column might already exist, ignore error
            if (alterErr.message && !alterErr.message.includes('Duplicate column name')) {
                console.log('Note: jp_job_type column may already exist');
            }
        }

        const [result] = await pool.query(
            `INSERT INTO provider_job_posting
             (jp_provider_email, jp_job_title, jp_description, jp_deadline_date, jp_job_type, jp_status)
             VALUES (?, ?, ?, ?, ?, 'active')`,
            [providerEmail, jobTitle, description, deadlineDate, jobType]
        );

        return res.json({
            ok: true,
            message: 'Job posting created successfully',
            jobPostingId: result.insertId
        });
    } catch (err) {
        console.error('Create job posting failed:', err);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Update a job posting
router.put('/provider/job-postings/:id', async (req, res) => {
    try {
        const pool = getPool();
        const jobPostingId = parseInt(req.params.id);
        const { providerEmail, jobTitle, description, deadlineDate, status } = req.body;

        if (!providerEmail) {
            return res.status(400).json({ ok: false, error: 'Provider email is required' });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (jobTitle) {
            updates.push('jp_job_title = ?');
            values.push(jobTitle);
        }
        if (description) {
            updates.push('jp_description = ?');
            values.push(description);
        }
        if (deadlineDate) {
            // Validate deadline date is in the future
            const deadline = new Date(deadlineDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (deadline < today) {
                return res.status(400).json({ ok: false, error: 'Deadline date must be in the future' });
            }
            updates.push('jp_deadline_date = ?');
            values.push(deadlineDate);
        }
        if (status) {
            updates.push('jp_status = ?');
            values.push(status);
        }

        if (updates.length === 0) {
            return res.status(400).json({ ok: false, error: 'No fields to update' });
        }

        values.push(jobPostingId, providerEmail);

        await pool.query(
            `UPDATE provider_job_posting
             SET ${updates.join(', ')}
             WHERE idjob_posting = ? AND jp_provider_email = ?`,
            values
        );

        return res.json({ ok: true, message: 'Job posting updated successfully' });
    } catch (err) {
        console.error('Update job posting failed:', err);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Delete a job posting
router.delete('/provider/job-postings/:id', async (req, res) => {
    try {
        const pool = getPool();
        const jobPostingId = parseInt(req.params.id);
        const { providerEmail } = req.query;

        if (!providerEmail) {
            return res.status(400).json({ ok: false, error: 'Provider email is required' });
        }

        await pool.query(
            `DELETE FROM provider_job_posting
             WHERE idjob_posting = ? AND jp_provider_email = ?`,
            [jobPostingId, providerEmail]
        );

        return res.json({ ok: true, message: 'Job posting deleted successfully' });
    } catch (err) {
        console.error('Delete job posting failed:', err);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Get all active job postings for users to view
router.get('/job-postings', async (req, res) => {
    try {
        const pool = getPool();
        const { status = 'active', search } = req.query;

        // Initialize table if needed
        await pool.query(`
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
        `);

        // Update expired postings
        await pool.query(
            `UPDATE provider_job_posting
             SET jp_status = 'expired'
             WHERE jp_deadline_date < CURDATE()
             AND jp_status = 'active'`
        );

        // Check if jp_job_type column exists, if not add it
        try {
            await pool.query('ALTER TABLE `provider_job_posting` ADD COLUMN `jp_job_type` ENUM(\'full_time\', \'part_time\') NOT NULL DEFAULT \'full_time\' AFTER `jp_deadline_date`');
        } catch (alterErr) {
            // Column might already exist, ignore error
            if (alterErr.message && !alterErr.message.includes('Duplicate column name')) {
                console.log('Note: jp_job_type column may already exist');
            }
        }

        let query = `
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
                )) as location
            FROM provider_job_posting jp
            LEFT JOIN user u ON jp.jp_provider_email COLLATE utf8mb4_unicode_ci = u.u_email COLLATE utf8mb4_unicode_ci
            WHERE 1=1
        `;

        const params = [];

        if (status && status !== 'all') {
            query += ` AND jp.jp_status = ?`;
            params.push(status);
        } else {
            // For 'all', show active and closed, but not expired
            query += ` AND jp.jp_status IN ('active', 'closed')`;
        }

        if (search) {
            query += ` AND (jp.jp_job_title LIKE ? OR jp.jp_description LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        query += ` ORDER BY jp.jp_created_at DESC`;

        const [rows] = await pool.query(query, params);

        return res.json({ ok: true, jobPostings: rows });
    } catch (err) {
        console.error('Get job postings failed:', err);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// ============================================
// JOB APPLICATIONS API
// ============================================

// Create job application table if it doesn't exist
router.get('/job-applications/init-table', async (req, res) => {
    try {
        const pool = getPool();
        await pool.query(`
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
        `);
        return res.json({ ok: true, message: 'Table created successfully' });
    } catch (err) {
        console.error('Init table failed:', err);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Submit job application
router.post('/job-applications', async (req, res) => {
    try {
        const pool = getPool();
        const { jobPostingId, userEmail, resumeFile, resumeFileName } = req.body;

        if (!jobPostingId || !userEmail || !resumeFile || !resumeFileName) {
            return res.status(400).json({ ok: false, error: 'All fields are required' });
        }

        // Validate file is PDF
        if (!resumeFileName.toLowerCase().endsWith('.pdf')) {
            return res.status(400).json({ ok: false, error: 'Resume must be a PDF file' });
        }

        // Initialize table if needed
        await pool.query(`
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
        `);

        // Check if user already applied to this job posting
        const [existing] = await pool.query(
            `SELECT idjob_application FROM job_application
             WHERE ja_job_posting_id = ? AND ja_user_email = ?`,
            [jobPostingId, userEmail]
        );

        if (existing.length > 0) {
            return res.status(400).json({ ok: false, error: 'You have already applied to this job posting' });
        }

        // Convert base64 to buffer
        const resumeBuffer = Buffer.from(resumeFile, 'base64');

        // Insert application
        await pool.query(
            `INSERT INTO job_application
             (ja_job_posting_id, ja_user_email, ja_resume_file, ja_resume_file_name, ja_status)
             VALUES (?, ?, ?, ?, 'pending')`,
            [jobPostingId, userEmail, resumeBuffer, resumeFileName]
        );

        return res.json({ ok: true, message: 'Application submitted successfully' });
    } catch (err) {
        console.error('Submit job application failed:', err);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Get job applications for a provider's job postings
router.get('/provider/job-applications', async (req, res) => {
    try {
        const pool = getPool();
        const { providerEmail, jobPostingId } = req.query;

        if (!providerEmail) {
            return res.status(400).json({ ok: false, error: 'Provider email is required' });
        }

        // Add interview and rejection columns if they don't exist
        try {
            // Check if columns exist
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
            // Columns might already exist, ignore error
            console.log('Note: Interview/rejection columns check failed:', alterErr.message);
        }

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

        return res.json({ ok: true, applications: rows });
    } catch (err) {
        console.error('Get job applications failed:', err);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Schedule interview for a job application
router.put('/provider/job-applications/:id/schedule-interview', async (req, res) => {
    try {
        const pool = getPool();
        const applicationId = parseInt(req.params.id);
        const { providerEmail, interviewDate, interviewTime, interviewDescription } = req.body;

        if (!providerEmail || !interviewDate || !interviewTime) {
            return res.status(400).json({ ok: false, error: 'Provider email, interview date, and time are required' });
        }

        // Validate interview date is in the future
        const interviewDateTime = new Date(`${interviewDate}T${interviewTime}`);
        const now = new Date();

        if (interviewDateTime <= now) {
            return res.status(400).json({ ok: false, error: 'Interview date and time must be in the future' });
        }

        // Add interview columns if they don't exist
        try {
            // Check if columns exist
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
            // Columns might already exist, ignore error
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
            return res.status(404).json({ ok: false, error: 'Application not found or access denied' });
        }

        // Get applicant user ID and email for notification, and check if interview already exists
        const [applicationRows] = await pool.query(
            `SELECT ja.ja_user_email, ja.ja_interview_date, ja.ja_interview_time, u.iduser, jp.jp_job_title
             FROM job_application ja
             INNER JOIN provider_job_posting jp ON ja.ja_job_posting_id = jp.idjob_posting
             LEFT JOIN user u ON ja.ja_user_email = u.u_email COLLATE utf8mb4_unicode_ci
             WHERE ja.idjob_application = ?`,
            [applicationId]
        );

        if (applicationRows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Application not found' });
        }

        const applicantEmail = applicationRows[0].ja_user_email;
        const applicantUserId = applicationRows[0].iduser;
        const jobTitle = applicationRows[0].jp_job_title || 'the job';
        const existingInterviewDate = applicationRows[0].ja_interview_date;
        const existingInterviewTime = applicationRows[0].ja_interview_time;
        const isReschedule = existingInterviewDate && existingInterviewTime;

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

        // Create notification for the applicant
        if (applicantUserId) {
            try {
                // Ensure notification table exists
                await pool.query(`
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
                `);

                // Format interview date and time for display
                const interviewDateObj = new Date(interviewDate);
                const formattedDate = interviewDateObj.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                const [hours, minutes] = interviewTime.split(':');
                const hour = parseInt(hours);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const displayHour = hour % 12 || 12;
                const formattedTime = `${displayHour}:${minutes} ${ampm}`;

                // Create notification message
                let notificationTitle = isReschedule ? 'Interview Rescheduled' : 'Interview Scheduled';
                let notificationMessage = '';

                if (isReschedule) {
                    // Format old interview date and time
                    const oldDateObj = new Date(existingInterviewDate);
                    const oldFormattedDate = oldDateObj.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
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

                // Create notification entry
                await pool.query(
                    'INSERT INTO `notification` (n_user_id, n_title, n_message, n_type, n_is_read) VALUES (?, ?, ?, ?, ?)',
                    [
                        applicantUserId,
                        notificationTitle,
                        notificationMessage,
                        isReschedule ? 'interview_rescheduled' : 'interview_scheduled',
                        0
                    ]
                );

                console.log(`\u2705 Notification created for applicant user ID ${applicantUserId}`);

                // Send push notification to the applicant
                try {
                    if (global.sendPushNotification) {
                        let pushTitle = isReschedule ? 'Interview Rescheduled' : 'Interview Scheduled';
                        let pushMessage = '';

                        if (isReschedule) {
                            pushMessage = `Your interview for "${jobTitle}" has been rescheduled to ${formattedDate} at ${formattedTime}`;
                        } else {
                            pushMessage = `Interview scheduled for "${jobTitle}" on ${formattedDate} at ${formattedTime}`;
                        }

                        if (interviewDescription && interviewDescription.trim()) {
                            pushMessage += `. ${interviewDescription.trim().substring(0, 80)}${interviewDescription.trim().length > 80 ? '...' : ''}`;
                        }

                        await global.sendPushNotification(
                            applicantEmail,
                            pushTitle,
                            pushMessage,
                            {
                                type: isReschedule ? 'interview_rescheduled' : 'interview_scheduled',
                                applicationId: applicationId.toString(),
                                jobTitle: jobTitle
                            }
                        );
                        console.log(`\u2705 Push notification sent to applicant ${applicantEmail}`);
                    }
                } catch (pushErr) {
                    console.error('\u26A0\uFE0F Failed to send push notification (non-critical):', pushErr);
                    // Don't fail the interview scheduling if push notification fails
                }
            } catch (notifErr) {
                console.error('\u26A0\uFE0F Failed to create notification (non-critical):', notifErr);
                // Don't fail the interview scheduling if notification fails
            }
        }

        return res.json({ ok: true, message: 'Interview scheduled successfully' });
    } catch (err) {
        console.error('Schedule interview failed:', err);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Reject a job application with a note
router.put('/provider/job-applications/:id/reject', async (req, res) => {
    try {
        const pool = getPool();
        const applicationId = parseInt(req.params.id);
        const { providerEmail, rejectionNote } = req.body;

        if (!providerEmail || !rejectionNote || !rejectionNote.trim()) {
            return res.status(400).json({ ok: false, error: 'Provider email and rejection note are required' });
        }

        // Add rejection_note column if it doesn't exist
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

        // Verify the application belongs to a job posting by this provider
        const [verify] = await pool.query(
            `SELECT ja.idjob_application
             FROM job_application ja
             INNER JOIN provider_job_posting jp ON ja.ja_job_posting_id = jp.idjob_posting
             WHERE ja.idjob_application = ? AND jp.jp_provider_email = ?`,
            [applicationId, providerEmail]
        );

        if (verify.length === 0) {
            return res.status(404).json({ ok: false, error: 'Application not found or access denied' });
        }

        // Update application with rejection status and note
        await pool.query(
            `UPDATE job_application
             SET ja_status = 'rejected',
                 ja_rejection_note = ?
             WHERE idjob_application = ?`,
            [rejectionNote.trim(), applicationId]
        );

        return res.json({ ok: true, message: 'Application rejected successfully' });
    } catch (err) {
        console.error('Reject application failed:', err);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Accept/Hire applicant after interview
router.put('/provider/job-applications/:id/accept', async (req, res) => {
    try {
        const pool = getPool();
        const applicationId = parseInt(req.params.id);
        const { providerEmail, hireNote } = req.body;

        if (!providerEmail) {
            return res.status(400).json({ ok: false, error: 'Provider email is required' });
        }

        if (!hireNote || !hireNote.trim()) {
            return res.status(400).json({ ok: false, error: 'Hiring note is required' });
        }

        // Add hire_note column if it doesn't exist
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

        // Verify the application belongs to a job posting by this provider
        const [verify] = await pool.query(
            `SELECT ja.idjob_application, ja.ja_interview_date, ja.ja_interview_time
             FROM job_application ja
             INNER JOIN provider_job_posting jp ON ja.ja_job_posting_id = jp.idjob_posting
             WHERE ja.idjob_application = ? AND jp.jp_provider_email = ?`,
            [applicationId, providerEmail]
        );

        if (verify.length === 0) {
            return res.status(404).json({ ok: false, error: 'Application not found or access denied' });
        }

        const application = verify[0];

        // Check if interview was scheduled
        if (!application.ja_interview_date || !application.ja_interview_time) {
            return res.status(400).json({ ok: false, error: 'Interview must be scheduled before hiring' });
        }

        // Check if interview time has passed
        const interviewDateTime = new Date(`${application.ja_interview_date}T${application.ja_interview_time}`);
        const now = new Date();

        if (interviewDateTime > now) {
            return res.status(400).json({ ok: false, error: 'Cannot hire applicant before the scheduled interview time' });
        }

        // Update application status to accepted and store hire note
        await pool.query(
            `UPDATE job_application
             SET ja_status = 'accepted',
                 ja_hire_note = ?
             WHERE idjob_application = ?`,
            [hireNote.trim(), applicationId]
        );

        return res.json({ ok: true, message: 'Applicant hired successfully' });
    } catch (err) {
        console.error('Accept application failed:', err);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Get job applications for a user
router.get('/user/job-applications', async (req, res) => {
    try {
        const pool = getPool();
        const { userEmail } = req.query;

        if (!userEmail) {
            return res.status(400).json({ ok: false, error: 'User email is required' });
        }

        // Add interview and rejection columns if they don't exist
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

        return res.json({ ok: true, applications: rows });
    } catch (err) {
        console.error('Get user job applications failed:', err);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

// Download resume for a job application
router.get('/provider/job-applications/:id/resume', async (req, res) => {
    try {
        const pool = getPool();
        const applicationId = parseInt(req.params.id);
        const { providerEmail } = req.query;

        if (!providerEmail) {
            return res.status(400).json({ ok: false, error: 'Provider email is required' });
        }

        // Verify the application belongs to a job posting by this provider
        const [verify] = await pool.query(
            `SELECT ja.idjob_application, ja.ja_resume_file, ja.ja_resume_file_name
             FROM job_application ja
             INNER JOIN provider_job_posting jp ON ja.ja_job_posting_id = jp.idjob_posting
             WHERE ja.idjob_application = ? AND jp.jp_provider_email = ?`,
            [applicationId, providerEmail]
        );

        if (verify.length === 0) {
            return res.status(404).json({ ok: false, error: 'Application not found or access denied' });
        }

        const resumeFile = verify[0].ja_resume_file;
        const resumeFileName = verify[0].ja_resume_file_name;

        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${resumeFileName}"`);

        // Send the PDF file
        res.send(resumeFile);
    } catch (err) {
        console.error('Download resume failed:', err);
        return res.status(500).json({ ok: false, error: 'Database error: ' + err.message });
    }
});

module.exports = router;
