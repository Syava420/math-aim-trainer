import assert from 'node:assert';
import { MathEngine } from '../src/js/core/math-engine.js';

console.log('--- RUNNING MATH AIM TRAINER LOGIC TESTS ---');

// Test 1: MathEngine basic generation
const engine = new MathEngine({ allowedMultipliers: [6, 7, 8, 9] });
for (let i = 0; i < 50; i++) {
  const prob = engine.generateProblem(2);
  assert(prob.a >= 6 && prob.a <= 9, `Multiplier ${prob.a} not in allowed range`);
  assert.strictEqual(prob.answer, prob.a * prob.b, `Calculation mismatch: ${prob.a} * ${prob.b} !== ${prob.answer}`);
  assert.strictEqual(prob.distractors.length, 2, 'Must have 2 distractors');
  assert(!prob.distractors.includes(prob.answer), 'Distractor must not equal answer');
  assert.strictEqual(prob.allOptions.length, 3, 'Must have 3 total target options');
  assert(prob.allOptions.includes(prob.answer), 'All options must include answer');
}
console.log('✓ Test 1: MathEngine generation and distractor logic passed (50 iterations)');

// Test 2: Table customization
const customEngine = new MathEngine({ allowedMultipliers: [7] });
for (let i = 0; i < 20; i++) {
  const prob = customEngine.generateProblem(2);
  assert.strictEqual(prob.a, 7, 'Must only generate table of 7');
  assert.strictEqual(prob.answer, 7 * prob.b);
}
console.log('✓ Test 2: Custom table filter passed (table of 7)');

// Test 3: Weak problem override pool
const overridePool = [{ a: 8, b: 7 }, { a: 9, b: 6 }];
const weakEngine = new MathEngine();
const weakProb = weakEngine.generateProblem(2, overridePool);
assert((weakProb.a === 8 && weakProb.b === 7) || (weakProb.a === 9 && weakProb.b === 6), 'Must pick from override pool');
console.log('✓ Test 3: Weak problem override pool passed');

console.log('--- ALL AUTOMATED TESTS PASSED (0 ERRORS) ---');
