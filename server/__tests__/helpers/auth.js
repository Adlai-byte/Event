// __tests__/helpers/auth.js
// Convenience helpers for authenticated supertest requests.

const TOKENS = {
  admin: 'test-token-admin',
  provider: 'test-token-provider',
  user: 'test-token-user',
};

/**
 * Returns header object to authenticate as a given role.
 * Usage: request(app).get('/api/foo').set(authAs('admin'))
 */
function authAs(role) {
  const token = TOKENS[role];
  if (!token) throw new Error(`Unknown role: ${role}`);
  return { Authorization: `Bearer ${token}` };
}

module.exports = { TOKENS, authAs };
