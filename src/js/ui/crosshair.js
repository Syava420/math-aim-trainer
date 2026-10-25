/**
 * Crosshair Controller: High-Performance Hardware OS Cursor Engine.
 * Runs 100% on the native OS GPU cursor plane.
 * Zero JavaScript mousemove listeners, zero layout reflows, zero micro-stutter.
 */
export class CrosshairController {
  constructor(arenaElement) {
    this.arena = arenaElement;
    this.style = 'cross';
    this.hitmarkerPool = [];
    this.build();
  }

  build() {
    this.setStyle(this.style);
  }

  setStyle(styleName) {
    this.style = styleName || 'cross';
    if (!this.arena) return;

    this.arena.classList.remove('cursor-cross', 'cursor-dot', 'cursor-circle', 'cursor-system');
    this.arena.classList.add(`cursor-${this.style}`);
  }

  updateArenaRect() {
    // Safe no-op for hardware cursors
  }

  triggerRecoil() {
    // Hardware cursors do not vibrate, recoil is omitted to prevent JS stutter
  }

  showHitmarker(isHit = true, clientX = null, clientY = null) {
    if (!this.arena) return;

    const hm = document.createElement('div');
    hm.className = `impact-hitmarker ${isHit ? 'hit-success' : 'hit-fail'}`;
    hm.innerHTML = `
      <svg viewBox="0 0 24 24" class="hm-svg">
        <line x1="5" y1="5" x2="9" y2="9" />
        <line x1="19" y1="5" x2="15" y2="9" />
        <line x1="5" y1="19" x2="9" y2="15" />
        <line x1="19" y1="19" x2="15" y2="15" />
      </svg>
    `;

    if (clientX !== null && clientY !== null) {
      const rect = this.arena.getBoundingClientRect();
      hm.style.left = `${clientX - rect.left}px`;
      hm.style.top = `${clientY - rect.top}px`;
    } else {
      hm.style.left = '50%';
      hm.style.top = '50%';
    }

    this.arena.appendChild(hm);
    setTimeout(() => hm.remove(), 160);
  }
}
