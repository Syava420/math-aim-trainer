/**
 * Study View: Interactive Multiplication Matrix & Spaced Repetition Heatmap.
 * Visualizes table mastery (Green = Mastered, Yellow = Learning, Red = Needs Practice).
 */
export class StudyView {
  constructor({ statsStore, onPracticeProblem }) {
    this.stats = statsStore;
    this.onPracticeProblem = onPracticeProblem;

    this.modalEl = document.getElementById('study-modal');
    this.closeBtn = document.getElementById('btn-close-study');
    this.tableContainer = document.getElementById('study-matrix-container');
    this.filterButtonsContainer = document.getElementById('study-filter-buttons');
    this.detailBox = document.getElementById('study-detail-box');
    this.progressContainer = document.getElementById('study-progress-container');

    this.activeMultiplier = null;
    this.onlyUnlearned = false;
    this.bindEvents();
  }

  bindEvents() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.hide());
    }

    const openBtns = document.querySelectorAll('[data-open-study]');
    openBtns.forEach(btn => btn.addEventListener('click', () => this.show()));
  }

  show() {
    this.render();
    if (this.modalEl) this.modalEl.classList.add('visible');
  }

  hide() {
    if (this.modalEl) this.modalEl.classList.remove('visible');
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
          <span class="mastery-title">Общий прогресс таблицы умножения: <strong>${stats.overallPercent}%</strong></span>
          <span class="mastery-counts">
            <span class="stat-dot dot-green"></span> ${stats.masteredCount} выучено
            <span class="stat-dot dot-amber"></span> ${stats.learningCount} в процессе
            <span class="stat-dot dot-rose"></span> ${stats.weakCount} сложных
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
    this.filterButtonsContainer.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.className = `btn btn-secondary ${this.activeMultiplier === null && !this.onlyUnlearned ? 'active' : ''}`;
    allBtn.style.padding = '5px 11px';
    allBtn.style.fontSize = '12px';
    allBtn.textContent = 'Вся таблица';
    allBtn.addEventListener('click', () => {
      this.activeMultiplier = null;
      this.onlyUnlearned = false;
      this.render();
    });
    this.filterButtonsContainer.appendChild(allBtn);

    const unlearnedBtn = document.createElement('button');
    unlearnedBtn.className = `btn btn-secondary ${this.onlyUnlearned ? 'active' : ''}`;
    unlearnedBtn.style.padding = '5px 11px';
    unlearnedBtn.style.fontSize = '12px';
    unlearnedBtn.textContent = 'Только сложные';
    unlearnedBtn.addEventListener('click', () => {
      this.onlyUnlearned = !this.onlyUnlearned;
      this.render();
    });
    this.filterButtonsContainer.appendChild(unlearnedBtn);

    for (let i = 2; i <= 9; i++) {
      const btn = document.createElement('button');
      btn.className = `btn btn-secondary ${this.activeMultiplier === i && !this.onlyUnlearned ? 'active' : ''}`;
      btn.style.padding = '5px 10px';
      btn.style.fontSize = '12px';
      btn.textContent = `× ${i}`;
      btn.addEventListener('click', () => {
        this.activeMultiplier = i;
        this.onlyUnlearned = false;
        this.render();
      });
      this.filterButtonsContainer.appendChild(btn);
    }
  }

  renderMatrix() {
    if (!this.tableContainer) return;
    this.tableContainer.innerHTML = '';

    const table = document.createElement('table');
    table.className = 'study-matrix';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    headRow.innerHTML = '<th class="matrix-corner">×</th>';

    const range = [2, 3, 4, 5, 6, 7, 8, 9];
    range.forEach(col => {
      const th = document.createElement('th');
      th.className = 'matrix-header';
      th.textContent = col;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const rows = this.activeMultiplier ? [this.activeMultiplier] : range;

    rows.forEach(r => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.className = 'matrix-row-header';
      th.textContent = r;
      tr.appendChild(th);

      range.forEach(c => {
        const td = document.createElement('td');
        const prod = r * c;
        const mastery = this.stats.getMastery(r, c);
        const inVault = this.stats.isInVault(r, c);

        if (this.onlyUnlearned && mastery.status === 'mastered') {
          td.className = 'matrix-cell cell-muted';
          td.innerHTML = `<span class="cell-prod" style="opacity: 0.25;">${prod}</span>`;
        } else {
          td.className = `matrix-cell status-${mastery.status} ${inVault ? 'is-vault' : ''}`;
          td.innerHTML = `
            <span class="cell-prod">${prod}</span>
            <span class="cell-status-indicator"></span>
          `;
          td.addEventListener('click', () => this.showDetail(r, c));
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

    let statusText = 'Не встречался';
    if (mastery.status === 'mastered') statusText = 'Выучено на отлично';
    else if (mastery.status === 'learning') statusText = 'В процессе запоминания';
    else if (mastery.status === 'weak') statusText = 'Требует отработки';

    this.detailBox.innerHTML = `
      <div class="study-detail-content">
        <div class="study-detail-left">
          <div class="study-detail-eq">
            <span class="eq-factors">${a} × ${b} =</span>
            <span class="eq-ans">${ans}</span>
          </div>
          <div class="study-detail-sub">
            <span class="badge-status status-${mastery.status}">${statusText} (${mastery.score}%)</span>
          </div>
        </div>

        <div class="study-detail-actions">
          <button id="btn-toggle-hard-star" class="btn ${inVault ? 'btn-danger' : 'btn-secondary'}" style="padding: 7px 14px; font-size: 13px;">
            ${inVault ? 'Удалить из сложных' : '+ В базу сложных'}
          </button>
        </div>
      </div>
    `;

    const starBtn = document.getElementById('btn-toggle-hard-star');
    if (starBtn) {
      starBtn.addEventListener('click', () => {
        this.stats.toggleVault(a, b);
        this.showDetail(a, b);
        this.render();
        window.dispatchEvent(new CustomEvent('vault-updated'));
      });
    }
  }
}
