import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setupStep, preferredCurrency, filterCurrencies } from '../src/features/getting-started/setup-progress.ts';

const currencies = [
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
];

test('new user begins with account creation', () => {
  assert.equal(setupStep({ hasActiveAccount: false, hasTransaction: false }), 'account');
});
test('an account alone still needs an expense or income', () => {
  assert.equal(setupStep({ hasActiveAccount: true, hasTransaction: false }), 'transaction');
});
test('both saved facts complete setup', () => {
  assert.equal(setupStep({ hasActiveAccount: true, hasTransaction: true }), 'complete');
});
test('past transactions do not hide the need for an active account', () => {
  assert.equal(setupStep({ hasActiveAccount: false, hasTransaction: true }), 'account');
});
test('account currency follows the profile instead of hardcoded PKR', () => {
  assert.equal(preferredCurrency(currencies, 'USD'), 'USD');
});
test('unsupported or missing preferred currency falls back to a supported code', () => {
  assert.equal(preferredCurrency(currencies, 'EUR'), 'JPY');
  assert.equal(preferredCurrency(currencies, null), 'JPY');
});
test('empty reference data never invents a currency', () => {
  assert.equal(preferredCurrency([], 'USD'), '');
});
test('currency search trims input and matches codes regardless of case', () => {
  assert.deepEqual(filterCurrencies(currencies, ' usd '), [currencies[2]]);
});
test('currency search matches names and symbols', () => {
  assert.deepEqual(filterCurrencies(currencies, 'rupee'), [currencies[1]]);
  assert.deepEqual(filterCurrencies(currencies, '¥'), [currencies[0]]);
});
test('blank search shows all currencies; unknown input shows no matches', () => {
  assert.deepEqual(filterCurrencies(currencies, '  '), currencies);
  assert.deepEqual(filterCurrencies(currencies, 'euros'), []);
});
