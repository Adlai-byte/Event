const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');
const { hiringRequestValidation } = require('../middleware/validationSchemas');
const { validate } = require('../middleware/validate');
const { paginate } = require('../middleware/paginate');
const ctrl = require('../controllers/hiringController');

// ============================================
// HIRING REQUESTS
// ============================================

router.post('/hiring/requests', authMiddleware, hiringRequestValidation, validate, ctrl.createHiringRequest);
router.get('/hiring/requests', authMiddleware, ctrl.getHiringRequests);
router.get('/hiring/requests/:id', authMiddleware, ctrl.getHiringRequestById);
router.put('/hiring/requests/:id', authMiddleware, ctrl.updateHiringRequest);

// ============================================
// PROPOSALS
// ============================================

router.post('/hiring/proposals', authMiddleware, requireRole('provider'), ctrl.createProposal);
router.get('/hiring/proposals', authMiddleware, ctrl.getProposals);
router.post('/hiring/proposals/:id/accept', authMiddleware, ctrl.acceptProposal);
router.post('/hiring/proposals/:id/reject', authMiddleware, ctrl.rejectProposal);

// ============================================
// PROVIDER JOB POSTINGS
// ============================================

router.get('/provider/job-postings/init-table', authMiddleware, requireRole('provider', 'admin'), ctrl.initJobPostingTable);
router.get('/provider/job-postings', authMiddleware, requireRole('provider', 'admin'), ctrl.getProviderJobPostings);
router.post('/provider/job-postings', authMiddleware, requireRole('provider', 'admin'), ctrl.createJobPosting);
router.put('/provider/job-postings/:id', authMiddleware, requireRole('provider', 'admin'), ctrl.updateJobPosting);
router.delete('/provider/job-postings/:id', authMiddleware, requireRole('provider', 'admin'), ctrl.deleteJobPosting);

// Public job postings (paginated)
router.get('/job-postings', paginate, ctrl.getPublicJobPostings);

// ============================================
// JOB APPLICATIONS
// ============================================

router.get('/job-applications/init-table', ctrl.initJobApplicationTable);
router.post('/job-applications', authMiddleware, ctrl.submitJobApplication);
router.get('/provider/job-applications', authMiddleware, requireRole('provider', 'admin'), ctrl.getProviderJobApplications);
router.put('/provider/job-applications/:id/schedule-interview', authMiddleware, requireRole('provider', 'admin'), ctrl.scheduleInterview);
router.put('/provider/job-applications/:id/reject', authMiddleware, requireRole('provider', 'admin'), ctrl.rejectJobApplication);
router.put('/provider/job-applications/:id/accept', authMiddleware, requireRole('provider', 'admin'), ctrl.acceptJobApplication);
router.get('/user/job-applications', authMiddleware, ctrl.getUserJobApplications);
router.get('/provider/job-applications/:id/resume', authMiddleware, requireRole('provider', 'admin'), ctrl.downloadResume);

module.exports = router;
