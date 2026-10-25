/**
 * Study View: Interactive Multiplication Matrix & Quick Lesson.
 * Allows quick lookup, factor inspection, and starring to the Hard Vault.
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

    this.activeMultiplier = null; // null for full matrix, or 2..9 for single table focus
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
    this.renderFilters();
    this.renderMatrix();
    this.showDetail(7, 8); // default selection
  }

  renderFilters() {
    if (!this.filterButtonsContainer) return;
    this.filterButtonsContainer.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.className = `btn btn-secondary ${this.activeMultiplier === null ? 'active' : ''}`;
    allBtn.style.padding = '6px 12px';
    allBtn.style.fontSize = '13px';
    allBtn.textContent = 'Вся таблица';
    allBtn.addEventListener('click', () => {
      this.activeMultiplier = null;
      this.render();
    });
    this.filterButtonsContainer.appendChild(allBtn);

    for (let i = 2; i <= 9; i++) {
      const btn = document.createElement('button');
      btn.className = `btn btn-secondary ${this.activeMultiplier === i ? 'active' : ''}`;
      btn.style.padding = '6px 12px';
      btn.style.fontSize = '13px';
      btn.textContent = `× ${i}`;
      btn.addEventListener('click', () => {
        this.activeMultiplier = i;
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

    // Header row
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

    // Rows
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
        const isHard = this.stats.isInVault(r, c);

        td.className = `matrix-cell ${isHard ? 'is-hard' : ''}`;
        td.innerHTML = `
          <span class="cell-prod">${prod}</span>
          ${isHard ? '<span class="cell-star">★</span>' : ''}
        `;

        td.addEventListener('click', () => {
          this.showDetail(r, c);
        });

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
    const isHard = this.stats.isInVault(a, b);

    this.detailBox.innerHTML = `
      <div class="study-detail-content">
        <div class="study-detail-eq">
          <span class="eq-factors">${a} × ${b} =</span>
          <span class="eq-ans">${ans}</span>
        </div>
        <div class="study-detail-actions">
          <button id="btn-toggle-hard-star" class="btn ${isHard ? 'btn-danger' : 'btn-secondary'}" style="padding: 8px 16px; font-size: 13px;">
            ${isHard ? '★ В базе сложных (Удалить)' : '☆ Добавить в сложные'}
          </button>
        </div>
      </div>
    `;

    const starBtn = document.getElementById('btn-toggle-hard-star');
    if (starBtn) {
      starBtn.addEventListener('click', () => {
        this.stats.toggleVault(a, b);
        this.showDetail(a, b);
        this.renderMatrix();
        window.dispatchEvent(new CustomEvent('vault-updated'));
      });
    }
  }
}
