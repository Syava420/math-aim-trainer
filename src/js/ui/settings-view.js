/**
 * Settings View: Configuration modal for audio, target sizing, crosshair, and math filters.
 */
export class SettingsView {
  constructor({ statsStore, soundEngine, crosshairController, targetManager, mathEngine }) {
    this.stats = statsStore;
    this.sound = soundEngine;
    this.crosshair = crosshairController;
    this.targets = targetManager;
    this.math = mathEngine;

    this.modalEl = document.getElementById('settings-modal');
    this.openBtn = document.getElementById('btn-open-settings');
    this.closeBtn = document.getElementById('btn-close-settings');
    this.saveBtn = document.getElementById('btn-save-settings');

    // Controls
    this.volumeSlider = document.getElementById('setting-volume');
    this.muteToggle = document.getElementById('setting-mute');
    this.crosshairSelect = document.getElementById('setting-crosshair');
    this.targetSizeSelect = document.getElementById('setting-target-size');
    this.presetAllBtn = document.getElementById('preset-all');
    this.presetHardBtn = document.getElementById('preset-hard');
    this.multiplierContainer = document.getElementById('multiplier-toggles');
    this.checkUpdateBtn = document.getElementById('btn-check-update');
    this.updateStatusText = document.getElementById('update-status-text');

    this.bindEvents();
    this.applySettingsToApp(this.stats.settings);
  }

  bindEvents() {
    if (this.openBtn) {
      this.openBtn.addEventListener('click', () => this.show());
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.hide());
    }
    if (this.saveBtn) {
      this.saveBtn.addEventListener('click', () => {
        this.saveFromInputs();
        this.hide();
      });
    }

    if (this.volumeSlider) {
      this.volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.sound.setVolume(val);
        this.sound.playHit(1);
      });
    }

    if (this.muteToggle) {
      this.muteToggle.addEventListener('change', (e) => {
        this.sound.setMuted(e.target.checked);
      });
    }

    if (this.crosshairSelect) {
      this.crosshairSelect.addEventListener('change', (e) => {
        this.crosshair.setStyle(e.target.value);
      });
    }

    if (this.targetSizeSelect) {
      this.targetSizeSelect.addEventListener('change', (e) => {
        this.targets.setSize(e.target.value);
      });
    }

    if (this.presetAllBtn) {
      this.presetAllBtn.addEventListener('click', () => {
        this.setAllCheckboxes([2, 3, 4, 5, 6, 7, 8, 9]);
      });
    }

    if (this.presetHardBtn) {
      this.presetHardBtn.addEventListener('click', () => {
        this.setAllCheckboxes([6, 7, 8, 9]);
      });
    }

    if (this.checkUpdateBtn) {
      this.checkUpdateBtn.addEventListener('click', async () => {
        if (!this.updateStatusText) return;
        this.updateStatusText.textContent = 'Проверяем связь с сервером...';
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);
          const res = await fetch('sw.js?check=' + Date.now(), { method: 'HEAD', signal: controller.signal, cache: 'no-store' });
          clearTimeout(timeoutId);
          if (res.ok) {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) {
              await reg.update();
              this.updateStatusText.textContent = 'Связь есть (VPN активен). Если вышло обновление, появится кнопка.';
            } else {
              this.updateStatusText.textContent = 'Установлена актуальная версия.';
            }
          } else {
            this.updateStatusText.textContent = 'Сервер ответил со статусом ' + res.status;
          }
        } catch {
          this.updateStatusText.textContent = 'Сервер недоступен (VPN выкл). Игра работает из памяти.';
        }
      });
    }
  }

  show() {
    this.populateInputs(this.stats.settings);
    if (this.modalEl) this.modalEl.classList.add('visible');
  }

  hide() {
    if (this.modalEl) this.modalEl.classList.remove('visible');
  }

  populateInputs(settings) {
    if (this.volumeSlider) this.volumeSlider.value = settings.volume ?? 0.6;
    if (this.muteToggle) this.muteToggle.checked = Boolean(settings.muted);
    if (this.crosshairSelect) this.crosshairSelect.value = settings.crosshair || 'cross';
    if (this.targetSizeSelect) this.targetSizeSelect.value = settings.targetSize || 'medium';

    const mults = settings.multipliers || [2, 3, 4, 5, 6, 7, 8, 9];
    this.setAllCheckboxes(mults);
  }

  setAllCheckboxes(activeNumbers) {
    if (!this.multiplierContainer) return;
    const checkboxes = this.multiplierContainer.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      const val = parseInt(cb.value, 10);
      cb.checked = activeNumbers.includes(val);
    });
  }

  saveFromInputs() {
    const activeMultipliers = [];
    if (this.multiplierContainer) {
      const checkboxes = this.multiplierContainer.querySelectorAll('input[type="checkbox"]:checked');
      checkboxes.forEach(cb => activeMultipliers.push(parseInt(cb.value, 10)));
    }

    const newSettings = {
      volume: parseFloat(this.volumeSlider?.value ?? 0.6),
      muted: Boolean(this.muteToggle?.checked),
      crosshair: this.crosshairSelect?.value || 'cross',
      targetSize: this.targetSizeSelect?.value || 'medium',
      multipliers: activeMultipliers.length > 0 ? activeMultipliers : [2, 3, 4, 5, 6, 7, 8, 9]
    };

    this.stats.saveSettings(newSettings);
    this.applySettingsToApp(newSettings);
  }

  applySettingsToApp(settings) {
    this.sound.setVolume(settings.volume ?? 0.6);
    this.sound.setMuted(Boolean(settings.muted));
    this.crosshair.setStyle(settings.crosshair || 'cross');
    this.targets.setSize(settings.targetSize || 'medium');
    this.math.setAllowedMultipliers(settings.multipliers || [2, 3, 4, 5, 6, 7, 8, 9]);
  }
}
