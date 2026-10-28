(() => {
  // src/js/core/math-engine.js
  var MathEngine = class {
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
        const vaultList = this.statsStore ? this.statsStore.getVaultList() : [];
        const filteredVault = vaultList.filter((p) => this.allowedMultipliers.includes(p.a) || this.allowedMultipliers.includes(p.b));
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
        equation: `${a} \xD7 ${b}`,
        answer,
        distractors,
        allOptions: this.shuffle([answer, ...distractors])
      };
    }
    isRecent(a, b) {
      return this.recentProblems.some((p) => p.a === a && p.b === b || p.a === b && p.b === a);
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
      const pool = /* @__PURE__ */ new Set();
      if (b > 1) pool.add(a * (b - 1));
      pool.add(a * (b + 1));
      if (a > 1) pool.add((a - 1) * b);
      pool.add((a + 1) * b);
      pool.add(answer + 2);
      if (answer > 2) pool.add(answer - 2);
      if (answer > 10) pool.add(answer - 10);
      pool.add(answer + 10);
      const trapPairs = [
        [54, 56],
        [42, 48],
        [63, 64],
        [36, 42],
        [24, 28],
        [72, 81],
        [45, 54]
      ];
      for (const [p1, p2] of trapPairs) {
        if (answer === p1) pool.add(p2);
        if (answer === p2) pool.add(p1);
      }
      pool.delete(answer);
      const valid = Array.from(pool).filter((n) => n > 1 && n <= 144);
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
  };

  // src/js/core/sound-engine.js
  var SoundEngine = class {
    constructor() {
      this.ctx = null;
      this.volume = 0.5;
      this.muted = false;
    }
    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
        }
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    }
    setVolume(vol) {
      this.volume = Math.max(0, Math.min(1, vol));
    }
    setMuted(muted) {
      this.muted = Boolean(muted);
    }
    /**
     * Crisp target hit sound with pitch scaling based on combo streak.
     */
    playHit(combo = 1) {
      if (this.muted || this.volume <= 0) return;
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const pitchOffset = Math.min(15, combo) * 35;
        const baseFreq = 520 + pitchOffset;
        osc.type = "sine";
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.08);
        gain.gain.setValueAtTime(this.volume * 0.45, now);
        gain.gain.exponentialRampToValueAtTime(1e-3, now + 0.12);
        const clickOsc = this.ctx.createOscillator();
        const clickGain = this.ctx.createGain();
        clickOsc.type = "triangle";
        clickOsc.frequency.setValueAtTime(1400, now);
        clickGain.gain.setValueAtTime(this.volume * 0.25, now);
        clickGain.gain.exponentialRampToValueAtTime(1e-3, now + 0.03);
        clickOsc.connect(clickGain);
        clickGain.connect(this.ctx.destination);
        clickOsc.start(now);
        clickOsc.stop(now + 0.03);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } catch (e) {
        console.warn("Audio playHit error:", e);
      }
    }
    /**
     * Ultra-fast flick bonus sound (high harmonic chime).
     */
    playCrit() {
      if (this.muted || this.volume <= 0) return;
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
        gain.gain.setValueAtTime(this.volume * 0.35, now);
        gain.gain.exponentialRampToValueAtTime(1e-3, now + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } catch (e) {
        console.warn("Audio playCrit error:", e);
      }
    }
    /**
     * Miss sound: low dull thud.
     */
    playMiss() {
      if (this.muted || this.volume <= 0) return;
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
        gain.gain.setValueAtTime(this.volume * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(1e-3, now + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } catch (e) {
        console.warn("Audio playMiss error:", e);
      }
    }
    /**
     * Countdown ticks (3, 2, 1) and GO chime.
     */
    playCountdown(isGo = false) {
      if (this.muted || this.volume <= 0) return;
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        if (isGo) {
          osc.type = "triangle";
          osc.frequency.setValueAtTime(784, now);
          gain.gain.setValueAtTime(this.volume * 0.5, now);
          gain.gain.exponentialRampToValueAtTime(1e-3, now + 0.35);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.35);
        } else {
          osc.type = "sine";
          osc.frequency.setValueAtTime(440, now);
          gain.gain.setValueAtTime(this.volume * 0.35, now);
          gain.gain.exponentialRampToValueAtTime(1e-3, now + 0.12);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.12);
        }
      } catch (e) {
        console.warn("Audio playCountdown error:", e);
      }
    }
    /**
     * Game complete finish sound.
     */
    playGameOver() {
      if (this.muted || this.volume <= 0) return;
      try {
        this.init();
        if (!this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.5];
        const now = this.ctx.currentTime;
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const startTime = now + idx * 0.08;
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(this.volume * 0.28, startTime);
          gain.gain.exponentialRampToValueAtTime(1e-3, startTime + 0.3);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.3);
        });
      } catch (e) {
        console.warn("Audio playGameOver error:", e);
      }
    }
  };

  // src/js/core/particle-fx.js
  var ParticleFX = class {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas ? canvas.getContext("2d") : null;
      this.particles = [];
      this.floatingTexts = [];
      this.shockwaves = [];
      this.running = false;
      this.animating = false;
      this.resize();
      window.addEventListener("resize", () => this.resize(), { passive: true });
    }
    resize() {
      if (!this.canvas) return;
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }
    start() {
      this.running = true;
    }
    stop() {
      this.running = false;
      this.animating = false;
      this.particles = [];
      this.floatingTexts = [];
      this.shockwaves = [];
      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
    requestLoop() {
      if (!this.running || this.animating) return;
      this.animating = true;
      requestAnimationFrame(() => this.loop());
    }
    spawnHitSparks(x, y, color = "#38bdf8", count = 14) {
      for (let i = 0; i < count; i++) {
        const angle = Math.PI * 2 * i / count + (Math.random() - 0.5) * 0.4;
        const speed = Math.random() * 4 + 2;
        this.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 2.5 + 1.5,
          alpha: 1,
          decay: Math.random() * 0.04 + 0.03,
          color
        });
      }
      this.shockwaves.push({
        x,
        y,
        radius: 10,
        maxRadius: 48,
        alpha: 0.75,
        color
      });
      this.requestLoop();
    }
    spawnFloatingText(text, x, y, color = "#ffffff", isCrit = false) {
      this.floatingTexts.push({
        text,
        x: x + (Math.random() - 0.5) * 16,
        y: y - 10,
        alpha: 1,
        vy: -1.6,
        size: isCrit ? 20 : 15,
        weight: isCrit ? "bold" : "600",
        color
      });
      this.requestLoop();
    }
    loop() {
      if (!this.running) {
        this.animating = false;
        return;
      }
      this.update();
      this.render();
      const hasActiveFx = this.particles.length > 0 || this.shockwaves.length > 0 || this.floatingTexts.length > 0;
      if (hasActiveFx) {
        requestAnimationFrame(() => this.loop());
      } else {
        this.animating = false;
        if (this.ctx && this.canvas) {
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
      }
    }
    update() {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.93;
        p.vy *= 0.93;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
        }
      }
      for (let i = this.shockwaves.length - 1; i >= 0; i--) {
        const sw = this.shockwaves[i];
        sw.radius += 2.6;
        sw.alpha = 1 - sw.radius / sw.maxRadius;
        if (sw.radius >= sw.maxRadius || sw.alpha <= 0) {
          this.shockwaves.splice(i, 1);
        }
      }
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.y += ft.vy;
        ft.alpha -= 0.025;
        if (ft.alpha <= 0) {
          this.floatingTexts.splice(i, 1);
        }
      }
    }
    render() {
      if (!this.ctx || !this.canvas) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      for (const sw of this.shockwaves) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = sw.color;
        this.ctx.globalAlpha = Math.max(0, sw.alpha);
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.restore();
      }
      for (const p of this.particles) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = Math.max(0, p.alpha);
        this.ctx.fill();
        this.ctx.restore();
      }
      for (const ft of this.floatingTexts) {
        this.ctx.save();
        this.ctx.font = `${ft.weight} ${ft.size}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        this.ctx.fillStyle = ft.color;
        this.ctx.textAlign = "center";
        this.ctx.globalAlpha = Math.max(0, ft.alpha);
        this.ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
        this.ctx.shadowBlur = 3;
        this.ctx.fillText(ft.text, ft.x, ft.y);
        this.ctx.restore();
      }
    }
  };

  // src/js/core/stats-store.js
  var STORAGE_KEY = "math_aim_trainer_stats_v1";
  var SETTINGS_KEY = "math_aim_trainer_settings_v1";
  var StatsStore = class {
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
          mastery: parsed?.mastery || {},
          // key: "min x max" => { score: 0..100, attempts, fastHits }
          drillBests: parsed?.drillBests || {}
          // key: "drill_2", "drill_all" => best seconds
        };
      } catch {
        return { highScores: {}, history: [], problemStats: {}, hardVault: {}, mastery: {}, drillBests: {} };
      }
    }
    saveData() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (e) {
        console.warn("Failed to save stats to localStorage", e);
      }
    }
    loadSettings() {
      const defaults = {
        volume: 0.6,
        muted: false,
        targetSize: "medium",
        crosshair: "cross",
        multipliers: [2, 3, 4, 5, 6, 7, 8, 9],
        mode: "gridshot_60"
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
        console.warn("Failed to save settings", e);
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
          addedAt: (/* @__PURE__ */ new Date()).toISOString()
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
        return { score: 0, status: "unseen", attempts: 0, fastHits: 0 };
      }
      if (this.isInVault(a, b) || item.score < 40) {
        return { score: item.score, status: "weak", attempts: item.attempts, fastHits: item.fastHits };
      }
      if (item.score >= 80) {
        return { score: item.score, status: "mastered", attempts: item.attempts, fastHits: item.fastHits };
      }
      return { score: item.score, status: "learning", attempts: item.attempts, fastHits: item.fastHits };
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
          if (info.status === "mastered") masteredCount++;
          else if (info.status === "learning") learningCount++;
          else if (info.status === "weak") weakCount++;
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
        date: (/* @__PURE__ */ new Date()).toISOString(),
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
      let isNewDrillBest = false;
      let prevDrillBest = null;
      const drillKey = summary.drillId || "drill_all";
      if (summary.isDrillWin && summary.elapsedSec) {
        if (!this.data.drillBests) this.data.drillBests = {};
        prevDrillBest = this.data.drillBests[drillKey] || null;
        if (!prevDrillBest || summary.elapsedSec < prevDrillBest) {
          this.data.drillBests[drillKey] = summary.elapsedSec;
          isNewDrillBest = true;
        }
      }
      this.saveData();
      return {
        isNewHigh,
        currentHigh: Math.max(currentHigh, score),
        isNewDrillBest,
        prevDrillBest,
        currentDrillBest: this.data.drillBests?.[drillKey] || summary.elapsedSec
      };
    }
    getDrillBest(drillId) {
      if (!this.data.drillBests) this.data.drillBests = {};
      return this.data.drillBests[drillId] || null;
    }
    getHighScore(mode) {
      return this.data.highScores[mode] || 0;
    }
  };

  // src/js/game/target-manager.js
  var TargetManager = class {
    constructor(arenaElement, onTargetClick) {
      this.arena = arenaElement;
      this.onTargetClick = onTargetClick;
      this.targets = [];
      this.targetSize = 84;
      this.sizeKey = "medium";
    }
    setSize(sizeKey) {
      this.sizeKey = sizeKey;
      switch (sizeKey) {
        case "small":
          this.targetSize = 68;
          break;
        case "large":
          this.targetSize = 102;
          break;
        case "medium":
        default:
          this.targetSize = 84;
          break;
      }
    }
    clear() {
      for (const t of this.targets) {
        if (t.element && t.element.parentElement) {
          t.element.remove();
        }
      }
      this.targets = [];
    }
    /**
     * Spawns targets with adaptive clustering.
     * @param {Array<number>} values List of numbers to display on targets
     * @param {number} correctAnswer The single correct answer
     */
    spawnTargets(values, correctAnswer) {
      this.clear();
      const positions = this.calculateClusteredPositions(values.length);
      values.forEach((val, idx) => {
        const pos = positions[idx];
        const isCorrect = val === correctAnswer;
        const el = document.createElement("div");
        el.className = `math-target size-${this.sizeKey}`;
        el.style.width = `${this.targetSize}px`;
        el.style.height = `${this.targetSize}px`;
        el.style.left = `${pos.x}px`;
        el.style.top = `${pos.y}px`;
        el.innerHTML = `<span class="target-val">${val}</span>`;
        el.addEventListener("mousedown", (e) => {
          e.stopPropagation();
          const rect = el.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          this.onTargetClick({
            value: val,
            isCorrect,
            x: centerX,
            y: centerY,
            targetEl: el
          });
        });
        this.arena.appendChild(el);
        this.targets.push({ element: el, value: val, isCorrect, x: pos.x, y: pos.y });
      });
    }
    /**
     * Calculates target positions within a clustered zone.
     * Fewer targets => tighter spread around a localized focal point.
     */
    calculateClusteredPositions(count) {
      const rect = this.arena.getBoundingClientRect();
      const arenaW = rect.width || 1200;
      const arenaH = rect.height || 700;
      let spreadScale = 0.38;
      if (count === 3) spreadScale = 0.52;
      else if (count >= 4) spreadScale = 0.68;
      const clusterW = Math.max(this.targetSize * 2.5, arenaW * spreadScale);
      const clusterH = Math.max(this.targetSize * 2.5, arenaH * spreadScale);
      const marginX = this.targetSize + 30;
      const marginY = this.targetSize + 30;
      const maxCenterX = arenaW - marginX - clusterW / 2;
      const minCenterX = marginX + clusterW / 2;
      const maxCenterY = arenaH - marginY - clusterH / 2;
      const minCenterY = marginY + clusterH / 2;
      const centerX = Math.random() * Math.max(20, maxCenterX - minCenterX) + minCenterX;
      const centerY = Math.random() * Math.max(20, maxCenterY - minCenterY) + minCenterY;
      const minX = Math.max(marginX, centerX - clusterW / 2);
      const maxX = Math.min(arenaW - this.targetSize - marginX, centerX + clusterW / 2 - this.targetSize);
      const minY = Math.max(marginY, centerY - clusterH / 2);
      const maxY = Math.min(arenaH - this.targetSize - marginY, centerY + clusterH / 2 - this.targetSize);
      const positions = [];
      const minDistance = this.targetSize * 1.18;
      for (let i = 0; i < count; i++) {
        let bestPos = { x: minX, y: minY };
        let found = false;
        for (let attempt = 0; attempt < 80; attempt++) {
          const candidate = {
            x: Math.floor(Math.random() * Math.max(1, maxX - minX)) + minX,
            y: Math.floor(Math.random() * Math.max(1, maxY - minY)) + minY
          };
          const hasOverlap = positions.some((p) => {
            const dx = candidate.x + this.targetSize / 2 - (p.x + this.targetSize / 2);
            const dy = candidate.y + this.targetSize / 2 - (p.y + this.targetSize / 2);
            return Math.hypot(dx, dy) < minDistance;
          });
          if (!hasOverlap) {
            bestPos = candidate;
            found = true;
            break;
          }
        }
        if (!found) {
          const angle = Math.PI * 2 * i / count;
          const radius = this.targetSize * 1.15;
          bestPos = {
            x: Math.min(maxX, Math.max(minX, centerX + Math.cos(angle) * radius - this.targetSize / 2)),
            y: Math.min(maxY, Math.max(minY, centerY + Math.sin(angle) * radius - this.targetSize / 2))
          };
        }
        positions.push(bestPos);
      }
      return positions;
    }
  };

  // src/js/game/game-controller.js
  var GameController = class {
    constructor({ mathEngine, soundEngine, particleFx, statsStore, targetManager, hudView, crosshair }) {
      this.math = mathEngine;
      this.sound = soundEngine;
      this.fx = particleFx;
      this.stats = statsStore;
      this.targets = targetManager;
      this.hud = hudView;
      this.crosshair = crosshair;
      if (this.math && this.stats) {
        this.math.setStatsStore(this.stats);
      }
      this.state = "IDLE";
      this.mode = "gridshot_60";
      this.score = 0;
      this.combo = 0;
      this.maxCombo = 0;
      this.hits = 0;
      this.misses = 0;
      this.reactionTimes = [];
      this.weakProblems = [];
      this.roundStartTime = performance.now();
      this.currentProblem = null;
      this.problemStartTime = 0;
      this.roundTimeRemaining = 60;
      this.roundTimer = null;
      this.countdownTimer = null;
      this.drillStopwatchTimer = null;
      this.drillId = null;
      this.drillQueue = [];
      this.initialDrillCount = 0;
      this.onGameOverCallback = null;
    }
    setMode(mode) {
      this.mode = mode;
    }
    startCountdown(onComplete) {
      this.state = "COUNTDOWN";
      this.hud.showCountdown(3);
      this.sound.playCountdown(false);
      let count = 3;
      if (this.countdownTimer) clearInterval(this.countdownTimer);
      this.countdownTimer = setInterval(() => {
        count--;
        if (count > 0) {
          this.hud.showCountdown(count);
          this.sound.playCountdown(false);
        } else if (count === 0) {
          this.hud.showCountdown("GO!");
          this.sound.playCountdown(true);
        } else {
          clearInterval(this.countdownTimer);
          this.hud.hideCountdown();
          this.startRound();
          if (onComplete) onComplete();
        }
      }, 850);
    }
    startRound(overrideProblems = null, drillId = null) {
      this.state = "PLAYING";
      this.score = 0;
      this.combo = 0;
      this.maxCombo = 0;
      this.hits = 0;
      this.misses = 0;
      this.reactionTimes = [];
      this.weakProblems = [];
      this.roundStartTime = performance.now();
      if (overrideProblems !== null) {
        this.overridePool = overrideProblems;
      }
      if (drillId !== null) {
        this.drillId = drillId;
      } else if (this.mode === "drill" && !this.drillId) {
        this.drillId = "drill_all";
      }
      if (this.drillStopwatchTimer) {
        clearInterval(this.drillStopwatchTimer);
        this.drillStopwatchTimer = null;
      }
      if (this.mode === "drill") {
        this.drillQueue = Array.isArray(this.overridePool) ? [...this.overridePool] : [];
        this.initialDrillCount = this.drillQueue.length;
        this.roundTimeRemaining = Infinity;
        this.hud.updateDrillProgress(this.drillQueue.length, this.initialDrillCount);
        this.hud.updateDrillLiveTimer(0);
        this.drillStopwatchTimer = setInterval(() => {
          if (this.state !== "PLAYING") return;
          const elapsed = (performance.now() - this.roundStartTime) / 1e3;
          this.hud.updateDrillLiveTimer(elapsed);
        }, 100);
      } else {
        this.hud.resetScoreLabel();
        if (this.mode === "blitz_30") {
          this.roundTimeRemaining = 30;
          this.hud.updateTime(30);
        } else if (this.mode === "practice") {
          this.roundTimeRemaining = Infinity;
          this.hud.updateTime(Infinity);
        } else {
          this.roundTimeRemaining = 60;
          this.hud.updateTime(60);
        }
      }
      this.hud.updateScore(0);
      this.hud.updateCombo(0);
      this.hud.updateAccuracy(100);
      this.fx.start();
      this.nextProblem();
      if (this.roundTimeRemaining !== Infinity) {
        if (this.roundTimer) clearInterval(this.roundTimer);
        const startMs = Date.now();
        const totalSec = this.roundTimeRemaining;
        this.roundTimer = setInterval(() => {
          const elapsed = (Date.now() - startMs) / 1e3;
          const left = Math.max(0, Math.ceil(totalSec - elapsed));
          this.roundTimeRemaining = left;
          this.hud.updateTime(left);
          if (left <= 0) {
            this.endRound(false);
          }
        }, 250);
      }
    }
    nextProblem() {
      const distractorCount = Math.floor(Math.random() * 3) + 1;
      if (this.mode === "drill" && this.drillQueue.length > 0) {
        const target = this.drillQueue[0];
        this.currentProblem = this.math.generateProblem(distractorCount, [target]);
      } else {
        this.currentProblem = this.math.generateProblem(distractorCount, this.overridePool);
      }
      this.problemStartTime = performance.now();
      this.hud.updateEquation(this.currentProblem.equation);
      this.targets.spawnTargets(this.currentProblem.allOptions, this.currentProblem.answer);
    }
    handleMissClick(arenaX, arenaY) {
      if (this.state !== "PLAYING") return;
      this.misses++;
      this.combo = 0;
      this.hud.updateCombo(0);
      this.hud.updateAccuracy(this.calcAccuracy());
      this.sound.playMiss();
      this.crosshair.triggerRecoil();
      this.crosshair.showHitmarker(false, arenaX, arenaY);
      if (arenaX !== void 0 && arenaY !== void 0) {
        this.fx.spawnFloatingText("MISS", arenaX, arenaY, "#f43f5e", false);
      }
      if (this.currentProblem) {
        this.weakProblems.push({
          a: this.currentProblem.a,
          b: this.currentProblem.b,
          isMiss: true,
          reactionMs: null
        });
        this.stats.recordAnswer(this.currentProblem.a, this.currentProblem.b, false, 2e3);
        if (this.mode === "drill" && this.drillQueue.length > 1) {
          const item = this.drillQueue.shift();
          this.drillQueue.push(item);
        }
      }
    }
    handleTargetClick({ value, isCorrect, x, y, targetEl }) {
      if (this.state !== "PLAYING") return;
      const reactionMs = Math.round(performance.now() - this.problemStartTime);
      this.crosshair.triggerRecoil();
      if (isCorrect) {
        this.hits++;
        this.combo++;
        if (this.combo > this.maxCombo) {
          this.maxCombo = this.combo;
        }
        this.reactionTimes.push(reactionMs);
        this.stats.recordAnswer(this.currentProblem.a, this.currentProblem.b, true, reactionMs);
        const isFastFlick = reactionMs < 400;
        const isUltraFlick = reactionMs < 280;
        let addedScore = 100 + Math.min(10, this.combo) * 25;
        if (isUltraFlick) addedScore += 100;
        else if (isFastFlick) addedScore += 50;
        this.score += addedScore;
        if (isUltraFlick) {
          this.sound.playCrit();
          this.fx.spawnFloatingText(`CRIT! +${addedScore}`, x, y, "#38bdf8", true);
        } else {
          this.sound.playHit(this.combo);
          this.fx.spawnFloatingText(`+${addedScore}`, x, y, "#4ade80", false);
        }
        this.crosshair.showHitmarker(true, x, y);
        this.fx.spawnHitSparks(x, y, isUltraFlick ? "#38bdf8" : "#22c55e", 16);
        if (this.mode === "drill") {
          if (reactionMs <= 1200) {
            const idx = this.drillQueue.findIndex(
              (p) => p.a === this.currentProblem.a && p.b === this.currentProblem.b || p.a === this.currentProblem.b && p.b === this.currentProblem.a
            );
            if (idx !== -1) {
              this.drillQueue.splice(idx, 1);
            }
            this.hud.updateDrillProgress(this.drillQueue.length, this.initialDrillCount);
            this.fx.spawnFloatingText(`\u0412\u042B\u0423\u0427\u0415\u041D\u041E! (${this.drillQueue.length} \u043E\u0441\u0442.)`, x, y - 20, "#22c55e", true);
            if (this.drillQueue.length === 0) {
              setTimeout(() => this.endRound(true), 400);
              return;
            }
          } else {
            if (this.drillQueue.length > 1) {
              const item = this.drillQueue.shift();
              this.drillQueue.push(item);
            }
            this.fx.spawnFloatingText("\u041C\u0415\u0414\u041B\u0415\u041D\u041D\u041E (\u041F\u041E\u0412\u0422\u041E\u0420\u0418\u041C)", x, y - 20, "#f59e0b", false);
          }
        }
        if (reactionMs > 1600 && this.currentProblem) {
          this.weakProblems.push({
            a: this.currentProblem.a,
            b: this.currentProblem.b,
            isMiss: false,
            reactionMs
          });
        }
        this.hud.updateScore(this.score);
        this.hud.updateCombo(this.combo);
        this.hud.updateAccuracy(this.calcAccuracy());
        this.nextProblem();
      } else {
        this.misses++;
        this.combo = 0;
        this.hud.updateCombo(0);
        this.hud.updateAccuracy(this.calcAccuracy());
        this.stats.recordAnswer(this.currentProblem.a, this.currentProblem.b, false, reactionMs);
        this.sound.playMiss();
        this.crosshair.showHitmarker(false, x, y);
        this.fx.spawnFloatingText("\u2715 WRONG", x, y, "#ef4444", true);
        this.fx.spawnHitSparks(x, y, "#ef4444", 12);
        targetEl.classList.add("error-shake");
        setTimeout(() => targetEl.classList.remove("error-shake"), 300);
        if (this.currentProblem) {
          this.weakProblems.push({
            a: this.currentProblem.a,
            b: this.currentProblem.b,
            isMiss: true,
            reactionMs
          });
          if (this.mode === "drill" && this.drillQueue.length > 1) {
            const item = this.drillQueue.shift();
            this.drillQueue.push(item);
          }
        }
      }
    }
    calcAccuracy() {
      const total = this.hits + this.misses;
      if (total === 0) return 100;
      return Math.round(this.hits / total * 100);
    }
    endRound(isDrillWin = false) {
      this.state = "RESULTS";
      if (this.roundTimer) clearInterval(this.roundTimer);
      if (this.drillStopwatchTimer) {
        clearInterval(this.drillStopwatchTimer);
        this.drillStopwatchTimer = null;
      }
      this.targets.clear();
      this.sound.playGameOver();
      const avgReaction = this.reactionTimes.length > 0 ? Math.round(this.reactionTimes.reduce((acc, v) => acc + v, 0) / this.reactionTimes.length) : 0;
      const summary = {
        mode: this.mode,
        drillId: this.drillId || (this.mode === "drill" ? "drill_all" : null),
        score: this.score,
        hits: this.hits,
        misses: this.misses,
        accuracy: this.calcAccuracy(),
        avgReactionMs: avgReaction,
        maxStreak: this.maxCombo,
        weakProblems: this.weakProblems,
        isDrillWin,
        initialDrillCount: this.initialDrillCount,
        elapsedSec: this.roundStartTime ? parseFloat(((performance.now() - this.roundStartTime) / 1e3).toFixed(1)) : null
      };
      const recordResult = this.stats.recordRound(summary);
      summary.isNewHigh = recordResult.isNewHigh;
      summary.currentHigh = recordResult.currentHigh;
      summary.isNewDrillBest = recordResult.isNewDrillBest;
      summary.prevDrillBest = recordResult.prevDrillBest;
      summary.currentDrillBest = recordResult.currentDrillBest;
      if (this.onGameOverCallback) {
        this.onGameOverCallback(summary);
      }
    }
    stop() {
      if (this.roundTimer) clearInterval(this.roundTimer);
      if (this.countdownTimer) clearInterval(this.countdownTimer);
      if (this.drillStopwatchTimer) {
        clearInterval(this.drillStopwatchTimer);
        this.drillStopwatchTimer = null;
      }
      this.targets.clear();
      this.fx.stop();
      this.state = "IDLE";
    }
  };

  // src/js/ui/hud-view.js
  var HudView = class {
    constructor() {
      this.equationEl = document.getElementById("hud-equation");
      this.timerEl = document.getElementById("hud-timer");
      this.scoreEl = document.getElementById("hud-score");
      this.comboEl = document.getElementById("hud-combo");
      this.accuracyEl = document.getElementById("hud-accuracy");
      this.countdownEl = document.getElementById("countdown-overlay");
      this.countdownTextEl = document.getElementById("countdown-text");
    }
    updateEquation(eqText) {
      if (this.equationEl) {
        this.equationEl.textContent = eqText;
        this.equationEl.classList.remove("eq-bump");
        void this.equationEl.offsetWidth;
        this.equationEl.classList.add("eq-bump");
      }
    }
    updateTime(secondsLeft) {
      this.resetTimerLabel();
      if (!this.timerEl) return;
      if (secondsLeft === Infinity) {
        this.timerEl.textContent = "\u221E";
        this.timerEl.classList.remove("timer-warning");
        return;
      }
      const mins = Math.floor(secondsLeft / 60);
      const secs = secondsLeft % 60;
      this.timerEl.textContent = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
      if (secondsLeft <= 10 && secondsLeft > 0) {
        this.timerEl.classList.add("timer-warning");
      } else {
        this.timerEl.classList.remove("timer-warning");
      }
    }
    updateDrillProgress(remaining, total) {
      if (!this.timerEl) return;
      this.timerEl.textContent = `${remaining} / ${total}`;
      this.timerEl.classList.remove("timer-warning");
      const badge = this.timerEl.closest(".hud-badge");
      if (badge) {
        const label = badge.querySelector(".hud-badge-label");
        if (label) label.textContent = "\u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C";
      }
    }
    resetTimerLabel() {
      if (!this.timerEl) return;
      const badge = this.timerEl.closest(".hud-badge");
      if (badge) {
        const label = badge.querySelector(".hud-badge-label");
        if (label) label.textContent = "\u0412\u0440\u0435\u043C\u044F";
      }
    }
    updateDrillLiveTimer(elapsedSeconds) {
      if (!this.scoreEl) return;
      const badge = this.scoreEl.closest(".hud-badge");
      if (badge) {
        const label = badge.querySelector(".hud-badge-label");
        if (label) label.textContent = "\u0422\u0430\u0439\u043C\u0435\u0440";
      }
      this.scoreEl.textContent = `${elapsedSeconds.toFixed(1)} \u0441`;
    }
    resetScoreLabel() {
      if (!this.scoreEl) return;
      const badge = this.scoreEl.closest(".hud-badge");
      if (badge) {
        const label = badge.querySelector(".hud-badge-label");
        if (label) label.textContent = "\u041E\u0447\u043A\u0438";
      }
    }
    updateScore(score) {
      if (this.scoreEl) {
        this.scoreEl.textContent = Number(score).toLocaleString();
      }
    }
    updateCombo(streak) {
      if (!this.comboEl) return;
      if (streak > 1) {
        this.comboEl.textContent = `${streak}x \u0421\u0415\u0420\u0418\u042F`;
        this.comboEl.classList.add("active");
        if (streak >= 5) {
          this.comboEl.classList.add("on-fire");
        } else {
          this.comboEl.classList.remove("on-fire");
        }
      } else {
        this.comboEl.textContent = "";
        this.comboEl.classList.remove("active", "on-fire");
      }
    }
    updateAccuracy(accPercent) {
      if (this.accuracyEl) {
        this.accuracyEl.textContent = `${accPercent}%`;
      }
    }
    showCountdown(value) {
      if (this.countdownEl && this.countdownTextEl) {
        this.countdownTextEl.textContent = value;
        this.countdownEl.classList.add("visible");
        this.countdownTextEl.classList.remove("pulse");
        void this.countdownTextEl.offsetWidth;
        this.countdownTextEl.classList.add("pulse");
      }
    }
    hideCountdown() {
      if (this.countdownEl) {
        this.countdownEl.classList.remove("visible");
      }
    }
  };

  // src/js/ui/crosshair.js
  var CrosshairController = class {
    constructor(arenaElement) {
      this.arena = arenaElement;
      this.style = "cross";
      this.hitmarkerPool = [];
      this.build();
    }
    build() {
      this.setStyle(this.style);
    }
    setStyle(styleName) {
      this.style = styleName || "cross";
      if (!this.arena) return;
      this.arena.classList.remove("cursor-cross", "cursor-dot", "cursor-circle", "cursor-system");
      this.arena.classList.add(`cursor-${this.style}`);
    }
    updateArenaRect() {
    }
    triggerRecoil() {
    }
    showHitmarker(isHit = true, clientX = null, clientY = null) {
      if (!this.arena) return;
      const hm = document.createElement("div");
      hm.className = `impact-hitmarker ${isHit ? "hit-success" : "hit-fail"}`;
      hm.innerHTML = `
      <svg viewBox="0 0 24 24" class="hm-svg">
        <line x1="5" y1="5" x2="9" y2="9" />
        <line x1="19" y1="5" x2="15" y2="9" />
        <line x1="5" y1="19" x2="9" y2="15" />
        <line x1="19" y1="19" x2="15" y2="15" />
      </svg>
    `;
      if (clientX !== null && clientY !== null) {
        const rect = this.arena.getBoundingClientRect();
        hm.style.left = `${clientX - rect.left}px`;
        hm.style.top = `${clientY - rect.top}px`;
      } else {
        hm.style.left = "50%";
        hm.style.top = "50%";
      }
      this.arena.appendChild(hm);
      setTimeout(() => hm.remove(), 160);
    }
  };

  // src/js/ui/results-view.js
  var ResultsView = class {
    constructor({ onPlayAgain, onTrainMistakes, onReturnMenu, onStartCompetition }) {
      this.modalEl = document.getElementById("results-modal");
      this.rankEl = document.getElementById("res-rank");
      this.rankLabelEl = document.getElementById("res-rank-label");
      this.scoreEl = document.getElementById("res-score");
      this.highScoreTagEl = document.getElementById("res-highscore-tag");
      this.accuracyEl = document.getElementById("res-accuracy");
      this.hitsEl = document.getElementById("res-hits");
      this.reactionEl = document.getElementById("res-reaction");
      this.kpsEl = document.getElementById("res-kps");
      this.streakEl = document.getElementById("res-streak");
      this.weakListEl = document.getElementById("res-weak-list");
      this.pbEl = document.getElementById("res-pb");
      this.pbLabelEl = document.getElementById("res-pb-label");
      this.trainMistakesBtn = document.getElementById("btn-train-mistakes");
      this.playAgainBtn = document.getElementById("btn-play-again");
      this.goCompetitionBtn = document.getElementById("btn-go-competition");
      this.returnMenuBtn = document.getElementById("btn-return-menu");
      this.onPlayAgain = onPlayAgain;
      this.onTrainMistakes = onTrainMistakes;
      this.onReturnMenu = onReturnMenu;
      this.onStartCompetition = onStartCompetition;
      this.lastSummary = null;
      this.bindEvents();
    }
    bindEvents() {
      if (this.playAgainBtn) {
        this.playAgainBtn.addEventListener("click", () => {
          this.hide();
          if (this.onPlayAgain) this.onPlayAgain();
        });
      }
      if (this.goCompetitionBtn) {
        this.goCompetitionBtn.addEventListener("click", () => {
          this.hide();
          if (this.onStartCompetition) this.onStartCompetition();
        });
      }
      if (this.trainMistakesBtn) {
        this.trainMistakesBtn.addEventListener("click", () => {
          this.hide();
          if (this.onTrainMistakes) this.onTrainMistakes(this.lastMistakes);
        });
      }
      if (this.returnMenuBtn) {
        this.returnMenuBtn.addEventListener("click", () => {
          this.hide();
          if (this.onReturnMenu) this.onReturnMenu();
        });
      }
    }
    show(summary) {
      this.lastSummary = summary;
      const {
        score,
        hits,
        misses,
        accuracy,
        avgReactionMs,
        maxStreak,
        isNewHigh,
        currentHigh,
        weakProblems,
        mode,
        isDrillWin,
        initialDrillCount,
        elapsedSec,
        isNewDrillBest,
        prevDrillBest,
        currentDrillBest
      } = summary;
      const kpsLabel = this.kpsEl?.previousElementSibling;
      if (isDrillWin) {
        const drillRank = this.calculateDrillRank(elapsedSec, accuracy, initialDrillCount);
        if (this.rankEl) {
          this.rankEl.textContent = drillRank.rank;
          this.rankEl.className = `res-rank-badge ${drillRank.css}`;
        }
        if (this.rankLabelEl) {
          this.rankLabelEl.textContent = `${drillRank.title} (\u0412\u0441\u0435 ${initialDrillCount} \u0432\u044B\u0443\u0447\u0435\u043D\u044B)`;
        }
        if (this.scoreEl) {
          this.scoreEl.textContent = `${elapsedSec} \u0441`;
        }
        if (this.highScoreTagEl) {
          if (isNewDrillBest) {
            this.highScoreTagEl.className = "res-tag-record";
            this.highScoreTagEl.innerHTML = `
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            <span>\u041D\u043E\u0432\u044B\u0439 \u0440\u0435\u043A\u043E\u0440\u0434!</span>
          `;
            this.highScoreTagEl.style.display = "inline-flex";
          } else if (prevDrillBest && elapsedSec > prevDrillBest) {
            const delta = (elapsedSec - prevDrillBest).toFixed(1);
            this.highScoreTagEl.className = "res-tag-delta";
            this.highScoreTagEl.innerHTML = `<span>+${delta} \u0441 \u0434\u043E \u0440\u0435\u043A\u043E\u0440\u0434\u0430</span>`;
            this.highScoreTagEl.style.display = "inline-flex";
          } else {
            this.highScoreTagEl.style.display = "none";
          }
        }
        if (kpsLabel) kpsLabel.textContent = "\u0412\u0440\u0435\u043C\u044F \u0437\u0430\u0431\u0435\u0433\u0430";
        if (this.kpsEl) this.kpsEl.textContent = `${elapsedSec} \u0441`;
        if (this.pbLabelEl) this.pbLabelEl.textContent = "\u041B\u0438\u0447\u043D\u044B\u0439 \u0440\u0435\u043A\u043E\u0440\u0434";
        const best = currentDrillBest || elapsedSec;
        if (this.pbEl) this.pbEl.textContent = best ? `${best} \u0441` : "\u2014";
        if (this.playAgainBtn) this.playAgainBtn.textContent = "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u0437\u0430\u0431\u0435\u0433 (\u041F\u0440\u043E\u0431\u0435\u043B)";
        if (this.goCompetitionBtn) this.goCompetitionBtn.style.display = "inline-flex";
      } else {
        const rankInfo = this.calculateRank(accuracy, avgReactionMs, hits);
        if (this.rankEl) {
          this.rankEl.textContent = rankInfo.rank;
          this.rankEl.className = `res-rank-badge rank-${rankInfo.rank.toLowerCase().replace("+", "-plus")}`;
        }
        if (this.rankLabelEl) {
          this.rankLabelEl.textContent = rankInfo.title;
        }
        if (this.scoreEl) {
          this.scoreEl.textContent = Number(score).toLocaleString();
        }
        if (this.highScoreTagEl) {
          if (isNewHigh) {
            this.highScoreTagEl.className = "res-tag-record";
            this.highScoreTagEl.innerHTML = `
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            <span>\u041D\u043E\u0432\u044B\u0439 \u0440\u0435\u043A\u043E\u0440\u0434!</span>
          `;
            this.highScoreTagEl.style.display = "inline-flex";
          } else {
            this.highScoreTagEl.style.display = "none";
          }
        }
        if (kpsLabel) kpsLabel.textContent = "\u0421\u043A\u043E\u0440\u043E\u0441\u0442\u044C";
        const roundSeconds = mode === "blitz_30" ? 30 : 60;
        const tpm = Math.round(hits / roundSeconds * 60);
        if (this.kpsEl) this.kpsEl.textContent = `${tpm} \u0432 \u043C\u0438\u043D`;
        if (this.pbLabelEl) this.pbLabelEl.textContent = "\u0420\u0435\u043A\u043E\u0440\u0434 \u0440\u0435\u0436\u0438\u043C\u0430";
        if (this.pbEl) this.pbEl.textContent = currentHigh > 0 ? Number(currentHigh).toLocaleString() : "\u2014";
        if (this.playAgainBtn) this.playAgainBtn.textContent = "\u0415\u0449\u0451 \u0440\u0430\u0437 (\u041F\u0440\u043E\u0431\u0435\u043B)";
        if (this.goCompetitionBtn) this.goCompetitionBtn.style.display = "none";
      }
      if (this.accuracyEl) this.accuracyEl.textContent = `${accuracy}%`;
      if (this.hitsEl) this.hitsEl.textContent = `${hits} / ${hits + misses}`;
      if (this.reactionEl) this.reactionEl.textContent = avgReactionMs > 0 ? `${avgReactionMs} \u043C\u0441` : "\u2014";
      if (this.streakEl) this.streakEl.textContent = `${maxStreak}x`;
      this.renderWeakSpots(weakProblems);
      if (this.modalEl) {
        this.modalEl.classList.add("visible");
      }
    }
    hide() {
      if (this.modalEl) {
        this.modalEl.classList.remove("visible");
      }
    }
    renderWeakSpots(weakProblems) {
      if (!this.weakListEl) return;
      this.weakListEl.innerHTML = "";
      const map = /* @__PURE__ */ new Map();
      for (const item of weakProblems || []) {
        const key = `${item.a} \xD7 ${item.b}`;
        if (!map.has(key)) {
          map.set(key, { a: item.a, b: item.b, misses: 0, count: 0, reaction: item.reactionMs });
        }
        const p = map.get(key);
        p.count++;
        if (item.isMiss) p.misses++;
      }
      const uniqueMistakes = Array.from(map.values());
      this.lastMistakes = uniqueMistakes;
      if (uniqueMistakes.length === 0) {
        this.weakListEl.innerHTML = '<li class="weak-empty">\u0418\u0434\u0435\u0430\u043B\u044C\u043D\u044B\u0439 \u0440\u0430\u0443\u043D\u0434! \u041D\u0438 \u043E\u0434\u043D\u043E\u0439 \u043E\u0448\u0438\u0431\u043A\u0438 \u0438\u043B\u0438 \u0437\u0430\u043C\u0438\u043D\u043A\u0438</li>';
        if (this.trainMistakesBtn) this.trainMistakesBtn.style.display = "none";
        return;
      }
      if (this.trainMistakesBtn) {
        this.trainMistakesBtn.style.display = "inline-flex";
        this.trainMistakesBtn.textContent = `\u0422\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043E\u0448\u0438\u0431\u043A\u0438 (${uniqueMistakes.length})`;
      }
      uniqueMistakes.slice(0, 6).forEach((item) => {
        const li = document.createElement("li");
        li.className = "weak-item";
        const ans = item.a * item.b;
        const statusText = item.misses > 0 ? `\u041F\u0440\u043E\u043C\u0430\u0445 (${item.misses})` : `\u041C\u0435\u0434\u043B\u0435\u043D\u043D\u043E (${item.reaction} \u043C\u0441)`;
        const statusClass = item.misses > 0 ? "badge-miss" : "badge-slow";
        li.innerHTML = `
        <span class="weak-eq">${item.a} \xD7 ${item.b} = <strong>${ans}</strong></span>
        <span class="weak-badge ${statusClass}">${statusText}</span>
      `;
        this.weakListEl.appendChild(li);
      });
    }
    calculateRank(accuracy, reactionMs, hits) {
      if (hits < 5) return { rank: "C", title: "\u041D\u043E\u0432\u043E\u0431\u0440\u0430\u043D\u0435\u0446" };
      if (accuracy >= 95 && reactionMs > 0 && reactionMs < 450) return { rank: "S+", title: "\u041A\u0438\u0431\u0435\u0440\u0441\u043F\u043E\u0440\u0442\u0441\u043C\u0435\u043D" };
      if (accuracy >= 90 && reactionMs > 0 && reactionMs < 600) return { rank: "S", title: "\u041C\u0430\u0441\u0442\u0435\u0440 \u0442\u0430\u0431\u043B\u0438\u0446\u044B" };
      if (accuracy >= 80 && reactionMs < 850) return { rank: "A", title: "\u041C\u0435\u0442\u043A\u0438\u0439 \u0441\u0442\u0440\u0435\u043B\u043E\u043A" };
      if (accuracy >= 70) return { rank: "B", title: "\u0411\u043E\u0435\u0446" };
      return { rank: "C", title: "\u041F\u0440\u0430\u043A\u0442\u0438\u043A\u0430\u043D\u0442" };
    }
    calculateDrillRank(elapsedSec, accuracy, problemCount) {
      const count = problemCount > 0 ? problemCount : 8;
      const secPerTarget = (elapsedSec || 10) / count;
      if (secPerTarget <= 0.8 && accuracy >= 95) {
        return { rank: "S+", title: "\u0411\u043E\u0433 \u0430\u0438\u043C\u0430", css: "rank-s-plus" };
      }
      if (secPerTarget <= 1.25 && accuracy >= 90) {
        return { rank: "S", title: "\u041C\u0430\u0441\u0442\u0435\u0440 \u0442\u0430\u0431\u043B\u0438\u0446\u044B", css: "rank-s" };
      }
      if (secPerTarget <= 2 && accuracy >= 80) {
        return { rank: "A", title: "\u0421\u043D\u0430\u0439\u043F\u0435\u0440", css: "rank-a" };
      }
      if (secPerTarget <= 3.2) {
        return { rank: "B", title: "\u0411\u043E\u0435\u0446", css: "rank-b" };
      }
      return { rank: "C", title: "\u0423\u0447\u0435\u043D\u0438\u043A", css: "rank-c" };
    }
  };

  // src/js/ui/settings-view.js
  var SettingsView = class {
    constructor({ statsStore, soundEngine, crosshairController, targetManager, mathEngine }) {
      this.stats = statsStore;
      this.sound = soundEngine;
      this.crosshair = crosshairController;
      this.targets = targetManager;
      this.math = mathEngine;
      this.modalEl = document.getElementById("settings-modal");
      this.openBtn = document.getElementById("btn-open-settings");
      this.closeBtn = document.getElementById("btn-close-settings");
      this.saveBtn = document.getElementById("btn-save-settings");
      this.volumeSlider = document.getElementById("setting-volume");
      this.muteToggle = document.getElementById("setting-mute");
      this.crosshairSelect = document.getElementById("setting-crosshair");
      this.targetSizeSelect = document.getElementById("setting-target-size");
      this.presetAllBtn = document.getElementById("preset-all");
      this.presetHardBtn = document.getElementById("preset-hard");
      this.multiplierContainer = document.getElementById("multiplier-toggles");
      this.checkUpdateBtn = document.getElementById("btn-check-update");
      this.updateStatusText = document.getElementById("update-status-text");
      this.bindEvents();
      this.applySettingsToApp(this.stats.settings);
    }
    bindEvents() {
      if (this.openBtn) {
        this.openBtn.addEventListener("click", () => this.show());
      }
      if (this.closeBtn) {
        this.closeBtn.addEventListener("click", () => this.hide());
      }
      if (this.saveBtn) {
        this.saveBtn.addEventListener("click", () => {
          this.saveFromInputs();
          this.hide();
        });
      }
      if (this.volumeSlider) {
        this.volumeSlider.addEventListener("input", (e) => {
          const val = parseFloat(e.target.value);
          this.sound.setVolume(val);
          this.sound.playHit(1);
        });
      }
      if (this.muteToggle) {
        this.muteToggle.addEventListener("change", (e) => {
          this.sound.setMuted(e.target.checked);
        });
      }
      if (this.crosshairSelect) {
        this.crosshairSelect.addEventListener("change", (e) => {
          this.crosshair.setStyle(e.target.value);
        });
      }
      if (this.targetSizeSelect) {
        this.targetSizeSelect.addEventListener("change", (e) => {
          this.targets.setSize(e.target.value);
        });
      }
      if (this.presetAllBtn) {
        this.presetAllBtn.addEventListener("click", () => {
          this.setAllCheckboxes([2, 3, 4, 5, 6, 7, 8, 9]);
        });
      }
      if (this.presetHardBtn) {
        this.presetHardBtn.addEventListener("click", () => {
          this.setAllCheckboxes([6, 7, 8, 9]);
        });
      }
      if (this.checkUpdateBtn) {
        this.checkUpdateBtn.addEventListener("click", async () => {
          if (!this.updateStatusText) return;
          this.updateStatusText.textContent = "\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u0441\u0432\u044F\u0437\u044C \u0441 \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u043C...";
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);
            const res = await fetch("sw.js?check=" + Date.now(), { method: "HEAD", signal: controller.signal, cache: "no-store" });
            clearTimeout(timeoutId);
            if (res.ok) {
              const reg = await navigator.serviceWorker.getRegistration();
              if (reg) {
                await reg.update();
                this.updateStatusText.textContent = "\u0421\u0432\u044F\u0437\u044C \u0435\u0441\u0442\u044C (VPN \u0430\u043A\u0442\u0438\u0432\u0435\u043D). \u0415\u0441\u043B\u0438 \u0432\u044B\u0448\u043B\u043E \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435, \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u043A\u043D\u043E\u043F\u043A\u0430.";
              } else {
                this.updateStatusText.textContent = "\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0430 \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F.";
              }
            } else {
              this.updateStatusText.textContent = "\u0421\u0435\u0440\u0432\u0435\u0440 \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u0441\u043E \u0441\u0442\u0430\u0442\u0443\u0441\u043E\u043C " + res.status;
            }
          } catch {
            this.updateStatusText.textContent = "\u0421\u0435\u0440\u0432\u0435\u0440 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D (VPN \u0432\u044B\u043A\u043B). \u0418\u0433\u0440\u0430 \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u0438\u0437 \u043F\u0430\u043C\u044F\u0442\u0438.";
          }
        });
      }
    }
    show() {
      this.populateInputs(this.stats.settings);
      if (this.modalEl) this.modalEl.classList.add("visible");
    }
    hide() {
      if (this.modalEl) this.modalEl.classList.remove("visible");
    }
    populateInputs(settings) {
      if (this.volumeSlider) this.volumeSlider.value = settings.volume ?? 0.6;
      if (this.muteToggle) this.muteToggle.checked = Boolean(settings.muted);
      if (this.crosshairSelect) this.crosshairSelect.value = settings.crosshair || "cross";
      if (this.targetSizeSelect) this.targetSizeSelect.value = settings.targetSize || "medium";
      const mults = settings.multipliers || [2, 3, 4, 5, 6, 7, 8, 9];
      this.setAllCheckboxes(mults);
    }
    setAllCheckboxes(activeNumbers) {
      if (!this.multiplierContainer) return;
      const checkboxes = this.multiplierContainer.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach((cb) => {
        const val = parseInt(cb.value, 10);
        cb.checked = activeNumbers.includes(val);
      });
    }
    saveFromInputs() {
      const activeMultipliers = [];
      if (this.multiplierContainer) {
        const checkboxes = this.multiplierContainer.querySelectorAll('input[type="checkbox"]:checked');
        checkboxes.forEach((cb) => activeMultipliers.push(parseInt(cb.value, 10)));
      }
      const newSettings = {
        volume: parseFloat(this.volumeSlider?.value ?? 0.6),
        muted: Boolean(this.muteToggle?.checked),
        crosshair: this.crosshairSelect?.value || "cross",
        targetSize: this.targetSizeSelect?.value || "medium",
        multipliers: activeMultipliers.length > 0 ? activeMultipliers : [2, 3, 4, 5, 6, 7, 8, 9]
      };
      this.stats.saveSettings(newSettings);
      this.applySettingsToApp(newSettings);
    }
    applySettingsToApp(settings) {
      this.sound.setVolume(settings.volume ?? 0.6);
      this.sound.setMuted(Boolean(settings.muted));
      this.crosshair.setStyle(settings.crosshair || "cross");
      this.targets.setSize(settings.targetSize || "medium");
      this.math.setAllowedMultipliers(settings.multipliers || [2, 3, 4, 5, 6, 7, 8, 9]);
    }
  };

  // src/js/ui/study-view.js
  var StudyView = class {
    constructor({ statsStore, onPracticeProblem }) {
      this.stats = statsStore;
      this.onPracticeProblem = onPracticeProblem;
      this.modalEl = document.getElementById("study-modal");
      this.closeBtn = document.getElementById("btn-close-study");
      this.tableContainer = document.getElementById("study-matrix-container");
      this.filterButtonsContainer = document.getElementById("study-filter-buttons");
      this.detailBox = document.getElementById("study-detail-box");
      this.progressContainer = document.getElementById("study-progress-container");
      this.activeMultiplier = null;
      this.onlyUnlearned = false;
      this.bindEvents();
    }
    bindEvents() {
      if (this.closeBtn) {
        this.closeBtn.addEventListener("click", () => this.hide());
      }
      const openBtns = document.querySelectorAll("[data-open-study]");
      openBtns.forEach((btn) => btn.addEventListener("click", () => this.show()));
    }
    show() {
      this.render();
      if (this.modalEl) this.modalEl.classList.add("visible");
    }
    hide() {
      if (this.modalEl) this.modalEl.classList.remove("visible");
    }
    render() {
      this.renderProgress();
      this.renderFilters();
      this.renderMatrix();
      this.showDetail(7, 8);
    }
    renderProgress() {
      if (!this.progressContainer) return;
      const stats = this.stats.getTableHeatmapStats();
      this.progressContainer.innerHTML = `
      <div class="mastery-bar-wrapper">
        <div class="mastery-bar-header">
          <span class="mastery-title">\u041E\u0431\u0449\u0438\u0439 \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441 \u0442\u0430\u0431\u043B\u0438\u0446\u044B \u0443\u043C\u043D\u043E\u0436\u0435\u043D\u0438\u044F: <strong>${stats.overallPercent}%</strong></span>
          <span class="mastery-counts">
            <span class="stat-dot dot-green"></span> ${stats.masteredCount} \u0432\u044B\u0443\u0447\u0435\u043D\u043E
            <span class="stat-dot dot-amber"></span> ${stats.learningCount} \u0432 \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u0435
            <span class="stat-dot dot-rose"></span> ${stats.weakCount} \u0441\u043B\u043E\u0436\u043D\u044B\u0445
          </span>
        </div>
        <div class="mastery-progress-track">
          <div class="mastery-progress-fill" style="width: ${stats.overallPercent}%"></div>
        </div>
      </div>
    `;
    }
    renderFilters() {
      if (!this.filterButtonsContainer) return;
      this.filterButtonsContainer.innerHTML = "";
      const allBtn = document.createElement("button");
      allBtn.className = `btn btn-secondary ${this.activeMultiplier === null && !this.onlyUnlearned ? "active" : ""}`;
      allBtn.style.padding = "5px 11px";
      allBtn.style.fontSize = "12px";
      allBtn.textContent = "\u0412\u0441\u044F \u0442\u0430\u0431\u043B\u0438\u0446\u0430";
      allBtn.addEventListener("click", () => {
        this.activeMultiplier = null;
        this.onlyUnlearned = false;
        this.render();
      });
      this.filterButtonsContainer.appendChild(allBtn);
      const unlearnedBtn = document.createElement("button");
      unlearnedBtn.className = `btn btn-secondary ${this.onlyUnlearned ? "active" : ""}`;
      unlearnedBtn.style.padding = "5px 11px";
      unlearnedBtn.style.fontSize = "12px";
      unlearnedBtn.textContent = "\u0422\u043E\u043B\u044C\u043A\u043E \u0441\u043B\u043E\u0436\u043D\u044B\u0435";
      unlearnedBtn.addEventListener("click", () => {
        this.onlyUnlearned = !this.onlyUnlearned;
        this.render();
      });
      this.filterButtonsContainer.appendChild(unlearnedBtn);
      for (let i = 2; i <= 9; i++) {
        const btn = document.createElement("button");
        btn.className = `btn btn-secondary ${this.activeMultiplier === i && !this.onlyUnlearned ? "active" : ""}`;
        btn.style.padding = "5px 10px";
        btn.style.fontSize = "12px";
        btn.textContent = `\xD7 ${i}`;
        btn.addEventListener("click", () => {
          this.activeMultiplier = i;
          this.onlyUnlearned = false;
          this.render();
        });
        this.filterButtonsContainer.appendChild(btn);
      }
    }
    renderMatrix() {
      if (!this.tableContainer) return;
      this.tableContainer.innerHTML = "";
      const table = document.createElement("table");
      table.className = "study-matrix";
      const thead = document.createElement("thead");
      const headRow = document.createElement("tr");
      headRow.innerHTML = '<th class="matrix-corner">\xD7</th>';
      const range = [2, 3, 4, 5, 6, 7, 8, 9];
      range.forEach((col) => {
        const th = document.createElement("th");
        th.className = "matrix-header";
        th.textContent = col;
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);
      const tbody = document.createElement("tbody");
      const rows = this.activeMultiplier ? [this.activeMultiplier] : range;
      rows.forEach((r) => {
        const tr = document.createElement("tr");
        const th = document.createElement("th");
        th.className = "matrix-row-header";
        th.textContent = r;
        tr.appendChild(th);
        range.forEach((c) => {
          const td = document.createElement("td");
          const prod = r * c;
          const mastery = this.stats.getMastery(r, c);
          const inVault = this.stats.isInVault(r, c);
          if (this.onlyUnlearned && mastery.status === "mastered") {
            td.className = "matrix-cell cell-muted";
            td.innerHTML = `<span class="cell-prod" style="opacity: 0.25;">${prod}</span>`;
          } else {
            td.className = `matrix-cell status-${mastery.status} ${inVault ? "is-vault" : ""}`;
            td.innerHTML = `
            <span class="cell-prod">${prod}</span>
            <span class="cell-status-indicator"></span>
          `;
            td.addEventListener("click", () => this.showDetail(r, c));
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      this.tableContainer.appendChild(table);
    }
    showDetail(a, b) {
      if (!this.detailBox) return;
      const ans = a * b;
      const inVault = this.stats.isInVault(a, b);
      const mastery = this.stats.getMastery(a, b);
      let statusText = "\u041D\u0435 \u0432\u0441\u0442\u0440\u0435\u0447\u0430\u043B\u0441\u044F";
      if (mastery.status === "mastered") statusText = "\u0412\u044B\u0443\u0447\u0435\u043D\u043E \u043D\u0430 \u043E\u0442\u043B\u0438\u0447\u043D\u043E";
      else if (mastery.status === "learning") statusText = "\u0412 \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u0435 \u0437\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F";
      else if (mastery.status === "weak") statusText = "\u0422\u0440\u0435\u0431\u0443\u0435\u0442 \u043E\u0442\u0440\u0430\u0431\u043E\u0442\u043A\u0438";
      this.detailBox.innerHTML = `
      <div class="study-detail-content">
        <div class="study-detail-left">
          <div class="study-detail-eq">
            <span class="eq-factors">${a} \xD7 ${b} =</span>
            <span class="eq-ans">${ans}</span>
          </div>
          <div class="study-detail-sub">
            <span class="badge-status status-${mastery.status}">${statusText} (${mastery.score}%)</span>
          </div>
        </div>

        <div class="study-detail-actions">
          <button id="btn-toggle-hard-star" class="btn ${inVault ? "btn-danger" : "btn-secondary"}" style="padding: 7px 14px; font-size: 13px;">
            ${inVault ? "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0438\u0437 \u0441\u043B\u043E\u0436\u043D\u044B\u0445" : "+ \u0412 \u0431\u0430\u0437\u0443 \u0441\u043B\u043E\u0436\u043D\u044B\u0445"}
          </button>
        </div>
      </div>
    `;
      const starBtn = document.getElementById("btn-toggle-hard-star");
      if (starBtn) {
        starBtn.addEventListener("click", () => {
          this.stats.toggleVault(a, b);
          this.showDetail(a, b);
          this.render();
          window.dispatchEvent(new CustomEvent("vault-updated"));
        });
      }
    }
  };

  // src/js/ui/vault-view.js
  var VaultView = class {
    constructor({ statsStore, onStartVaultDrill }) {
      this.stats = statsStore;
      this.onStartVaultDrill = onStartVaultDrill;
      this.modalEl = document.getElementById("vault-modal");
      this.closeBtn = document.getElementById("btn-close-vault");
      this.listContainer = document.getElementById("vault-items-list");
      this.startDrillBtn = document.getElementById("btn-start-vault-drill");
      this.clearAllBtn = document.getElementById("btn-clear-vault");
      this.counterBadge = document.getElementById("vault-count-badge");
      this.bindEvents();
    }
    bindEvents() {
      if (this.closeBtn) {
        this.closeBtn.addEventListener("click", () => this.hide());
      }
      const openBtns = document.querySelectorAll("[data-open-vault]");
      openBtns.forEach((btn) => btn.addEventListener("click", () => this.show()));
      if (this.startDrillBtn) {
        this.startDrillBtn.addEventListener("click", () => {
          const list = this.stats.getVaultList();
          if (list.length > 0) {
            this.hide();
            if (this.onStartVaultDrill) {
              this.onStartVaultDrill(list);
            }
          }
        });
      }
      if (this.clearAllBtn) {
        this.clearAllBtn.addEventListener("click", () => {
          if (confirm("\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u0432\u0441\u044E \u0431\u0430\u0437\u0443 \u0441\u043B\u043E\u0436\u043D\u044B\u0445 \u043F\u0440\u0438\u043C\u0435\u0440\u043E\u0432?")) {
            this.stats.clearVault();
            this.render();
            window.dispatchEvent(new CustomEvent("vault-updated"));
          }
        });
      }
      window.addEventListener("vault-updated", () => {
        this.updateCounter();
        if (this.modalEl && this.modalEl.classList.contains("visible")) {
          this.render();
        }
      });
    }
    updateCounter() {
      const count = this.stats.getVaultCount();
      if (this.counterBadge) {
        this.counterBadge.textContent = count;
        this.counterBadge.style.display = count > 0 ? "inline-flex" : "none";
      }
    }
    show() {
      this.render();
      if (this.modalEl) this.modalEl.classList.add("visible");
    }
    hide() {
      if (this.modalEl) this.modalEl.classList.remove("visible");
    }
    render() {
      this.updateCounter();
      const list = this.stats.getVaultList();
      if (!this.listContainer) return;
      this.listContainer.innerHTML = "";
      if (list.length === 0) {
        this.listContainer.innerHTML = `
        <div class="vault-empty-state">
          <div style="margin-bottom: 10px; color: #38bdf8;">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          </div>
          <div style="font-weight: 700; color: #fff; margin-bottom: 4px;">\u0411\u0430\u0437\u0430 \u0441\u043B\u043E\u0436\u043D\u044B\u0445 \u043F\u0443\u0441\u0442\u0430</div>
          <div style="font-size: 13px; color: #94a3b8; max-width: 320px; margin: 0 auto;">
            \u041F\u0440\u0438\u043C\u0435\u0440\u044B, \u0433\u0434\u0435 \u0442\u044B \u0441\u043F\u043E\u0442\u044B\u043A\u0430\u0435\u0448\u044C\u0441\u044F \u0432 \u0440\u0430\u0443\u043D\u0434\u0430\u0445, \u043F\u043E\u043F\u0430\u0434\u0430\u044E\u0442 \u0441\u044E\u0434\u0430 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438. \u0422\u0430\u043A\u0436\u0435 \u043C\u043E\u0436\u043D\u043E \u043E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u043B\u044E\u0431\u043E\u0439 \u043F\u0440\u0438\u043C\u0435\u0440 \u0447\u0435\u0440\u0435\u0437 \xAB\u0423\u0440\u043E\u043A \u0438\u0437\u0443\u0447\u0435\u043D\u0438\u044F\xBB.
          </div>
        </div>
      `;
        if (this.startDrillBtn) this.startDrillBtn.disabled = true;
        if (this.clearAllBtn) this.clearAllBtn.style.display = "none";
        return;
      }
      if (this.startDrillBtn) this.startDrillBtn.disabled = false;
      if (this.clearAllBtn) this.clearAllBtn.style.display = "inline-flex";
      list.forEach((item) => {
        const card = document.createElement("div");
        card.className = "vault-item-card";
        const reasonTag = item.misses > 0 ? `<span class="vault-tag tag-miss">\u041F\u0440\u043E\u043C\u0430\u0445\u043E\u0432: ${item.misses}</span>` : `<span class="vault-tag tag-manual">\u0412 \u0440\u0443\u0447\u043D\u0443\u044E</span>`;
        card.innerHTML = `
        <div class="vault-item-info">
          <span class="vault-item-eq">${item.a} \xD7 ${item.b} = <strong>${item.answer}</strong></span>
          ${reasonTag}
        </div>
        <button class="btn-icon vault-delete-btn" title="\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0438\u0437 \u0441\u043B\u043E\u0436\u043D\u044B\u0445">\u2715</button>
      `;
        card.querySelector(".vault-delete-btn").addEventListener("click", () => {
          this.stats.removeFromVault(item.a, item.b);
          this.render();
          window.dispatchEvent(new CustomEvent("vault-updated"));
        });
        this.listContainer.appendChild(card);
      });
    }
  };

  // src/js/ui/training-modal.js
  var TrainingModal = class {
    constructor({ statsStore, onStartDrill }) {
      this.stats = statsStore;
      this.onStartDrill = onStartDrill;
      this.modalEl = document.getElementById("training-modal");
      this.closeBtn = document.getElementById("btn-close-training");
      this.pillContainer = document.getElementById("training-number-pills");
      this.startBtn = document.getElementById("btn-start-training-drill");
      this.selectedChoice = "all";
      this.bindEvents();
    }
    bindEvents() {
      if (this.closeBtn) {
        this.closeBtn.addEventListener("click", () => this.hide());
      }
      const openBtns = document.querySelectorAll("[data-open-training]");
      openBtns.forEach((btn) => btn.addEventListener("click", () => this.show()));
      if (this.startBtn) {
        this.startBtn.addEventListener("click", () => {
          this.hide();
          this.launchSelectedDrill();
        });
      }
    }
    show() {
      this.renderPills();
      if (this.modalEl) this.modalEl.classList.add("visible");
    }
    hide() {
      if (this.modalEl) this.modalEl.classList.remove("visible");
    }
    renderPills() {
      if (!this.pillContainer) return;
      this.pillContainer.innerHTML = "";
      const options = [
        { id: "all", label: "\u0412\u0441\u044F \u0442\u0430\u0431\u043B\u0438\u0446\u0430 (2\u20139)", desc: "36 \u043A\u043E\u043C\u0431\u0438\u043D\u0430\u0446\u0438\u0439" },
        { id: 2, label: "\u0422\u043E\u043B\u044C\u043A\u043E \u043D\u0430 2", desc: "8 \u043F\u0440\u0438\u043C\u0435\u0440\u043E\u0432" },
        { id: 3, label: "\u0422\u043E\u043B\u044C\u043A\u043E \u043D\u0430 3", desc: "8 \u043F\u0440\u0438\u043C\u0435\u0440\u043E\u0432" },
        { id: 4, label: "\u0422\u043E\u043B\u044C\u043A\u043E \u043D\u0430 4", desc: "8 \u043F\u0440\u0438\u043C\u0435\u0440\u043E\u0432" },
        { id: 5, label: "\u0422\u043E\u043B\u044C\u043A\u043E \u043D\u0430 5", desc: "8 \u043F\u0440\u0438\u043C\u0435\u0440\u043E\u0432" },
        { id: 6, label: "\u0422\u043E\u043B\u044C\u043A\u043E \u043D\u0430 6", desc: "8 \u043F\u0440\u0438\u043C\u0435\u0440\u043E\u0432" },
        { id: 7, label: "\u0422\u043E\u043B\u044C\u043A\u043E \u043D\u0430 7", desc: "8 \u043F\u0440\u0438\u043C\u0435\u0440\u043E\u0432" },
        { id: 8, label: "\u0422\u043E\u043B\u044C\u043A\u043E \u043D\u0430 8", desc: "8 \u043F\u0440\u0438\u043C\u0435\u0440\u043E\u0432" },
        { id: 9, label: "\u0422\u043E\u043B\u044C\u043A\u043E \u043D\u0430 9", desc: "8 \u043F\u0440\u0438\u043C\u0435\u0440\u043E\u0432" },
        { id: "vault", label: "\u0411\u0430\u0437\u0430 \u0441\u043B\u043E\u0436\u043D\u044B\u0445", desc: `${this.stats.getVaultCount()} \u043F\u0440\u0438\u043C\u0435\u0440\u043E\u0432` }
      ];
      options.forEach((opt) => {
        const btn = document.createElement("button");
        const isSelected = this.selectedChoice === opt.id;
        btn.className = `training-pill ${isSelected ? "active" : ""}`;
        btn.innerHTML = `
        <span class="pill-title">${opt.label}</span>
        <span class="pill-desc">${opt.desc}</span>
      `;
        btn.addEventListener("click", () => {
          this.selectedChoice = opt.id;
          this.hide();
          this.launchSelectedDrill();
        });
        this.pillContainer.appendChild(btn);
      });
    }
    launchSelectedDrill() {
      let pool = [];
      if (this.selectedChoice === "vault") {
        const list = this.stats.getVaultList();
        if (list.length === 0) {
          alert("\u0412 \u0431\u0430\u0437\u0435 \u0441\u043B\u043E\u0436\u043D\u044B\u0445 \u043F\u043E\u043A\u0430 \u043F\u0443\u0441\u0442\u043E! \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u043E\u0435 \u0447\u0438\u0441\u043B\u043E \u0438\u043B\u0438 \u0441\u044B\u0433\u0440\u0430\u0439\u0442\u0435 \u0440\u0430\u0443\u043D\u0434.");
          return;
        }
        pool = list.map((item) => ({ a: item.a, b: item.b }));
      } else if (typeof this.selectedChoice === "number") {
        const n = this.selectedChoice;
        for (let b = 2; b <= 9; b++) {
          pool.push({ a: n, b });
        }
      } else {
        for (let a = 2; a <= 9; a++) {
          for (let b = a; b <= 9; b++) {
            pool.push({ a, b });
          }
        }
      }
      if (this.onStartDrill) {
        const drillId = typeof this.selectedChoice === "number" ? `drill_${this.selectedChoice}` : this.selectedChoice === "vault" ? "drill_vault" : "drill_all";
        this.onStartDrill(pool, drillId);
      }
    }
  };

  // src/js/app.js
  var App = class {
    constructor() {
      this.screenMenu = document.getElementById("screen-menu");
      this.screenArena = document.getElementById("screen-arena");
      this.arenaEl = document.getElementById("arena");
      this.fxCanvas = document.getElementById("fx-canvas");
      this.menuHighScoreEl = document.getElementById("menu-highscore");
      this.vaultCountBadge = document.getElementById("vault-count-badge");
      this.init();
    }
    init() {
      this.stats = new StatsStore();
      this.sound = new SoundEngine();
      this.math = new MathEngine({ allowedMultipliers: this.stats.settings.multipliers });
      this.fx = new ParticleFX(this.fxCanvas);
      this.hud = new HudView();
      this.crosshair = new CrosshairController(this.arenaEl);
      this.targets = new TargetManager(this.arenaEl, (targetData) => {
        this.game.handleTargetClick(targetData);
      });
      this.game = new GameController({
        mathEngine: this.math,
        soundEngine: this.sound,
        particleFx: this.fx,
        statsStore: this.stats,
        targetManager: this.targets,
        hudView: this.hud,
        crosshair: this.crosshair
      });
      this.results = new ResultsView({
        onPlayAgain: () => {
          this.startMatch(this.game.mode, this.game.overridePool, this.game.drillId);
        },
        onTrainMistakes: (mistakes) => {
          this.startMatch("drill", mistakes.map((m) => ({ a: m.a, b: m.b })), "drill_vault");
        },
        onStartCompetition: () => {
          this.startMatch("gridshot_60");
        },
        onReturnMenu: () => {
          this.showMenu();
        }
      });
      this.game.onGameOverCallback = (summary) => {
        this.results.show(summary);
        this.updateMenuStats();
        window.dispatchEvent(new CustomEvent("vault-updated"));
      };
      this.settingsView = new SettingsView({
        statsStore: this.stats,
        soundEngine: this.sound,
        crosshairController: this.crosshair,
        targetManager: this.targets,
        mathEngine: this.math
      });
      this.studyView = new StudyView({
        statsStore: this.stats,
        onPracticeProblem: (a, b) => {
          this.startMatch("drill", [{ a, b }]);
        }
      });
      this.vaultView = new VaultView({
        statsStore: this.stats,
        onStartVaultDrill: (vaultList) => {
          this.startMatch("drill", vaultList.map((item) => ({ a: item.a, b: item.b })), "drill_vault");
        }
      });
      this.trainingModal = new TrainingModal({
        statsStore: this.stats,
        onStartDrill: (pool, drillId) => {
          this.startMatch("drill", pool, drillId);
        }
      });
      this.bindArenaEvents();
      this.bindMenuEvents();
      this.updateMenuStats();
    }
    bindArenaEvents() {
      this.arenaEl.addEventListener("mousedown", (e) => {
        if (e.target === this.arenaEl || e.target === this.fxCanvas) {
          const rect = this.arenaEl.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          this.game.handleMissClick(x, y);
        }
      });
      const quitBtn = document.getElementById("btn-quit-game");
      if (quitBtn) {
        quitBtn.addEventListener("click", () => {
          this.game.stop();
          this.showMenu();
        });
      }
      window.addEventListener("keydown", (e) => {
        if (e.code === "Space" && this.results.modalEl.classList.contains("visible")) {
          e.preventDefault();
          this.results.hide();
          this.startMatch(this.game.mode, this.game.overridePool, this.game.drillId);
        } else if (e.code === "Escape") {
          if (this.game.state === "PLAYING") {
            this.game.stop();
            this.showMenu();
          }
        }
      });
    }
    bindMenuEvents() {
      const modeButtons = document.querySelectorAll("[data-mode]");
      modeButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const mode = btn.getAttribute("data-mode");
          this.startMatch(mode);
        });
      });
    }
    updateMenuStats() {
      const high = this.stats.getHighScore("gridshot_60");
      if (this.menuHighScoreEl) {
        this.menuHighScoreEl.textContent = high > 0 ? Number(high).toLocaleString() : "\u2014";
      }
      const count = this.stats.getVaultCount();
      if (this.vaultCountBadge) {
        this.vaultCountBadge.textContent = count;
        this.vaultCountBadge.style.display = count > 0 ? "inline-flex" : "none";
      }
    }
    startMatch(mode, overridePool = null, drillId = null) {
      this.screenMenu.classList.remove("active");
      this.screenArena.classList.add("active");
      this.fx.resize();
      this.game.setMode(mode);
      this.game.overridePool = overridePool;
      this.game.drillId = drillId || (mode === "drill" ? this.game.drillId || "drill_all" : null);
      this.game.startCountdown(() => {
      });
    }
    showMenu() {
      this.screenArena.classList.remove("active");
      this.screenMenu.classList.add("active");
      this.updateMenuStats();
    }
  };
  window.addEventListener("DOMContentLoaded", () => {
    new App();
    if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
      let showUpdateBanner = function(worker) {
        const toast = document.getElementById("update-toast");
        const applyBtn = document.getElementById("btn-apply-update");
        if (toast && applyBtn) {
          toast.style.display = "flex";
          applyBtn.onclick = () => {
            worker.postMessage({ type: "SKIP_WAITING" });
          };
        }
      };
      let newWorker = null;
      navigator.serviceWorker.register("sw.js").then((registration) => {
        if (registration.waiting) {
          showUpdateBanner(registration.waiting);
        }
        registration.addEventListener("updatefound", () => {
          newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                showUpdateBanner(newWorker);
              }
            });
          }
        });
      }).catch((err) => {
        console.warn("Offline Service Worker registration failed:", err);
      });
      const checkForUpdatesSilently = async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3e3);
          const res = await fetch("sw.js?t=" + Date.now(), {
            method: "HEAD",
            signal: controller.signal,
            cache: "no-store"
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) reg.update();
          }
        } catch {
        }
      };
      setTimeout(checkForUpdatesSilently, 2500);
      window.addEventListener("focus", checkForUpdatesSilently);
      window.addEventListener("online", checkForUpdatesSilently);
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  });
})();
