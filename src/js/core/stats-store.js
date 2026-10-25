/**
 * Stats Store: Handles persistence of high scores, round histories, and weak-spot analytics.
 * Includes a persistent Hard Problems Vault (База сложных примеров).
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
        hardVault: parsed?.hardVault || {} // Key: "7x8" => { a, b, answer, misses, addedAt, manual }
      };
    } catch {
      return { highScores: {}, history: [], problemStats: {}, hardVault: {} };
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
          // Automatically register missed problems into the Hard Vault
          this.addToVault(item.a, item.b, false, true);
        }
        if (item.reactionMs) {
          stat.totalTime += item.reactionMs;
          if (item.reactionMs > 1500) {
            // Also flag as hard if took more than 1.5s
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

  getTopWeakProblems(limit = 6) {
    const list = Object.values(this.data.problemStats);
    if (list.length === 0) return [];

    list.sort((x, y) => {
      const xMissRate = x.misses / Math.max(1, x.attempts);
      const yMissRate = y.misses / Math.max(1, y.attempts);
      if (yMissRate !== xMissRate) return yMissRate - xMissRate;
      const xAvg = x.totalTime / Math.max(1, x.attempts);
      const yAvg = y.totalTime / Math.max(1, y.attempts);
      return yAvg - xAvg;
    });

    return list.slice(0, limit);
  }
}
