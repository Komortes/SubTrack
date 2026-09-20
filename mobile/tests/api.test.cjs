const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadModule } = require('./loadModule.cjs');
const api = loadModule('lib/api.ts', {
  'expo-constants': {},
  'expo-secure-store': {},
});

test('partial subscription updates preserve an existing cancellation reminder', () => {
  const payload = JSON.parse(JSON.stringify(api.toApiSubscription({ isActive: false }, { includeId: false })));
  assert.deepEqual(payload, { is_active: false });
});

test('a reminder can still be explicitly cleared', () => {
  assert.equal(api.toApiSubscription({ cancelReminderDays: null }).cancel_reminder_days, null);
});

test('subscription imports retain canonical UUID versions 1 through 8', () => {
  for (let version = 1; version <= 8; version += 1) {
    const id = `01991aaa-1234-${version}123-8123-123456789abc`;
    assert.equal(api.toApiSubscription({ id, name: 'Imported' }).id, id);
  }
});

test('monthly analytics maps currency subtotals without assigning a currency to legacy totals', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => ({
    ok: true,
    status: 200,
    json: async () => ({ months: [
      { key: '2026-05', label: 'May', total: 110, totals_by_currency: { CZK: '100.00', USD: 10 } },
      { key: '2026-04', label: 'Apr', total: 20 },
    ] }),
  }));
  const client = loadModule('lib/api.ts', {
    'expo-constants': {},
    'expo-secure-store': { getItemAsync: async () => null },
  });

  const points = await client.fetchMonthlyAnalytics();
  assert.deepEqual(points[0].totalsByCurrency, { CZK: 100, USD: 10 });
  assert.equal(points[1].totalsByCurrency, undefined);
});
