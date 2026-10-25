import assert from 'node:assert';
import { ResultsView } from '../src/js/ui/results-view.js';

console.log('--- RUNNING SCORING & RANK TESTS ---');

// Mock DOM elements for ResultsView testing in isolation
global.document = {
  getElementById: () => null
};

const view = new ResultsView({});

// Test 1: S+ Rank
const rankSPlus = view.calculateRank(96, 420, 20);
assert.strictEqual(rankSPlus.rank, 'S+', 'Should be S+ rank');

// Test 2: S Rank
const rankS = view.calculateRank(92, 550, 15);
assert.strictEqual(rankS.rank, 'S', 'Should be S rank');

// Test 3: A Rank
const rankA = view.calculateRank(85, 750, 15);
assert.strictEqual(rankA.rank, 'A', 'Should be A rank');

// Test 4: Low hits
const rankC = view.calculateRank(100, 300, 2);
assert.strictEqual(rankC.rank, 'C', 'Should be C rank when under 5 hits');

console.log('✓ All scoring & rank tests passed cleanly!');
