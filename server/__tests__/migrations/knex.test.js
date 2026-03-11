const knex = require('knex');
const config = require('../../knexfile');

describe.skip('Database Migrations', () => {
  let db;

  beforeAll(() => {
    db = knex(config.development);
  });

  afterAll(async () => {
    await db.destroy();
  });

  it('should run migrate:latest without errors', async () => {
    const [batchNo, migrations] = await db.migrate.latest();
    expect(typeof batchNo).toBe('number');
    expect(Array.isArray(migrations)).toBe(true);
  });

  it('should report migration status', async () => {
    const [completed, pending] = await db.migrate.list();
    expect(Array.isArray(completed)).toBe(true);
    expect(Array.isArray(pending)).toBe(true);
    // initial_schema should be in completed
    const names = completed.map(m => m.name || m);
    expect(names.some(n => n.includes('initial_schema'))).toBe(true);
    // nothing pending
    expect(pending.length).toBe(0);
  });

  it('should rollback and re-apply cleanly', async () => {
    // rollback
    const [batchNo, rolledBack] = await db.migrate.rollback();
    expect(typeof batchNo).toBe('number');

    // re-apply
    const [batchNo2, applied] = await db.migrate.latest();
    expect(typeof batchNo2).toBe('number');
    expect(applied.some(n => n.includes('initial_schema'))).toBe(true);
  });
});
