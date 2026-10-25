import { MathEngine } from './core/math-engine.js';
import { SoundEngine } from './core/sound-engine.js';
import { ParticleFX } from './core/particle-fx.js';
import { StatsStore } from './core/stats-store.js';
import { TargetManager } from './game/target-manager.js';
import { GameController } from './game/game-controller.js';
import { HudView } from './ui/hud-view.js';
import { CrosshairController } from './ui/crosshair.js';
import { ResultsView } from './ui/results-view.js';
import { SettingsView } from './ui/settings-view.js';
import { StudyView } from './ui/study-view.js';
import { VaultView } from './ui/vault-view.js';
import { TrainingModal } from './ui/training-modal.js';

class App {
  constructor() {
    this.screenMenu = document.getElementById('screen-menu');
    this.screenArena = document.getElementById('screen-arena');
    this.arenaEl = document.getElementById('arena');
    this.fxCanvas = document.getElementById('fx-canvas');

    // Menu badges
    this.menuHighScoreEl = document.getElementById('menu-highscore');
    this.vaultCountBadge = document.getElementById('vault-count-badge');

    this.init();
  }

  init() {
    // Core systems
    this.stats = new StatsStore();
    this.sound = new SoundEngine();
    this.math = new MathEngine({ allowedMultipliers: this.stats.settings.multipliers });
    this.fx = new ParticleFX(this.fxCanvas);
    this.hud = new HudView();
    this.crosshair = new CrosshairController(this.arenaEl);

    // Target Manager
    this.targets = new TargetManager(this.arenaEl, (targetData) => {
      this.game.handleTargetClick(targetData);
    });

    // Game Controller
    this.game = new GameController({
      mathEngine: this.math,
      soundEngine: this.sound,
      particleFx: this.fx,
      statsStore: this.stats,
      targetManager: this.targets,
      hudView: this.hud,
      crosshair: this.crosshair
    });

    // Results Modal View
    this.results = new ResultsView({
      onPlayAgain: () => {
        this.startMatch(this.game.mode, this.game.overridePool, this.game.drillId);
      },
      onTrainMistakes: (mistakes) => {
        this.startMatch('drill', mistakes.map(m => ({ a: m.a, b: m.b })), 'drill_vault');
      },
      onStartCompetition: () => {
        this.startMatch('gridshot_60');
      },
      onReturnMenu: () => {
        this.showMenu();
      }
    });

    this.game.onGameOverCallback = (summary) => {
      this.results.show(summary);
      this.updateMenuStats();
      window.dispatchEvent(new CustomEvent('vault-updated'));
    };

    // Settings Modal View
    this.settingsView = new SettingsView({
      statsStore: this.stats,
      soundEngine: this.sound,
      crosshairController: this.crosshair,
      targetManager: this.targets,
      mathEngine: this.math
    });

    // Study Matrix View (Урок изучения)
    this.studyView = new StudyView({
      statsStore: this.stats,
      onPracticeProblem: (a, b) => {
        this.startMatch('drill', [{ a, b }]);
      }
    });

    // Hard Vault View (База сложных)
    this.vaultView = new VaultView({
      statsStore: this.stats,
      onStartVaultDrill: (vaultList) => {
        this.startMatch('drill', vaultList.map(item => ({ a: item.a, b: item.b })), 'drill_vault');
      }
    });

    // Progressive Training Selector Modal
    this.trainingModal = new TrainingModal({
      statsStore: this.stats,
      onStartDrill: (pool, drillId) => {
        this.startMatch('drill', pool, drillId);
      }
    });

    this.bindArenaEvents();
    this.bindMenuEvents();
    this.updateMenuStats();
  }

  bindArenaEvents() {
    this.arenaEl.addEventListener('mousedown', (e) => {
      if (e.target === this.arenaEl || e.target === this.fxCanvas) {
        const rect = this.arenaEl.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.game.handleMissClick(x, y);
      }
    });

    const quitBtn = document.getElementById('btn-quit-game');
    if (quitBtn) {
      quitBtn.addEventListener('click', () => {
        this.game.stop();
        this.showMenu();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.results.modalEl.classList.contains('visible')) {
        e.preventDefault();
        this.results.hide();
        this.startMatch(this.game.mode, this.game.overridePool, this.game.drillId);
      } else if (e.code === 'Escape') {
        if (this.game.state === 'PLAYING') {
          this.game.stop();
          this.showMenu();
        }
      }
    });
  }

  bindMenuEvents() {
    const modeButtons = document.querySelectorAll('[data-mode]');
    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        this.startMatch(mode);
      });
    });
  }

  updateMenuStats() {
    const high = this.stats.getHighScore('gridshot_60');
    if (this.menuHighScoreEl) {
      this.menuHighScoreEl.textContent = high > 0 ? Number(high).toLocaleString() : '—';
    }

    const count = this.stats.getVaultCount();
    if (this.vaultCountBadge) {
      this.vaultCountBadge.textContent = count;
      this.vaultCountBadge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  }

  startMatch(mode, overridePool = null, drillId = null) {
    this.screenMenu.classList.remove('active');
    this.screenArena.classList.add('active');
    this.fx.resize();

    this.game.setMode(mode);
    this.game.overridePool = overridePool;
    this.game.drillId = drillId || (mode === 'drill' ? (this.game.drillId || 'drill_all') : null);

    this.game.startCountdown(() => {
      // Countdown finished
    });
  }

  showMenu() {
    this.screenArena.classList.remove('active');
    this.screenMenu.classList.add('active');
    this.updateMenuStats();
  }
}

// Boot application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new App();

  // Register Service Worker for offline PWA gameplay
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Offline Service Worker registration failed:', err);
    });
  }
});
