/**
 * HUD View: Controls in-game HUD displays (Equation, Timer, Score, Combo, Accuracy, Drill Progress).
 */
export class HudView {
  constructor() {
    this.equationEl = document.getElementById('hud-equation');
    this.timerEl = document.getElementById('hud-timer');
    this.scoreEl = document.getElementById('hud-score');
    this.comboEl = document.getElementById('hud-combo');
    this.accuracyEl = document.getElementById('hud-accuracy');
    this.countdownEl = document.getElementById('countdown-overlay');
    this.countdownTextEl = document.getElementById('countdown-text');
  }

  updateEquation(eqText) {
    if (this.equationEl) {
      this.equationEl.textContent = eqText;
      this.equationEl.classList.remove('eq-bump');
      void this.equationEl.offsetWidth;
      this.equationEl.classList.add('eq-bump');
    }
  }

  updateTime(secondsLeft) {
    this.resetTimerLabel();
    if (!this.timerEl) return;
    if (secondsLeft === Infinity) {
      this.timerEl.textContent = '∞';
      this.timerEl.classList.remove('timer-warning');
      return;
    }

    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    this.timerEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    if (secondsLeft <= 10 && secondsLeft > 0) {
      this.timerEl.classList.add('timer-warning');
    } else {
      this.timerEl.classList.remove('timer-warning');
    }
  }

  updateDrillProgress(remaining, total) {
    if (!this.timerEl) return;
    this.timerEl.textContent = `${remaining} / ${total}`;
    this.timerEl.classList.remove('timer-warning');
    const badge = this.timerEl.closest('.hud-badge');
    if (badge) {
      const label = badge.querySelector('.hud-badge-label');
      if (label) label.textContent = 'Осталось';
    }
  }

  resetTimerLabel() {
    if (!this.timerEl) return;
    const badge = this.timerEl.closest('.hud-badge');
    if (badge) {
      const label = badge.querySelector('.hud-badge-label');
      if (label) label.textContent = 'Время';
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
      this.comboEl.textContent = `${streak}x СЕРИЯ`;
      this.comboEl.classList.add('active');
      if (streak >= 5) {
        this.comboEl.classList.add('on-fire');
      } else {
        this.comboEl.classList.remove('on-fire');
      }
    } else {
      this.comboEl.textContent = '';
      this.comboEl.classList.remove('active', 'on-fire');
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
      this.countdownEl.classList.add('visible');
      this.countdownTextEl.classList.remove('pulse');
      void this.countdownTextEl.offsetWidth;
      this.countdownTextEl.classList.add('pulse');
    }
  }

  hideCountdown() {
    if (this.countdownEl) {
      this.countdownEl.classList.remove('visible');
    }
  }
}
