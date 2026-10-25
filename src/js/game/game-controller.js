/**
 * Game Controller: Core gameplay loop, round timing, scoring, and telemetry.
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

    this.state = 'IDLE'; // IDLE, COUNTDOWN, PLAYING, RESULTS
    this.mode = 'gridshot_60';
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.hits = 0;
    this.misses = 0;
    this.reactionTimes = [];
    this.weakProblems = [];

    this.currentProblem = null;
    this.problemStartTime = 0;
    this.roundTimeRemaining = 60;
    this.roundTimer = null;
    this.countdownTimer = null;

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
    if (overrideProblems !== null) {
      this.overridePool = overrideProblems;
    }

    // Set duration based on mode
    if (this.mode === 'blitz_30') {
      this.roundTimeRemaining = 30;
    } else if (this.mode === 'practice') {
      this.roundTimeRemaining = Infinity;
    } else {
      this.roundTimeRemaining = 60;
    }

    this.hud.updateScore(0);
    this.hud.updateCombo(0);
    this.hud.updateAccuracy(100);
    this.hud.updateTime(this.roundTimeRemaining);

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
          this.endRound();
        }
      }, 250);
    }
  }

  nextProblem() {
    this.currentProblem = this.math.generateProblem(2, this.overridePool);
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
    this.crosshair.showHitmarker(false);

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

      // Score calculation
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

      this.crosshair.showHitmarker(true);
      this.fx.spawnHitSparks(x, y, isUltraFlick ? '#38bdf8' : '#22c55e', 18);

      // Track if reaction was unusually slow (> 1600ms)
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

      // Immediate seamless progression
      this.nextProblem();
    } else {
      // Clicked incorrect target
      this.misses++;
      this.combo = 0;
      this.hud.updateCombo(0);
      this.hud.updateAccuracy(this.calcAccuracy());

      this.sound.playMiss();
      this.crosshair.showHitmarker(false);
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
      }
    }
  }

  calcAccuracy() {
    const total = this.hits + this.misses;
    if (total === 0) return 100;
    return Math.round((this.hits / total) * 100);
  }

  endRound() {
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
      weakProblems: this.weakProblems
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
