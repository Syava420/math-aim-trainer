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

class App {
  constructor() {
    this.screenMenu = document.getElementById('screen-menu');
    this.screenArena = document.getElementById('screen-arena');
    this.arenaEl = document.getElementById('arena');
    this.fxCanvas = document.getElementById('fx-canvas');

    // High score HUD badge on menu
    this.menuHighScoreEl = document.getElementById('menu-highscore');
    this.menuWeakSpotsBtn = document.getElementById('btn-menu-weak-spots');

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
        this.startMatch(this.game.mode);
      },
      onTrainMistakes: (mistakes) => {
        this.startMatch('practice', mistakes);
      },
      onReturnMenu: () => {
        this.showMenu();
      }
    });

    this.game.onGameOverCallback = (summary) => {
      this.results.show(summary);
      this.updateMenuStats();
    };

    // Settings Modal View
    this.settingsView = new SettingsView({
      statsStore: this.stats,
      soundEngine: this.sound,
      crosshairController: this.crosshair,
      targetManager: this.targets,
      mathEngine: this.math
    });

    this.bindArenaEvents();
    this.bindMenuEvents();
    this.updateMenuStats();
  }

  bindArenaEvents() {
    // Click on empty arena counts as a miss
    this.arenaEl.addEventListener('mousedown', (e) => {
      if (e.target === this.arenaEl || e.target === this.fxCanvas) {
        const rect = this.arenaEl.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.game.handleMissClick(x, y);
      }
    });

    // Exit arena button
    const quitBtn = document.getElementById('btn-quit-game');
    if (quitBtn) {
      quitBtn.addEventListener('click', () => {
        this.game.stop();
        this.showMenu();
      });
    }

    // Spacebar to restart when results are open
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.results.modalEl.classList.contains('visible')) {
        e.preventDefault();
        this.results.hide();
        this.startMatch(this.game.mode);
      } else if (e.code === 'Escape') {
        if (this.game.state === 'PLAYING') {
          this.game.stop();
          this.showMenu();
        }
      }
    });
  }

  bindMenuEvents() {
    // Mode selection buttons
    const modeButtons = document.querySelectorAll('[data-mode]');
    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        this.startMatch(mode);
      });
    });

    if (this.menuWeakSpotsBtn) {
      this.menuWeakSpotsBtn.addEventListener('click', () => {
        const weak = this.stats.getTopWeakProblems(8);
        if (weak.length > 0) {
          this.startMatch('practice', weak);
        } else {
          alert('Слабых мест пока нет! Сыграйте раунд, чтобы система выявила сложные примеры.');
        }
      });
    }
  }

  updateMenuStats() {
    const high = this.stats.getHighScore('gridshot_60');
    if (this.menuHighScoreEl) {
      this.menuHighScoreEl.textContent = high > 0 ? Number(high).toLocaleString() : '—';
    }

    const weak = this.stats.getTopWeakProblems(1);
    if (this.menuWeakSpotsBtn) {
      this.menuWeakSpotsBtn.style.display = weak.length > 0 ? 'inline-flex' : 'none';
    }
  }

  startMatch(mode, overridePool = null) {
    this.screenMenu.classList.remove('active');
    this.screenArena.classList.add('active');
    this.fx.resize();

    this.game.setMode(mode);
    this.game.startCountdown(() => {
      // Countdown finished, playing begins
    });

    if (overridePool) {
      this.game.overridePool = overridePool;
    }
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
});
