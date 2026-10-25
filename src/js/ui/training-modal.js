/**
 * Training Modal: Selector for single-table drill or full-table elimination mode.
 * Allows picking specific multipliers (e.g. "Только на 4") with progressive knockout logic.
 */
export class TrainingModal {
  constructor({ statsStore, onStartDrill }) {
    this.stats = statsStore;
    this.onStartDrill = onStartDrill;

    this.modalEl = document.getElementById('training-modal');
    this.closeBtn = document.getElementById('btn-close-training');
    this.pillContainer = document.getElementById('training-number-pills');
    this.startBtn = document.getElementById('btn-start-training-drill');
    this.selectedChoice = 'all'; // 'all', 2, 3, 4, 5, 6, 7, 8, 9, or 'vault'

    this.bindEvents();
  }

  bindEvents() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.hide());
    }

    const openBtns = document.querySelectorAll('[data-open-training]');
    openBtns.forEach(btn => btn.addEventListener('click', () => this.show()));

    if (this.startBtn) {
      this.startBtn.addEventListener('click', () => {
        this.hide();
        this.launchSelectedDrill();
      });
    }
  }

  show() {
    this.renderPills();
    if (this.modalEl) this.modalEl.classList.add('visible');
  }

  hide() {
    if (this.modalEl) this.modalEl.classList.remove('visible');
  }

  renderPills() {
    if (!this.pillContainer) return;
    this.pillContainer.innerHTML = '';

    const options = [
      { id: 'all', label: 'Вся таблица (2–9)', desc: '36 комбинаций' },
      { id: 2, label: 'Только на 2', desc: '8 примеров' },
      { id: 3, label: 'Только на 3', desc: '8 примеров' },
      { id: 4, label: 'Только на 4', desc: '8 примеров' },
      { id: 5, label: 'Только на 5', desc: '8 примеров' },
      { id: 6, label: 'Только на 6', desc: '8 примеров' },
      { id: 7, label: 'Только на 7', desc: '8 примеров' },
      { id: 8, label: 'Только на 8', desc: '8 примеров' },
      { id: 9, label: 'Только на 9', desc: '8 примеров' },
      { id: 'vault', label: 'База сложных', desc: `${this.stats.getVaultCount()} примеров` }
    ];

    options.forEach(opt => {
      const btn = document.createElement('button');
      const isSelected = this.selectedChoice === opt.id;
      btn.className = `training-pill ${isSelected ? 'active' : ''}`;
      btn.innerHTML = `
        <span class="pill-title">${opt.label}</span>
        <span class="pill-desc">${opt.desc}</span>
      `;

      btn.addEventListener('click', () => {
        this.selectedChoice = opt.id;
        this.renderPills();
      });

      this.pillContainer.appendChild(btn);
    });
  }

  launchSelectedDrill() {
    let pool = [];

    if (this.selectedChoice === 'vault') {
      const list = this.stats.getVaultList();
      if (list.length === 0) {
        alert('В базе сложных пока пусто! Выберите конкретное число или сыграйте раунд.');
        return;
      }
      pool = list.map(item => ({ a: item.a, b: item.b }));
    } else if (typeof this.selectedChoice === 'number') {
      const n = this.selectedChoice;
      for (let b = 2; b <= 9; b++) {
        pool.push({ a: n, b });
      }
    } else {
      // 'all'
      for (let a = 2; a <= 9; a++) {
        for (let b = a; b <= 9; b++) {
          pool.push({ a, b });
        }
      }
    }

    if (this.onStartDrill) {
      const drillId = typeof this.selectedChoice === 'number'
        ? `drill_${this.selectedChoice}`
        : (this.selectedChoice === 'vault' ? 'drill_vault' : 'drill_all');
      this.onStartDrill(pool, drillId);
    }
  }
}
