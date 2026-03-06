import { type FullConfig } from '@playwright/test';
import { API_BASE } from './fixtures/test-data';

/**
 * Global teardown for E2E tests.
 * Removes all e2e test data from the database.
 */
async function globalTeardown(_config: FullConfig): Promise<void> {
  console.log('[global-teardown] Cleaning up test data...');

  try {
    const response = await fetch(`${API_BASE}/api/test/cleanup`, { method: 'DELETE' });
    const data = await response.json();
    console.log(`[global-teardown] ${data.message}`);
  } catch (error) {
    console.error('[global-teardown] Cleanup failed:', error);
  }

  console.log('[global-teardown] Teardown complete.');
}

export default globalTeardown;
