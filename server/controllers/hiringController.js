// server/controllers/hiringController.js
// Request/response handling for hiring, proposals, job postings, and job applications.
// Delegates all DB work to hiringService; owns try/catch, sendSuccess/sendError, and socket emits.

const { sendSuccess, sendError, sendPaginated } = require('../lib/response');
const hiringService = require('../svc/hiringService');

// ============================================
// Socket helper (needs req for app.get('io'))
// ============================================

function emitHiringUpdate(req, userEmail) {
  const io = req.app.get('io');
  if (io && userEmail) {
    io.to(`user:${userEmail}`).emit('hiring-update');
    io.to(`user:${userEmail}`).emit('new-notification');
  }
}

// ============================================
// HIRING REQUESTS
// ============================================

async function createHiringRequest(req, res) {
  try {
    const {
      clientId, serviceId, eventId, title, description,
      budget, timeline, location, requirements, skillsRequired,
      experienceLevel, contractType, status = 'draft',
    } = req.body;

    if (!clientId || !title || !description || !budget || !timeline || !location) {
      return sendError(res, 'VALIDATION_ERROR', 'Missing required fields', 400);
    }

    const result = await hiringService.createHiringRequest({
      clientId, serviceId, eventId, title, description,
      budget, timeline, location, requirements, skillsRequired,
      experienceLevel, contractType, status,
    });

    return sendSuccess(res, { hiringRequestId: result.hiringRequestId });
  } catch (err) {
    if (err.errorCode) {
      return sendError(res, err.errorCode, err.message, err.statusCode);
    }
    console.error('Create hiring request failed:', err);
    return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
  }
}

async function getHiringRequests(req, res) {
  try {
    const { clientId, providerId, status, serviceId, maxBudget, location, hiringRequestId } = req.query;
    const result = await hiringService.getHiringRequests({
      clientId, providerId, status, serviceId, maxBudget, location, hiringRequestId,
    });
    return sendSuccess(res, { hiringRequests: result.hiringRequests });
  } catch (err) {
    console.error('Get hiring requests failed:', err);
    return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
  }
}

async function getHiringRequestById(req, res) {
  try {
    const id = parseInt(req.params.id);
    const result = await hiringService.getHiringRequestById(id);
    if (!result) {
      return sendError(res, 'NOT_FOUND', 'Hiring request not found', 404);
    }
    return sendSuccess(res, { hiringRequest: result.hiringRequest });
  } catch (err) {
    console.error('Get hiring request failed:', err);
    return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
  }
}

async function updateHiringRequest(req, res) {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;

    const { clientEmail } = await hiringService.updateHiringRequest(id, updates);

    // Emit socket event if status changed
    if (updates.status !== undefined && clientEmail) {
      try {
        emitHiringUpdate(req, clientEmail);
      } catch (socketErr) {
        console.error('Socket emission failed (non-critical):', socketErr);
      }
    }

    return sendSuccess(res, { message: 'Hiring request updated successfully' });
  } catch (err) {
    if (err.errorCode) {
      return sendError(res, err.errorCode, err.message, err.statusCode);
    }
    console.error('Update hiring request failed:', err);
    return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
  }
}

// ============================================
// PROPOSALS
// ============================================

async function createProposal(req, res) {
  try {
    const {
      providerId, hiringRequestId, title, description,
      proposedBudget, timeline, deliverables, terms, status = 'submitted',
    } = req.body;

    if (!providerId || !hiringRequestId || !title || !description || !proposedBudget || !timeline || !deliverables) {
      return sendError(res, 'VALIDATION_ERROR', 'Missing required fields', 400);
    }

    const result = await hiringService.createProposal({
      providerId, hiringRequestId, title, description,
      proposedBudget, timeline, deliverables, terms, status,
    });

    return sendSuccess(res, { proposalId: result.proposalId });
  } catch (err) {
    if (err.errorCode) {
      return sendError(res, err.errorCode, err.message, err.statusCode);
    }
    console.error('Create proposal failed:', err);
    return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
  }
}

async function getProposals(req, res) {
  try {
    const { providerId, hiringRequestId, proposalId } = req.query;
    const result = await hiringService.getProposals({ providerId, hiringRequestId, proposalId });
    return sendSuccess(res, { proposals: result.proposals });
  } catch (err) {
    console.error('Get proposals failed:', err);
    return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
  }
}

async function acceptProposal(req, res) {
  try {
    const proposalId = parseInt(req.params.id);
    const { hiringRequestId } = req.body;

    if (!hiringRequestId) {
      return sendError(res, 'VALIDATION_ERROR', 'Hiring request ID is required', 400);
    }

    const { clientEmail, providerEmail } = await hiringService.acceptProposal(proposalId, hiringRequestId);

    // Emit socket events to client and accepted provider
    try {
      if (clientEmail) emitHiringUpdate(req, clientEmail);
      if (providerEmail) emitHiringUpdate(req, providerEmail);
    } catch (socketErr) {
      console.error('Socket emission failed (non-critical):', socketErr);
    }

    return sendSuccess(res, { message: 'Proposal accepted successfully' });
  } catch (err) {
    console.error('Accept proposal failed:', err);
    return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
  }
}

async function rejectProposal(req, res) {
  try {
    const proposalId = parseInt(req.params.id);
    const { reason } = req.body;

    const { providerEmail } = await hiringService.rejectProposal(proposalId, reason);

    // Emit socket event to rejected provider
    try {
      if (providerEmail) emitHiringUpdate(req, providerEmail);
    } catch (socketErr) {
      console.error('Socket emission failed (non-critical):', socketErr);
    }

    return sendSuccess(res, { message: 'Proposal rejected successfully' });
  } catch (err) {
    console.error('Reject proposal failed:', err);
    return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
  }
}

// ============================================
// JOB POSTINGS
// ============================================

async function initJobPostingTable(req, res) {
  try {
    const result = await hiringService.initJobPostingTable();
    return sendSuccess(res, result);
  } catch (err) {
    console.error('Init table failed:', err);
    return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
  }
}

async function getProviderJobPostings(req, res) {
  try {
    const { providerEmail } = req.query;

    if (!providerEmail) {
      return sendError(res, 'VALIDATION_ERROR', 'Provider email is required', 400);
    }

    const result = await hiringService.getProviderJobPostings(providerEmail);
    return sendSuccess(res, { jobPostings: result.jobPostings });
  } catch (err) {
    console.error('Get job postings failed:', err);
    return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
  }
}

async function createJobPosting(req, res) {
  try {
    const { providerEmail, jobTitle, description, deadlineDate, jobType } = req.body;

    if (!providerEmail || !jobTitle || !description || !deadlineDate || !jobType) {
      return sendError(res, 'VALIDATION_ERROR', 'All fields are required', 400);
    }

    // Validate jobType
    if (jobType !== 'full_time' && jobType !== 'part_time') {
      return sendError(res, 'VALIDATION_ERROR', 'Job type must be either full_time or part_time', 400);
    }

    // Validate deadline date is in the future
    const deadline = new Date(deadlineDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (deadline < today) {
      return sendError(res, 'VALIDATION_ERROR', 'Deadline date must be in the future', 400);
    }

    const result = await hiringService.createJobPosting({ providerEmail, jobTitle, description, deadlineDate, jobType });
    return sendSuccess(res, result);
  } catch (err) {
    console.error('Create job posting failed:', err);
    return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
  }
}

async function updateJobPosting(req, res) {
  try {
    const jobPostingId = parseInt(req.params.id);
    const { providerEmail, jobTitle, description, deadlineDate, status } = req.body;

    if (!providerEmail) {
      return sendError(res, 'VALIDATION_ERROR', 'Provider email is required', 400);
    }

    // Validate deadline date is in the future (if provided)
    if (deadlineDate) {
      const deadline = new Date(deadlineDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deadline < today) {
        return sendError(res, 'VALIDATION_ERROR', 'Deadline date must be in the future', 400);
      }
    }

    const result = await hiringService.updateJobPosting(jobPostingId, providerEmail, {
      jobTitle, description, deadlineDate, status,
    });
    return sendSuccess(res, result);
  } catch (err) {
    if (err.errorCode) {
      return sendError(res, err.errorCode, err.message, err.statusCode);
    }
    console.error('Update job posting failed:', err);
    return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
  }
}

async function deleteJobPosting(req, res) {
  try {
    const jobPostingId = parseInt(req.params.id);
    const { providerEmail } = req.query;

    if (!providerEmail) {
      return sendError(res, 'VALIDATION_ERROR', 'Provider email is required', 400);
    }

    const result = await hiringService.deleteJobPosting(jobPostingId, providerEmail);
    return sendSuccess(res, result);
  } catch (err) {
    console.error('Delete job posting failed:', err);
    return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
  }
}

async function getPublicJobPostings(req, res) {
  try {
    const { status = 'active', search } = req.query;

    const { rows, total } = await hiringService.getPublicJobPostings({
      status,
      search,
      limit: req.pagination.limit,
      offset: req.pagination.offset,
    });

    return sendPaginated(res, rows, {
      page: req.pagination.page,
      limit: req.pagination.limit,
      total,
    });
  } catch (err) {
    console.error('Get job postings failed:', err);
    return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
  }
}

// ============================================
// JOB APPLICATIONS
// ============================================

async function initJobApplicationTable(req, res) {
  try {
    const result = await hiringService.initJobApplicationTable();
    return sendSuccess(res, result);
  } catch (err) {
    console.error('Init table failed:', err);
    return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
  }
}

async function submitJobApplication(req, res) {
  try {
    const { jobPostingId, userEmail, resumeFile, resumeFileName } = req.body;

    if (!jobPostingId || !userEmail || !resumeFile || !resumeFileName) {
      return sendError(res, 'VALIDATION_ERROR', 'All fields are required', 400);
    }

    // Validate file is PDF
    if (!resumeFileName.toLowerCase().endsWith('.pdf')) {
      return sendError(res, 'VALIDATION_ERROR', 'Resume must be a PDF file', 400);
    }

    const result = await hiringService.submitJobApplication({ jobPostingId, userEmail, resumeFile, resumeFileName });
    return sendSuccess(res, result);
  } catch (err) {
    if (err.errorCode) {
      return sendError(res, err.errorCode, err.message, err.statusCode);
    }
    console.error('Submit job application failed:', err);
    return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
  }
}

async function getProviderJobApplications(req, res) {
  try {
    const { providerEmail, jobPostingId } = req.query;

    if (!providerEmail) {
      return sendError(res, 'VALIDATION_ERROR', 'Provider email is required', 400);
    }

    const result = await hiringService.getProviderJobApplications(providerEmail, jobPostingId);
    return sendSuccess(res, { applications: result.applications });
  } catch (err) {
    console.error('Get job applications failed:', err);
    return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
  }
}

async function scheduleInterview(req, res) {
  try {
    const applicationId = parseInt(req.params.id);
    const { providerEmail, interviewDate, interviewTime, interviewDescription } = req.body;

    if (!providerEmail || !interviewDate || !interviewTime) {
      return sendError(res, 'VALIDATION_ERROR', 'Provider email, interview date, and time are required', 400);
    }

    // Validate interview date is in the future
    const interviewDateTime = new Date(`${interviewDate}T${interviewTime}`);
    const now = new Date();
    if (interviewDateTime <= now) {
      return sendError(res, 'VALIDATION_ERROR', 'Interview date and time must be in the future', 400);
    }

    const {
      applicantEmail, applicantUserId, jobTitle,
      isReschedule, existingInterviewDate, existingInterviewTime,
    } = await hiringService.scheduleInterview(applicationId, providerEmail, {
      interviewDate, interviewTime, interviewDescription,
    });

    // Create notification for the applicant
    if (applicantUserId) {
      try {
        const { formattedDate, formattedTime } = await hiringService.createInterviewNotification({
          applicantUserId, jobTitle, isReschedule,
          interviewDate, interviewTime, interviewDescription,
          existingInterviewDate, existingInterviewTime,
        });

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
                jobTitle: jobTitle,
              }
            );
            console.log(`\u2705 Push notification sent to applicant ${applicantEmail}`);
          }
        } catch (pushErr) {
          console.error('\u26A0\uFE0F Failed to send push notification (non-critical):', pushErr);
        }
      } catch (notifErr) {
        console.error('\u26A0\uFE0F Failed to create notification (non-critical):', notifErr);
      }
    }

    // Emit socket event to applicant
    try {
      emitHiringUpdate(req, applicantEmail);
    } catch (socketErr) {
      console.error('Socket emission failed (non-critical):', socketErr);
    }

    return sendSuccess(res, { message: 'Interview scheduled successfully' });
  } catch (err) {
    if (err.errorCode) {
      return sendError(res, err.errorCode, err.message, err.statusCode);
    }
    console.error('Schedule interview failed:', err);
    return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
  }
}

async function rejectJobApplication(req, res) {
  try {
    const applicationId = parseInt(req.params.id);
    const { providerEmail, rejectionNote } = req.body;

    if (!providerEmail || !rejectionNote || !rejectionNote.trim()) {
      return sendError(res, 'VALIDATION_ERROR', 'Provider email and rejection note are required', 400);
    }

    const { applicantEmail } = await hiringService.rejectJobApplication(applicationId, providerEmail, rejectionNote);

    // Emit socket event to applicant
    try {
      if (applicantEmail) emitHiringUpdate(req, applicantEmail);
    } catch (socketErr) {
      console.error('Socket emission failed (non-critical):', socketErr);
    }

    return sendSuccess(res, { message: 'Application rejected successfully' });
  } catch (err) {
    if (err.errorCode) {
      return sendError(res, err.errorCode, err.message, err.statusCode);
    }
    console.error('Reject application failed:', err);
    return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
  }
}

async function acceptJobApplication(req, res) {
  try {
    const applicationId = parseInt(req.params.id);
    const { providerEmail, hireNote } = req.body;

    if (!providerEmail) {
      return sendError(res, 'VALIDATION_ERROR', 'Provider email is required', 400);
    }

    if (!hireNote || !hireNote.trim()) {
      return sendError(res, 'VALIDATION_ERROR', 'Hiring note is required', 400);
    }

    const { applicantEmail } = await hiringService.acceptJobApplication(applicationId, providerEmail, hireNote);

    // Emit socket event to applicant
    try {
      if (applicantEmail) emitHiringUpdate(req, applicantEmail);
    } catch (socketErr) {
      console.error('Socket emission failed (non-critical):', socketErr);
    }

    return sendSuccess(res, { message: 'Applicant hired successfully' });
  } catch (err) {
    if (err.errorCode) {
      return sendError(res, err.errorCode, err.message, err.statusCode);
    }
    console.error('Accept application failed:', err);
    return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
  }
}

async function getUserJobApplications(req, res) {
  try {
    const { userEmail } = req.query;

    if (!userEmail) {
      return sendError(res, 'VALIDATION_ERROR', 'User email is required', 400);
    }

    const result = await hiringService.getUserJobApplications(userEmail);
    return sendSuccess(res, { applications: result.applications });
  } catch (err) {
    console.error('Get user job applications failed:', err);
    return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
  }
}

async function downloadResume(req, res) {
  try {
    const applicationId = parseInt(req.params.id);
    const { providerEmail } = req.query;

    if (!providerEmail) {
      return sendError(res, 'VALIDATION_ERROR', 'Provider email is required', 400);
    }

    const result = await hiringService.getApplicationResume(applicationId, providerEmail);

    if (!result) {
      return sendError(res, 'NOT_FOUND', 'Application not found or access denied', 404);
    }

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.resumeFileName}"`);
    res.send(result.resumeFile);
  } catch (err) {
    console.error('Download resume failed:', err);
    return sendError(res, 'SERVER_ERROR', 'Database error: ' + err.message, 500);
  }
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
  rejectJobApplication,
  acceptJobApplication,
  getUserJobApplications,
  downloadResume,
};
