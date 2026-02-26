const request = require('supertest');
const { app } = require('../../index');
const { authAs } = require('../helpers/auth');
const { truncateAll, seedCoreUsers } = require('../helpers/cleanup');
const { createHiringRequest, createProposal, createJobPosting, createJobApplication } = require('../helpers/factories');

let seed;

beforeAll(async () => {
  await truncateAll();
  seed = await seedCoreUsers();
});

afterAll(async () => {
  await truncateAll();
});

// ─── Hiring Requests ────────────────────────────────────────────────
describe('POST /api/hiring/requests', () => {
  it('creates a hiring request with valid data', async () => {
    const res = await request(app)
      .post('/api/hiring/requests')
      .set(authAs('user'))
      .send({
        clientId: 'client@event.test',
        title: 'Need a Photographer',
        description: 'Looking for a professional photographer for a wedding event',
        budget: { min: 5000, max: 15000 },
        timeline: { startDate: '2026-06-01', endDate: '2026-06-02', isFlexible: false },
        location: { city: 'Davao City', state: 'Davao del Sur', type: 'on-site' },
      });
    expect([200, 201]).toContain(res.status);
    expect(res.body.ok).toBe(true);
  });

  it('returns 400 for missing title', async () => {
    const res = await request(app)
      .post('/api/hiring/requests')
      .set(authAs('user'))
      .send({ description: 'No title here' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing description', async () => {
    const res = await request(app)
      .post('/api/hiring/requests')
      .set(authAs('user'))
      .send({ title: 'No description' });
    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/hiring/requests')
      .send({ title: 'Unauth', description: 'Should fail' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/hiring/requests', () => {
  it('returns hiring requests for authenticated user', async () => {
    const res = await request(app)
      .get('/api/hiring/requests')
      .set(authAs('user'))
      .query({ email: 'client@event.test' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('GET /api/hiring/requests/:id', () => {
  let hr;
  beforeAll(async () => {
    hr = await createHiringRequest('client@event.test');
  });

  it('returns a specific hiring request', async () => {
    const res = await request(app)
      .get(`/api/hiring/requests/${hr.id}`)
      .set(authAs('user'));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 404 for nonexistent request', async () => {
    const res = await request(app)
      .get('/api/hiring/requests/99999')
      .set(authAs('user'));
    expect(res.status).toBe(404);
  });
});

// ─── Proposals ──────────────────────────────────────────────────────
describe('POST /api/hiring/proposals', () => {
  let hr;
  beforeAll(async () => {
    hr = await createHiringRequest('client@event.test');
  });

  it('allows provider to create a proposal', async () => {
    const res = await request(app)
      .post('/api/hiring/proposals')
      .set(authAs('provider'))
      .send({
        providerId: 'provider@event.test',
        hiringRequestId: hr.id,
        title: 'Photography Proposal',
        description: 'I can do this for you',
        proposedBudget: 8000,
        timeline: { startDate: '2026-06-01', endDate: '2026-06-02' },
        deliverables: ['Edited photos', 'Photo album'],
      });
    expect([200, 201]).toContain(res.status);
    expect(res.body.ok).toBe(true);
  });

  it('denies regular user from creating proposal (403)', async () => {
    const res = await request(app)
      .post('/api/hiring/proposals')
      .set(authAs('user'))
      .send({
        providerId: 'client@event.test',
        hiringRequestId: hr.id,
        title: 'Test Proposal',
        description: 'Test',
        proposedBudget: 5000,
        timeline: { startDate: '2026-06-01', endDate: '2026-06-02' },
        deliverables: ['Test deliverable'],
      });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/hiring/proposals', () => {
  it('returns proposals for authenticated user', async () => {
    const res = await request(app)
      .get('/api/hiring/proposals')
      .set(authAs('user'))
      .query({ email: 'client@event.test' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('Proposal accept/reject', () => {
  let hr, proposal;
  beforeAll(async () => {
    hr = await createHiringRequest('client@event.test');
    proposal = await createProposal(hr.id, 'provider@event.test');
  });

  it('accepts a proposal', async () => {
    const res = await request(app)
      .post(`/api/hiring/proposals/${proposal.id}/accept`)
      .set(authAs('user'))
      .send({ hiringRequestId: hr.id });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('rejects a proposal', async () => {
    const hr2 = await createHiringRequest('client@event.test');
    const p2 = await createProposal(hr2.id, 'provider@event.test');
    const res = await request(app)
      .post(`/api/hiring/proposals/${p2.id}/reject`)
      .set(authAs('user'))
      .send({ reason: 'Not a good fit' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ─── Provider Job Postings ──────────────────────────────────────────
describe('Provider Job Postings', () => {
  it('initializes job posting table', async () => {
    const res = await request(app)
      .get('/api/provider/job-postings/init-table')
      .set(authAs('provider'));
    expect(res.status).toBe(200);
  });

  it('provider creates a job posting', async () => {
    const res = await request(app)
      .post('/api/provider/job-postings')
      .set(authAs('provider'))
      .send({
        providerEmail: 'provider@event.test',
        jobTitle: 'Event Coordinator',
        description: 'Looking for event coordinator',
        deadlineDate: '2026-12-31',
        jobType: 'full_time',
      });
    expect([200, 201]).toContain(res.status);
    expect(res.body.ok).toBe(true);
  });

  it('provider lists own job postings', async () => {
    const res = await request(app)
      .get('/api/provider/job-postings')
      .set(authAs('provider'))
      .query({ providerEmail: 'provider@event.test' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('denies regular user from creating job posting (403)', async () => {
    const res = await request(app)
      .post('/api/provider/job-postings')
      .set(authAs('user'))
      .send({ title: 'Sneaky', description: 'Nope' });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/job-postings (public)', () => {
  it('lists public job postings', async () => {
    const res = await request(app).get('/api/job-postings');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ─── Job Applications ───────────────────────────────────────────────
describe('Job Applications', () => {
  let jobPosting;
  beforeAll(async () => {
    jobPosting = await createJobPosting('provider@event.test');
  });

  it('initializes job application table', async () => {
    const res = await request(app).get('/api/job-applications/init-table');
    expect(res.status).toBe(200);
  });

  it('user submits a job application', async () => {
    const res = await request(app)
      .post('/api/job-applications')
      .set(authAs('user'))
      .send({
        jobPostingId: jobPosting.id,
        userEmail: 'client@event.test',
        resumeFile: Buffer.from('fake-pdf-content').toString('base64'),
        resumeFileName: 'resume.pdf',
      });
    expect([200, 201]).toContain(res.status);
    expect(res.body.ok).toBe(true);
  });

  it('provider gets job applications', async () => {
    const res = await request(app)
      .get('/api/provider/job-applications')
      .set(authAs('provider'))
      .query({ providerEmail: 'provider@event.test' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('user gets own job applications', async () => {
    const res = await request(app)
      .get('/api/user/job-applications')
      .set(authAs('user'))
      .query({ userEmail: 'client@event.test' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
