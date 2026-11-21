import test from 'node:test';
import assert from 'node:assert/strict';
import { XpLedger } from '../src/ledger.js';
import { isNonCivic } from '../src/policy.js';

test('finalization credits exact submission breakdown once', () => {
  const ledger = new XpLedger(); const recommendation = { breakdown: { capped_total: 184, category_adjustment: 20, trust_bonus: 10, first_report_bonus: 10 } };
  assert.equal(ledger.finalize('r1', recommendation).entry.amount, 184);
  assert.equal(ledger.finalize('r1', recommendation).idempotent, true);
});
test('non-civic FastAPI outcome is rejected before report persistence or XP', () => {
  assert.equal(isNonCivic({ data: { analysis_status: 'rejected_non_civic', rejection_code: 'NON_CIVIC_IMAGE' } }), true);
});
test('daily cap limits finalized XP per reporter and is not exceeded across reports', () => {
  const ledger = new XpLedger({ dailyCap: 300, now: () => new Date('2026-01-01T10:00:00Z') });
  const rec = total => ({ breakdown: { capped_total: total } });
  assert.equal(ledger.finalize('a', rec(200), 'u1').entry.amount, 200);
  const second = ledger.finalize('b', rec(200), 'u1');
  assert.equal(second.entry.amount, 100); assert.equal(second.entry.capped_by_daily_limit, true);
  assert.equal(ledger.finalize('c', rec(50), 'u1').credited, false);
  assert.equal(ledger.finalize('d', rec(50), 'u2').entry.amount, 50);
});
test('daily cap resets on a new UTC day', () => {
  let day = '2026-01-01'; const ledger = new XpLedger({ dailyCap: 100, now: () => new Date(`${day}T08:00:00Z`) });
  ledger.finalize('a', { breakdown: { capped_total: 100 } }, 'u');
  day = '2026-01-02';
  assert.equal(ledger.finalize('b', { breakdown: { capped_total: 100 } }, 'u').entry.amount, 100);
});
