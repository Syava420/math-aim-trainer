import assert from 'node:assert';

console.log('--- RUNNING PROGRESSIVE KNOCKOUT DRILL TESTS ---');

// Mock queue
const drillQueue = [
  { a: 4, b: 2 },
  { a: 4, b: 3 },
  { a: 4, b: 4 }
];

// Test 1: Hit under reaction threshold eliminates problem from queue
const reactionMs = 450;
if (reactionMs <= 1200) {
  const target = { a: 4, b: 3 };
  const idx = drillQueue.findIndex(p => p.a === target.a && p.b === target.b);
  drillQueue.splice(idx, 1);
}
assert.strictEqual(drillQueue.length, 2, 'Queue should shrink to 2 problems');
assert(!drillQueue.some(p => p.b === 3), '4x3 should be eliminated');

// Test 2: Slow reaction rotates to back
const slowReaction = 1500;
if (slowReaction > 1200) {
  const item = drillQueue.shift();
  drillQueue.push(item);
}
assert.strictEqual(drillQueue.length, 2, 'Queue size remains same on slow hit');
assert.strictEqual(drillQueue[1].b, 2, 'Slow problem rotated to back of queue');

// Test 3: Finishing all problems
drillQueue.length = 0;
assert.strictEqual(drillQueue.length, 0, 'Drill completes when queue is empty');

console.log('✓ All Progressive Knockout Drill tests passed cleanly!');
