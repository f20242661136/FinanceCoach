import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPlanOverview, daysBetween, dueLabel, progressPercent } from '../src/features/planning/plan-intelligence.ts';

const today = '2026-09-30';
const budget = (changes = {}) => ({ id: 'b', name: 'Food', period_start: '2026-09-01', period_end: today, usage_basis_points: '5000', is_over_budget: false, remaining_minor: '5000', currency_code: 'PKR', ...changes });
const goal = (changes = {}) => ({ id: 'g', name: 'Travel', status: 'active', target_date: '2026-10-07', is_target_reached: false, remaining_minor: '10000', currency_code: 'USD', ...changes });
const loan = (changes = {}) => ({ id: 'l', counterparty_name: 'Friend', status: 'active', remaining_minor: '10000', due_date: today, direction: 'borrowed', currency_code: 'PKR', ...changes });
const group = (changes = {}) => ({ id: 'r', name: 'Family saving', status: 'active', next_due_date: today, ...changes });
const loaded = { today, budgets: [], goals: [], loans: [], groups: [] };

test('loading/failed sources remain unknown; an empty successful response is known', () => {
  const pending = buildPlanOverview({ today });
  assert.equal(pending.sourcesComplete, false);
  assert.equal(pending.steadyBudgetCount, undefined);
  assert.equal(pending.activeGoalCount, undefined);
  assert.equal(buildPlanOverview(loaded).sourcesComplete, true);
  assert.equal(buildPlanOverview(loaded).steadyBudgetCount, 0);
});

test('current budgets below 80% are distinct from warning budgets; expired/future periods do not count', () => {
  const result = buildPlanOverview({ ...loaded, budgets: [budget(), budget({ id: 'near', usage_basis_points: '8000' }), budget({ id: 'old', period_end: '2026-08-31' }), budget({ id: 'future', period_start: '2026-10-01', period_end: '2026-10-31' })] });
  assert.equal(result.steadyBudgetCount, 1);
  assert.equal(result.activeBudgetCount, 2);
  assert.deepEqual(result.attention.map(item => item.id), ['budget:near']);
});

test('budget excess uses exact integer arithmetic and never merges currencies', () => {
  const result = buildPlanOverview({ ...loaded, budgets: [budget({ is_over_budget: true, remaining_minor: '-90071992547409931234' })] });
  assert.equal(result.attention[0].amountMinor, '90071992547409931234');
  assert.equal(result.attention[0].currency, 'PKR');
  assert.equal(result.attention[0].amountLabel, 'over');
});

test('overdue unfinished goals need review; reached/paused/completed goals do not become overdue alerts', () => {
  const result = buildPlanOverview({ ...loaded, goals: [goal({ target_date: '2026-09-29' }), goal({ id: 'reached', target_date: '2026-09-29', is_target_reached: true }), goal({ id: 'paused', status: 'paused', target_date: '2026-09-29' }), goal({ id: 'done', status: 'completed', target_date: '2026-09-29' })] });
  assert.deepEqual(result.attention.map(item => item.id), ['goal:g']);
  assert.equal(result.activeGoalCount, 2);
  assert.equal(result.reachedGoals.length, 1);
  assert.deepEqual(result.attention[0].params, { goalId: 'g' });
});

test('upcoming goals include the seven-day boundary and exclude eight days away', () => {
  const result = buildPlanOverview({ ...loaded, goals: [goal(), goal({ id: 'later', target_date: '2026-10-08' }), goal({ id: 'no-date', target_date: null })] });
  assert.deepEqual(result.upcoming.map(item => item.id), ['goal:g']);
});

test('outstanding loan reviews precede budget warnings; settled/archived/zero-balance loans do not alert', () => {
  const result = buildPlanOverview({ ...loaded, budgets: [budget({ is_over_budget: true, remaining_minor: '-20' })], loans: [loan({ due_date: '2026-09-29' }), loan({ id: 'settled', status: 'settled', due_date: '2026-09-29' }), loan({ id: 'archived', status: 'archived', due_date: '2026-09-29' }), loan({ id: 'paid', remaining_minor: '0', due_date: '2026-09-29' })] });
  assert.deepEqual(result.attention.map(item => item.id), ['loan:l', 'budget:b']);
  assert.equal(result.activeLoanCount, 1);
});

test('given loans are expected repayments and defaulted loans with no date still need review', () => {
  const given = buildPlanOverview({ ...loaded, loans: [loan({ direction: 'given' })] });
  assert.match(given.upcoming[0].detail, /Expected repayment/);
  const defaulted = buildPlanOverview({ ...loaded, loans: [loan({ status: 'defaulted', due_date: null })] });
  assert.equal(defaulted.attention.length, 1);
  assert.match(defaulted.attention[0].detail, /defaulted/);
});

test('ROSCA dates describe group cycles without inferring a personal unpaid contribution', () => {
  const result = buildPlanOverview({ ...loaded, groups: [group({ next_due_date: '2026-09-29' }), group({ id: 'forming', status: 'forming', next_due_date: '2026-09-29' }), group({ id: 'done', status: 'completed', next_due_date: '2026-09-29' })] });
  assert.equal(result.activeGroupCount, 1);
  assert.equal(result.attention.length, 1);
  assert.match(result.attention[0].detail, /Open group cycle/);
  assert.doesNotMatch(result.attention[0].detail, /unpaid|missed payment/);
});

test('upcoming items sort by date across tool types and retain exact detail-route identifiers', () => {
  const result = buildPlanOverview({ ...loaded, goals: [goal()], groups: [group({ next_due_date: '2026-10-01' })], loans: [loan()] });
  assert.deepEqual(result.upcoming.map(item => item.id), ['loan:l', 'rosca:r', 'goal:g']);
  assert.deepEqual(result.upcoming[0].params, { loanId: 'l' });
  assert.deepEqual(result.upcoming[1].params, { groupId: 'r' });
});

test('calendar boundaries and progress bars are stable, including leap days and huge values', () => {
  assert.equal(daysBetween('2024-02-28', '2024-03-01'), 2);
  assert.equal(dueLabel(today, today), 'Today');
  assert.equal(dueLabel(today, '2026-10-01'), 'Tomorrow');
  assert.equal(dueLabel(today, '2026-09-29'), '1 day past date');
  assert.equal(progressPercent('90071992547409931234'), 100);
  assert.equal(progressPercent('4567'), 45.67);
});
