// Server test setup

// Set test environment variables BEFORE anything else
process.env.NODE_ENV = 'test';
process.env.PORT = '3099';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'root';
process.env.DB_PASSWORD = 'root';
process.env.DB_NAME = 'event_test';
process.env.DB_PORT = '3306';
process.env.LOG_LEVEL = 'error'; // Suppress logs during tests

// Mock firebase-admin before any module can import it
require('./__tests__/helpers/authMock');
