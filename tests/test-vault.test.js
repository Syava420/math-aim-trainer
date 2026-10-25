import assert from 'node:assert';
import { StatsStore } from '../src/js/core/stats-store.js';

console.log('--- RUNNING HARD PROBLEMS VAULT TESTS ---');

// Mock localStorage
const storage = new Map();
global.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, val) => storage.set(key, val),
  clear: () => storage.clear()
};

const store = new StatsStore();
store.clearVault();

// Test 1: Manual add & toggle
assert.strictEqual(store.getVaultCount(), 0, 'Vault should be empty initially');
store.addToVault(7, 8, true);
assert.strictEqual(store.getVaultCount(), 1, 'Vault should have 1 problem');
assert.strictEqual(store.isInVault(7, 8), true, '7x8 should be in vault');
assert.strictEqual(store.isInVault(8, 7), true, '8x7 should also match vault key');

// Toggle removal
store.toggleVault(7, 8);
assert.strictEqual(store.getVaultCount(), 0, 'Toggle should remove 7x8');

// Test 2: Auto-record from round misses
store.recordRound({
  mode: 'gridshot_60',
  score: 1200,
  hits: 10,
  misses: 2,
  accuracy: 83,
  avgReactionMs: 500,
  maxStreak: 5,
  weakProblems: [
    { a: 9, b: 6, isMiss: true },
    { a: 8, b: 7, isMiss: false, reactionMs: 1800 } // slow reaction
  ]
});

assert.strictEqual(store.isInVault(9, 6), true, 'Missed 9x6 should be auto-added to vault');
assert.strictEqual(store.isInVault(8, 7), true, 'Slow reaction 8x7 (>1.5s) should be auto-added to vault');
assert.strictEqual(store.getVaultCount(), 2, 'Vault should contain both auto-added problems');

const list = store.getVaultList();
assert(list.some(p => p.a === 6 && p.b === 9 && p.misses === 1), 'Miss count recorded');

console.log('✓ All Hard Problems Vault tests passed cleanly!');
