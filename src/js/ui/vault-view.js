/**
 * Vault View: Manages and drills the persistent Hard Problems Database.
 */
export class VaultView {
  constructor({ statsStore, onStartVaultDrill }) {
    this.stats = statsStore;
    this.onStartVaultDrill = onStartVaultDrill;

    this.modalEl = document.getElementById('vault-modal');
    this.closeBtn = document.getElementById('btn-close-vault');
    this.listContainer = document.getElementById('vault-items-list');
    this.startDrillBtn = document.getElementById('btn-start-vault-drill');
    this.clearAllBtn = document.getElementById('btn-clear-vault');
    this.counterBadge = document.getElementById('vault-count-badge');

    this.bindEvents();
  }

  bindEvents() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.hide());
    }

    const openBtns = document.querySelectorAll('[data-open-vault]');
    openBtns.forEach(btn => btn.addEventListener('click', () => this.show()));

    if (this.startDrillBtn) {
      this.startDrillBtn.addEventListener('click', () => {
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
      this.clearAllBtn.addEventListener('click', () => {
        if (confirm('Очистить всю базу сложных примеров?')) {
          this.stats.clearVault();
          this.render();
          window.dispatchEvent(new CustomEvent('vault-updated'));
        }
      });
    }

    window.addEventListener('vault-updated', () => {
      this.updateCounter();
      if (this.modalEl && this.modalEl.classList.contains('visible')) {
        this.render();
      }
    });
  }

  updateCounter() {
    const count = this.stats.getVaultCount();
    if (this.counterBadge) {
      this.counterBadge.textContent = count;
      this.counterBadge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  }

  show() {
    this.render();
    if (this.modalEl) this.modalEl.classList.add('visible');
  }

  hide() {
    if (this.modalEl) this.modalEl.classList.remove('visible');
  }

  render() {
    this.updateCounter();
    const list = this.stats.getVaultList();

    if (!this.listContainer) return;
    this.listContainer.innerHTML = '';

    if (list.length === 0) {
      this.listContainer.innerHTML = `
        <div class="vault-empty-state">
          <div style="font-size: 32px; margin-bottom: 8px;">🎯</div>
          <div style="font-weight: 700; color: #fff; margin-bottom: 4px;">База сложных пуста!</div>
          <div style="font-size: 13px; color: #94a3b8; max-width: 320px; margin: 0 auto;">
            Примеры, где ты спотыкаешься в раундах, попадают сюда автоматически. Также можно отметить любой пример через «Урок изучения».
          </div>
        </div>
      `;
      if (this.startDrillBtn) this.startDrillBtn.disabled = true;
      if (this.clearAllBtn) this.clearAllBtn.style.display = 'none';
      return;
    }

    if (this.startDrillBtn) this.startDrillBtn.disabled = false;
    if (this.clearAllBtn) this.clearAllBtn.style.display = 'inline-flex';

    list.forEach(item => {
      const card = document.createElement('div');
      card.className = 'vault-item-card';
      const reasonTag = item.misses > 0 
        ? `<span class="vault-tag tag-miss">Промахов: ${item.misses}</span>`
        : `<span class="vault-tag tag-manual">В ручную</span>`;

      card.innerHTML = `
        <div class="vault-item-info">
          <span class="vault-item-eq">${item.a} × ${item.b} = <strong>${item.answer}</strong></span>
          ${reasonTag}
        </div>
        <button class="btn-icon vault-delete-btn" title="Удалить из сложных">✕</button>
      `;

      card.querySelector('.vault-delete-btn').addEventListener('click', () => {
        this.stats.removeFromVault(item.a, item.b);
        this.render();
        window.dispatchEvent(new CustomEvent('vault-updated'));
      });

      this.listContainer.appendChild(card);
    });
  }
}
