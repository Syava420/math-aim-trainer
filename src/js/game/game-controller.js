/**
 * Game Controller: Core gameplay loop, round timing, scoring, telemetry,
 * and progressive elimination knockout drill.
 */
export class GameController {
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

    this.state = 'IDLE';
    this.mode = 'gridshot_60';
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
    this.drillQueue = [];
    this.initialDrillCount = 0;

    this.onGameOverCallback = null;
  }

  setMode(mode) {
    this.mode = mode;
  }

  startCountdown(onComplete) {
    this.state = 'COUNTDOWN';
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
        this.hud.showCountdown('GO!');
        this.sound.playCountdown(true);
      } else {
        clearInterval(this.countdownTimer);
        this.hud.hideCountdown();
        this.startRound();
        if (onComplete) onComplete();
      }
    }, 850);
  }

  startRound(overrideProblems = null) {
    this.state = 'PLAYING';
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

    if (this.mode === 'drill') {
      this.drillQueue = Array.isArray(this.overridePool) ? [...this.overridePool] : [];
      this.initialDrillCount = this.drillQueue.length;
      this.roundTimeRemaining = Infinity;
      this.hud.updateDrillProgress(this.drillQueue.length, this.initialDrillCount);
    } else if (this.mode === 'blitz_30') {
      this.roundTimeRemaining = 30;
      this.hud.updateTime(30);
    } else if (this.mode === 'practice') {
      this.roundTimeRemaining = Infinity;
      this.hud.updateTime(Infinity);
    } else {
      this.roundTimeRemaining = 60;
      this.hud.updateTime(60);
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
        const elapsed = (Date.now() - startMs) / 1000;
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

    if (this.mode === 'drill' && this.drillQueue.length > 0) {
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
    if (this.state !== 'PLAYING') return;

    this.misses++;
    this.combo = 0;
    this.hud.updateCombo(0);
    this.hud.updateAccuracy(this.calcAccuracy());

    this.sound.playMiss();
    this.crosshair.triggerRecoil();
    this.crosshair.showHitmarker(false, arenaX, arenaY);

    if (arenaX !== undefined && arenaY !== undefined) {
      this.fx.spawnFloatingText('MISS', arenaX, arenaY, '#f43f5e', false);
    }

    if (this.currentProblem) {
      this.weakProblems.push({
        a: this.currentProblem.a,
        b: this.currentProblem.b,
        isMiss: true,
        reactionMs: null
      });
      this.stats.recordAnswer(this.currentProblem.a, this.currentProblem.b, false, 2000);

      // In drill mode, rotate to end
      if (this.mode === 'drill' && this.drillQueue.length > 1) {
        const item = this.drillQueue.shift();
        this.drillQueue.push(item);
      }
    }
  }

  handleTargetClick({ value, isCorrect, x, y, targetEl }) {
    if (this.state !== 'PLAYING') return;

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

      // Audio & FX
      if (isUltraFlick) {
        this.sound.playCrit();
        this.fx.spawnFloatingText(`CRIT! +${addedScore}`, x, y, '#38bdf8', true);
      } else {
        this.sound.playHit(this.combo);
        this.fx.spawnFloatingText(`+${addedScore}`, x, y, '#4ade80', false);
      }

      this.crosshair.showHitmarker(true, x, y);
      this.fx.spawnHitSparks(x, y, isUltraFlick ? '#38bdf8' : '#22c55e', 16);

      // Progressive Drill Knockout logic
      if (this.mode === 'drill') {
        if (reactionMs <= 1200) {
          // Mastered & eliminated from current drill!
          const idx = this.drillQueue.findIndex(p =>
            (p.a === this.currentProblem.a && p.b === this.currentProblem.b) ||
            (p.a === this.currentProblem.b && p.b === this.currentProblem.a)
          );
          if (idx !== -1) {
            this.drillQueue.splice(idx, 1);
          }
          this.hud.updateDrillProgress(this.drillQueue.length, this.initialDrillCount);
          this.fx.spawnFloatingText(`ВЫУЧЕНО! (${this.drillQueue.length} ост.)`, x, y - 20, '#22c55e', true);

          if (this.drillQueue.length === 0) {
            // Victory: all problems mastered!
            setTimeout(() => this.endRound(true), 400);
            return;
          }
        } else {
          // Slow: keep in queue and rotate to back
          if (this.drillQueue.length > 1) {
            const item = this.drillQueue.shift();
            this.drillQueue.push(item);
          }
          this.fx.spawnFloatingText('МЕДЛЕННО (ПОВТОРИМ)', x, y - 20, '#f59e0b', false);
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
      this.fx.spawnFloatingText('✕ WRONG', x, y, '#ef4444', true);
      this.fx.spawnHitSparks(x, y, '#ef4444', 12);

      targetEl.classList.add('error-shake');
      setTimeout(() => targetEl.classList.remove('error-shake'), 300);

      if (this.currentProblem) {
        this.weakProblems.push({
          a: this.currentProblem.a,
          b: this.currentProblem.b,
          isMiss: true,
          reactionMs
        });

        // Rotate to back of queue
        if (this.mode === 'drill' && this.drillQueue.length > 1) {
          const item = this.drillQueue.shift();
          this.drillQueue.push(item);
        }
      }
    }
  }

  calcAccuracy() {
    const total = this.hits + this.misses;
    if (total === 0) return 100;
    return Math.round((this.hits / total) * 100);
  }

  endRound(isDrillWin = false) {
    this.state = 'RESULTS';
    if (this.roundTimer) clearInterval(this.roundTimer);
    this.targets.clear();
    this.sound.playGameOver();

    const avgReaction = this.reactionTimes.length > 0
      ? Math.round(this.reactionTimes.reduce((acc, v) => acc + v, 0) / this.reactionTimes.length)
      : 0;

    const summary = {
      mode: this.mode,
      score: this.score,
      hits: this.hits,
      misses: this.misses,
      accuracy: this.calcAccuracy(),
      avgReactionMs: avgReaction,
      maxStreak: this.maxCombo,
      weakProblems: this.weakProblems,
      isDrillWin,
      initialDrillCount: this.initialDrillCount,
      elapsedSec: this.roundStartTime ? parseFloat(((performance.now() - this.roundStartTime) / 1000).toFixed(1)) : null
    };

    const recordResult = this.stats.recordRound(summary);
    summary.isNewHigh = recordResult.isNewHigh;
    summary.currentHigh = recordResult.currentHigh;

    if (this.onGameOverCallback) {
      this.onGameOverCallback(summary);
    }
  }

  stop() {
    if (this.roundTimer) clearInterval(this.roundTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.targets.clear();
    this.fx.stop();
    this.state = 'IDLE';
  }
}
