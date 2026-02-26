// __tests__/helpers/authMock.js
// Mock firebase-admin BEFORE any module imports it.
// Must be loaded via jest setupFiles (before test files run).

const TOKEN_MAP = {
  'test-token-admin': { uid: 'firebase-admin-uid', email: 'admin@event.test' },
  'test-token-provider': { uid: 'firebase-provider-uid', email: 'provider@event.test' },
  'test-token-user': { uid: 'firebase-user-uid', email: 'client@event.test' },
};

jest.mock('firebase-admin', () => ({
  apps: [{}], // non-empty array prevents initializeApp from being called
  initializeApp: jest.fn(),
  credential: { applicationDefault: jest.fn(), cert: jest.fn() },
  auth: () => ({
    verifyIdToken: jest.fn((token) => {
      const decoded = TOKEN_MAP[token];
      if (decoded) return Promise.resolve(decoded);
      return Promise.reject(new Error('Invalid token'));
    }),
    getUser: jest.fn(() => Promise.resolve({ uid: 'mock-uid' })),
    createUser: jest.fn(() => Promise.resolve({ uid: 'mock-uid' })),
  }),
  firestore: jest.fn(() => ({
    collection: jest.fn(),
  })),
  messaging: jest.fn(() => ({
    send: jest.fn(() => Promise.resolve('mock-message-id')),
  })),
}));
