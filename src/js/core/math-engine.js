/**
 * Math Engine: Handles problem generation, intelligent distractors,
 * adaptive spaced repetition weights, and difficulty filtering.
 */
export class MathEngine {
  constructor(options = {}) {
    this.allowedMultipliers = options.allowedMultipliers || [2, 3, 4, 5, 6, 7, 8, 9];
    this.maxFactor = options.maxFactor || 9;
    this.minFactor = options.minFactor || 2;
    this.recentProblems = [];
    this.statsStore = options.statsStore || null;
  }

  setStatsStore(store) {
    this.statsStore = store;
  }

  setAllowedMultipliers(multipliers) {
    if (Array.isArray(multipliers) && multipliers.length > 0) {
      this.allowedMultipliers = multipliers;
    }
  }

  /**
   * Generates a problem: a * b = answer, with believable distractors.
   * Adaptive: Prioritizes unlearned/weak combinations.
   */
  generateProblem(distractorCount = 2, overrideProblems = null) {
    let a, b;

    if (overrideProblems && overrideProblems.length > 0) {
      const chosen = overrideProblems[Math.floor(Math.random() * overrideProblems.length)];
      a = chosen.a;
      b = chosen.b;
    } else {
      // Adaptive sampling: 45% chance to drill an active weak/vault problem
      const vaultList = this.statsStore ? this.statsStore.getVaultList() : [];
      const filteredVault = vaultList.filter(p => this.allowedMultipliers.includes(p.a) || this.allowedMultipliers.includes(p.b));

      if (filteredVault.length > 0 && Math.random() < 0.45) {
        const chosen = filteredVault[Math.floor(Math.random() * filteredVault.length)];
        a = chosen.a;
        b = chosen.b;
      } else {
        let attempts = 0;
        do {
          a = this.allowedMultipliers[Math.floor(Math.random() * this.allowedMultipliers.length)];
          b = Math.floor(Math.random() * (this.maxFactor - this.minFactor + 1)) + this.minFactor;
          attempts++;
        } while (this.isRecent(a, b) && attempts < 10);
      }
    }

    this.pushRecent(a, b);
    const answer = a * b;
    const distractors = this.generateDistractors(a, b, answer, distractorCount);

    return {
      a,
      b,
      equation: `${a} × ${b}`,
      answer,
      distractors,
      allOptions: this.shuffle([answer, ...distractors])
    };
  }

  isRecent(a, b) {
    return this.recentProblems.some(p => (p.a === a && p.b === b) || (p.a === b && p.b === a));
  }

  pushRecent(a, b) {
    this.recentProblems.push({ a, b });
    if (this.recentProblems.length > 4) {
      this.recentProblems.shift();
    }
  }

  /**
   * Generates intelligent distractors that look like plausible answers.
   */
  generateDistractors(a, b, answer, count) {
    const pool = new Set();

    if (b > 1) pool.add(a * (b - 1));
    pool.add(a * (b + 1));
    if (a > 1) pool.add((a - 1) * b);
    pool.add((a + 1) * b);
    pool.add(answer + 2);
    if (answer > 2) pool.add(answer - 2);
    if (answer > 10) pool.add(answer - 10);
    pool.add(answer + 10);

    const trapPairs = [
      [54, 56], [42, 48], [63, 64], [36, 42], [24, 28], [72, 81], [45, 54]
    ];
    for (const [p1, p2] of trapPairs) {
      if (answer === p1) pool.add(p2);
      if (answer === p2) pool.add(p1);
    }

    pool.delete(answer);
    const valid = Array.from(pool).filter(n => n > 1 && n <= 144);
    const shuffled = this.shuffle(valid);
    const chosen = shuffled.slice(0, count);

    while (chosen.length < count) {
      const fallback = Math.max(2, answer + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 8) + 1));
      if (fallback !== answer && !chosen.includes(fallback)) {
        chosen.push(fallback);
      }
    }

    return chosen;
  }

  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
