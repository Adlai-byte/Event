// Knex.js configuration for database migrations
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connection = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'event',
  port: Number(process.env.DB_PORT || 3306),
  charset: 'utf8mb4',
};

module.exports = {
  development: {
    client: 'mysql2',
    connection,
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: path.join(__dirname, 'seeds'),
    },
  },

  test: {
    client: 'mysql2',
    connection: {
      ...connection,
      database: process.env.DB_NAME_TEST || 'event_test',
    },
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: path.join(__dirname, 'seeds'),
    },
  },

  production: {
    client: 'mysql2',
    connection,
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      tableName: 'knex_migrations',
    },
    pool: { min: 2, max: 20 },
  },
};
