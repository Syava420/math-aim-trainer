/**
 * Results View: Post-game breakdown, rank calculation, telemetry, and drill celebration.
 */
export class ResultsView {
  constructor({ onPlayAgain, onTrainMistakes, onReturnMenu, onStartCompetition }) {
    this.modalEl = document.getElementById('results-modal');
    this.rankEl = document.getElementById('res-rank');
    this.rankLabelEl = document.getElementById('res-rank-label');
    this.scoreEl = document.getElementById('res-score');
    this.highScoreTagEl = document.getElementById('res-highscore-tag');
    this.accuracyEl = document.getElementById('res-accuracy');
    this.hitsEl = document.getElementById('res-hits');
    this.reactionEl = document.getElementById('res-reaction');
    this.kpsEl = document.getElementById('res-kps');
    this.streakEl = document.getElementById('res-streak');
    this.weakListEl = document.getElementById('res-weak-list');
    this.pbEl = document.getElementById('res-pb');
    this.pbLabelEl = document.getElementById('res-pb-label');
    this.trainMistakesBtn = document.getElementById('btn-train-mistakes');
    this.playAgainBtn = document.getElementById('btn-play-again');
    this.goCompetitionBtn = document.getElementById('btn-go-competition');
    this.returnMenuBtn = document.getElementById('btn-return-menu');

    this.onPlayAgain = onPlayAgain;
    this.onTrainMistakes = onTrainMistakes;
    this.onReturnMenu = onReturnMenu;
    this.onStartCompetition = onStartCompetition;

    this.lastSummary = null;
    this.bindEvents();
  }

  bindEvents() {
    if (this.playAgainBtn) {
      this.playAgainBtn.addEventListener('click', () => {
        this.hide();
        if (this.onPlayAgain) this.onPlayAgain();
      });
    }

    if (this.goCompetitionBtn) {
      this.goCompetitionBtn.addEventListener('click', () => {
        this.hide();
        if (this.onStartCompetition) this.onStartCompetition();
      });
    }

    if (this.trainMistakesBtn) {
      this.trainMistakesBtn.addEventListener('click', () => {
        this.hide();
        if (this.onTrainMistakes) this.onTrainMistakes(this.lastMistakes);
      });
    }

    if (this.returnMenuBtn) {
      this.returnMenuBtn.addEventListener('click', () => {
        this.hide();
        if (this.onReturnMenu) this.onReturnMenu();
      });
    }
  }

  show(summary) {
    this.lastSummary = summary;
    const {
      score, hits, misses, accuracy, avgReactionMs, maxStreak,
      isNewHigh, currentHigh, weakProblems, mode, isDrillWin,
      initialDrillCount, elapsedSec, isNewDrillBest, prevDrillBest, currentDrillBest
    } = summary;

    const kpsLabel = this.kpsEl?.previousElementSibling;

    if (isDrillWin) {
      const drillRank = this.calculateDrillRank(elapsedSec, accuracy, initialDrillCount);
      if (this.rankEl) {
        this.rankEl.textContent = drillRank.rank;
        this.rankEl.className = `res-rank-badge ${drillRank.css}`;
      }
      if (this.rankLabelEl) {
        this.rankLabelEl.textContent = `${drillRank.title} (Все ${initialDrillCount} выучены)`;
      }
      if (this.scoreEl) {
        this.scoreEl.textContent = `${elapsedSec} с`;
      }

      if (this.highScoreTagEl) {
        if (isNewDrillBest) {
          this.highScoreTagEl.className = 'res-tag-record';
          this.highScoreTagEl.innerHTML = `
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            <span>Новый рекорд!</span>
          `;
          this.highScoreTagEl.style.display = 'inline-flex';
        } else if (prevDrillBest && elapsedSec > prevDrillBest) {
          const delta = (elapsedSec - prevDrillBest).toFixed(1);
          this.highScoreTagEl.className = 'res-tag-delta';
          this.highScoreTagEl.innerHTML = `<span>+${delta} с до рекорда</span>`;
          this.highScoreTagEl.style.display = 'inline-flex';
        } else {
          this.highScoreTagEl.style.display = 'none';
        }
      }

      if (kpsLabel) kpsLabel.textContent = 'Время забега';
      if (this.kpsEl) this.kpsEl.textContent = `${elapsedSec} с`;

      if (this.pbLabelEl) this.pbLabelEl.textContent = 'Личный рекорд';
      const best = currentDrillBest || elapsedSec;
      if (this.pbEl) this.pbEl.textContent = best ? `${best} с` : '—';

      if (this.playAgainBtn) this.playAgainBtn.textContent = 'Повторить забег (Пробел)';
      if (this.goCompetitionBtn) this.goCompetitionBtn.style.display = 'inline-flex';
    } else {
      const rankInfo = this.calculateRank(accuracy, avgReactionMs, hits);
      if (this.rankEl) {
        this.rankEl.textContent = rankInfo.rank;
        this.rankEl.className = `res-rank-badge rank-${rankInfo.rank.toLowerCase().replace('+', '-plus')}`;
      }
      if (this.rankLabelEl) {
        this.rankLabelEl.textContent = rankInfo.title;
      }
      if (this.scoreEl) {
        this.scoreEl.textContent = Number(score).toLocaleString();
      }

      if (this.highScoreTagEl) {
        if (isNewHigh) {
          this.highScoreTagEl.className = 'res-tag-record';
          this.highScoreTagEl.innerHTML = `
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            <span>Новый рекорд!</span>
          `;
          this.highScoreTagEl.style.display = 'inline-flex';
        } else {
          this.highScoreTagEl.style.display = 'none';
        }
      }

      if (kpsLabel) kpsLabel.textContent = 'Скорость';
      const roundSeconds = mode === 'blitz_30' ? 30 : 60;
      const tpm = Math.round((hits / roundSeconds) * 60);
      if (this.kpsEl) this.kpsEl.textContent = `${tpm} в мин`;

      if (this.pbLabelEl) this.pbLabelEl.textContent = 'Рекорд режима';
      if (this.pbEl) this.pbEl.textContent = currentHigh > 0 ? Number(currentHigh).toLocaleString() : '—';

      if (this.playAgainBtn) this.playAgainBtn.textContent = 'Ещё раз (Пробел)';
      if (this.goCompetitionBtn) this.goCompetitionBtn.style.display = 'none';
    }

    if (this.accuracyEl) this.accuracyEl.textContent = `${accuracy}%`;
    if (this.hitsEl) this.hitsEl.textContent = `${hits} / ${hits + misses}`;
    if (this.reactionEl) this.reactionEl.textContent = avgReactionMs > 0 ? `${avgReactionMs} мс` : '—';
    if (this.streakEl) this.streakEl.textContent = `${maxStreak}x`;

    this.renderWeakSpots(weakProblems);

    if (this.modalEl) {
      this.modalEl.classList.add('visible');
    }
  }

  hide() {
    if (this.modalEl) {
      this.modalEl.classList.remove('visible');
    }
  }

  renderWeakSpots(weakProblems) {
    if (!this.weakListEl) return;
    this.weakListEl.innerHTML = '';

    const map = new Map();
    for (const item of weakProblems || []) {
      const key = `${item.a} × ${item.b}`;
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
      this.weakListEl.innerHTML = '<li class="weak-empty">Идеальный раунд! Ни одной ошибки или заминки</li>';
      if (this.trainMistakesBtn) this.trainMistakesBtn.style.display = 'none';
      return;
    }

    if (this.trainMistakesBtn) {
      this.trainMistakesBtn.style.display = 'inline-flex';
      this.trainMistakesBtn.textContent = `Тренировать ошибки (${uniqueMistakes.length})`;
    }

    uniqueMistakes.slice(0, 6).forEach(item => {
      const li = document.createElement('li');
      li.className = 'weak-item';
      const ans = item.a * item.b;
      const statusText = item.misses > 0 ? `Промах (${item.misses})` : `Медленно (${item.reaction} мс)`;
      const statusClass = item.misses > 0 ? 'badge-miss' : 'badge-slow';

      li.innerHTML = `
        <span class="weak-eq">${item.a} × ${item.b} = <strong>${ans}</strong></span>
        <span class="weak-badge ${statusClass}">${statusText}</span>
      `;
      this.weakListEl.appendChild(li);
    });
  }

  calculateRank(accuracy, reactionMs, hits) {
    if (hits < 5) return { rank: 'C', title: 'Новобранец' };
    if (accuracy >= 95 && reactionMs > 0 && reactionMs < 450) return { rank: 'S+', title: 'Киберспортсмен' };
    if (accuracy >= 90 && reactionMs > 0 && reactionMs < 600) return { rank: 'S', title: 'Мастер таблицы' };
    if (accuracy >= 80 && reactionMs < 850) return { rank: 'A', title: 'Меткий стрелок' };
    if (accuracy >= 70) return { rank: 'B', title: 'Боец' };
    return { rank: 'C', title: 'Практикант' };
  }

  calculateDrillRank(elapsedSec, accuracy, problemCount) {
    const count = problemCount > 0 ? problemCount : 8;
    const secPerTarget = (elapsedSec || 10) / count;

    if (secPerTarget <= 0.8 && accuracy >= 95) {
      return { rank: 'S+', title: 'Бог аима', css: 'rank-s-plus' };
    }
    if (secPerTarget <= 1.25 && accuracy >= 90) {
      return { rank: 'S', title: 'Мастер таблицы', css: 'rank-s' };
    }
    if (secPerTarget <= 2.0 && accuracy >= 80) {
      return { rank: 'A', title: 'Снайпер', css: 'rank-a' };
    }
    if (secPerTarget <= 3.2) {
      return { rank: 'B', title: 'Боец', css: 'rank-b' };
    }
    return { rank: 'C', title: 'Ученик', css: 'rank-c' };
  }
}
