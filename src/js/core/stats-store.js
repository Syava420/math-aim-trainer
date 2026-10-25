/**
 * Stats Store: Handles persistence of high scores, round histories, weak-spot analytics,
 * and adaptive mastery tracking for every multiplication fact.
 */
const STORAGE_KEY = 'math_aim_trainer_stats_v1';
const SETTINGS_KEY = 'math_aim_trainer_settings_v1';

export class StatsStore {
  constructor() {
    this.data = this.loadData();
    this.settings = this.loadSettings();
  }

  loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return {
        highScores: parsed?.highScores || {},
        history: parsed?.history || [],
        problemStats: parsed?.problemStats || {},
        hardVault: parsed?.hardVault || {},
        mastery: parsed?.mastery || {} // key: "min x max" => { score: 0..100, attempts, fastHits }
      };
    } catch {
      return { highScores: {}, history: [], problemStats: {}, hardVault: {}, mastery: {} };
    }
  }

  saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Failed to save stats to localStorage', e);
    }
  }

  loadSettings() {
    const defaults = {
      volume: 0.6,
      muted: false,
      targetSize: 'medium',
      crosshair: 'cross',
      multipliers: [2, 3, 4, 5, 6, 7, 8, 9],
      mode: 'gridshot_60'
    };
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
    } catch {
      return defaults;
    }
  }

  saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Failed to save settings', e);
    }
  }

  /* --- Hard Problems Vault (База сложных) --- */

  getVaultKey(a, b) {
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    return `${min}x${max}`;
  }

  addToVault(a, b, manual = false, fromMiss = false) {
    const key = this.getVaultKey(a, b);
    if (!this.data.hardVault) this.data.hardVault = {};

    if (!this.data.hardVault[key]) {
      this.data.hardVault[key] = {
        a: Math.min(a, b),
        b: Math.max(a, b),
        answer: a * b,
        misses: fromMiss ? 1 : 0,
        manual: Boolean(manual),
        addedAt: new Date().toISOString()
      };
    } else {
      if (fromMiss) this.data.hardVault[key].misses = (this.data.hardVault[key].misses || 0) + 1;
      if (manual) this.data.hardVault[key].manual = true;
    }
    this.saveData();
    return this.data.hardVault[key];
  }

  removeFromVault(a, b) {
    const key = this.getVaultKey(a, b);
    if (this.data.hardVault && this.data.hardVault[key]) {
      delete this.data.hardVault[key];
      this.saveData();
      return true;
    }
    return false;
  }

  toggleVault(a, b) {
    if (this.isInVault(a, b)) {
      this.removeFromVault(a, b);
      return false;
    } else {
      this.addToVault(a, b, true);
      return true;
    }
  }

  isInVault(a, b) {
    const key = this.getVaultKey(a, b);
    return Boolean(this.data.hardVault && this.data.hardVault[key]);
  }

  getVaultList() {
    return Object.values(this.data.hardVault || {});
  }

  getVaultCount() {
    return Object.keys(this.data.hardVault || {}).length;
  }

  clearVault() {
    this.data.hardVault = {};
    this.saveData();
  }

  /* --- Adaptive Fact Mastery Tracking --- */

  recordAnswer(a, b, isCorrect, reactionMs) {
    const key = this.getVaultKey(a, b);
    if (!this.data.mastery) this.data.mastery = {};
    const item = this.data.mastery[key] || { score: 0, attempts: 0, fastHits: 0 };

    item.attempts++;
    if (isCorrect) {
      if (reactionMs < 550) {
        item.score = Math.min(100, item.score + 25);
        item.fastHits = (item.fastHits || 0) + 1;
      } else if (reactionMs < 950) {
        item.score = Math.min(100, item.score + 15);
      } else {
        item.score = Math.min(100, item.score + 8);
      }

      // If well-mastered, graduate from hard vault
      if (item.score >= 80 && item.fastHits >= 2) {
        this.removeFromVault(a, b);
      }
    } else {
      item.score = Math.max(0, item.score - 35);
      item.fastHits = 0;
      this.addToVault(a, b, false, true);
    }

    this.data.mastery[key] = item;
    this.saveData();
  }

  getMastery(a, b) {
    const key = this.getVaultKey(a, b);
    const item = this.data.mastery?.[key];
    if (!item || item.attempts === 0) {
      return { score: 0, status: 'unseen', attempts: 0, fastHits: 0 };
    }
    if (this.isInVault(a, b) || item.score < 40) {
      return { score: item.score, status: 'weak', attempts: item.attempts, fastHits: item.fastHits };
    }
    if (item.score >= 80) {
      return { score: item.score, status: 'mastered', attempts: item.attempts, fastHits: item.fastHits };
    }
    return { score: item.score, status: 'learning', attempts: item.attempts, fastHits: item.fastHits };
  }

  getTableHeatmapStats() {
    let total = 0;
    let masteredCount = 0;
    let learningCount = 0;
    let weakCount = 0;
    let totalScore = 0;

    for (let r = 2; r <= 9; r++) {
      for (let c = r; c <= 9; c++) {
        total++;
        const info = this.getMastery(r, c);
        totalScore += info.score;
        if (info.status === 'mastered') masteredCount++;
        else if (info.status === 'learning') learningCount++;
        else if (info.status === 'weak') weakCount++;
      }
    }

    const overallPercent = Math.round(totalScore / total);
    return { total, masteredCount, learningCount, weakCount, overallPercent };
  }

  /* --- Round & Stats Recording --- */

  recordRound(summary) {
    const { mode, score, hits, misses, accuracy, avgReactionMs, maxStreak, weakProblems } = summary;

    const currentHigh = this.data.highScores[mode] || 0;
    const isNewHigh = score > currentHigh;
    if (isNewHigh) {
      this.data.highScores[mode] = score;
    }

    const entry = {
      date: new Date().toISOString(),
      mode,
      score,
      hits,
      misses,
      accuracy,
      avgReactionMs,
      maxStreak,
      isNewHigh
    };
    this.data.history.unshift(entry);
    if (this.data.history.length > 50) this.data.history.pop();

    if (Array.isArray(weakProblems)) {
      for (const item of weakProblems) {
        const key = this.getVaultKey(item.a, item.b);
        if (!this.data.problemStats[key]) {
          this.data.problemStats[key] = { a: item.a, b: item.b, misses: 0, totalTime: 0, attempts: 0 };
        }
        const stat = this.data.problemStats[key];
        stat.attempts++;
        if (item.isMiss) {
          stat.misses++;
          this.addToVault(item.a, item.b, false, true);
        }
        if (item.reactionMs) {
          stat.totalTime += item.reactionMs;
          if (item.reactionMs > 1500) {
            this.addToVault(item.a, item.b, false, false);
          }
        }
      }
    }

    this.saveData();
    return { isNewHigh, currentHigh: Math.max(currentHigh, score) };
  }

  getHighScore(mode) {
    return this.data.highScores[mode] || 0;
  }
}
