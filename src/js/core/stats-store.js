/**
 * Stats Store: Handles persistence of high scores, round histories, and weak-spot analytics.
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
      return raw ? JSON.parse(raw) : { highScores: {}, history: [], problemStats: {} };
    } catch {
      return { highScores: {}, history: [], problemStats: {} };
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
      targetSize: 'medium', // small, medium, large
      crosshair: 'cross', // cross, dot, circle, system
      multipliers: [2, 3, 4, 5, 6, 7, 8, 9],
      mode: 'gridshot_60', // gridshot_60, blitz_30, survival, practice
      hardcore12: false
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

  recordRound(summary) {
    const { mode, score, hits, misses, accuracy, avgReactionMs, maxStreak, weakProblems } = summary;

    // Update high score
    const currentHigh = this.data.highScores[mode] || 0;
    const isNewHigh = score > currentHigh;
    if (isNewHigh) {
      this.data.highScores[mode] = score;
    }

    // Record session history
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
    if (this.data.history.length > 50) {
      this.data.history.pop();
    }

    // Update problem stats
    if (Array.isArray(weakProblems)) {
      for (const item of weakProblems) {
        const key = `${item.a}x${item.b}`;
        if (!this.data.problemStats[key]) {
          this.data.problemStats[key] = { a: item.a, b: item.b, misses: 0, totalTime: 0, attempts: 0 };
        }
        const stat = this.data.problemStats[key];
        stat.attempts++;
        if (item.isMiss) stat.misses++;
        if (item.reactionMs) stat.totalTime += item.reactionMs;
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

    // Sort by most missed, then slowest average reaction
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
