const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadModule } = require('./loadModule.cjs');
const math = loadModule('lib/subscriptionMath.ts', {
  './dateFormat': loadModule('lib/dateFormat.ts'),
});

test('renewals preserve local calendar dates across timezones and month ends', () => {
  const previousZone = process.env.TZ;
  try {
    for (const zone of ['Europe/Prague', 'America/Los_Angeles', 'Asia/Tokyo']) {
      process.env.TZ = zone;
      for (const [date, period, expected] of [
        ['2026-01-31', 'monthly', '2026-02-28'],
        ['2024-02-29', 'yearly', '2025-02-28'],
        ['2026-03-25', 'weekly', '2026-04-01'],
        ['2026-12-20', 'custom', '2027-01-19'],
      ]) {
        assert.equal(math.nextRenewalDate({ renewalDate: date, billingPeriod: period }), expected, `${zone} ${period}`);
      }
    }
  } finally {
    if (previousZone === undefined) delete process.env.TZ;
    else process.env.TZ = previousZone;
  }
});

test('days until is calendar based across daylight saving changes', () => {
  const previousZone = process.env.TZ;
  process.env.TZ = 'Europe/Prague';
  try {
    assert.equal(math.daysUntil('2026-10-26', new Date('2026-10-24T12:00:00')), 2);
    assert.equal(math.daysUntil('2026-03-30', new Date('2026-03-28T12:00:00')), 2);
  } finally {
    if (previousZone === undefined) delete process.env.TZ;
    else process.env.TZ = previousZone;
  }
});

test('money retains cents instead of rounding a subscription price', () => {
  assert.match(math.formatMoney(9.99, 'USD'), /9[,.]99/);
});
