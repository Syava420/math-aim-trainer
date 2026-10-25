/**
 * Crosshair Controller: Handles custom mouse reticle, recoil animation, and hitmarker feedback.
 * Performance-optimized: zero layout thrashing on mousemove.
 */
export class CrosshairController {
  constructor(arenaElement) {
    this.arena = arenaElement;
    this.element = null;
    this.hitmarker = null;
    this.style = 'cross';
    this.active = false;
    this.rectLeft = 0;
    this.rectTop = 0;
    this.build();
    this.bindEvents();
  }

  build() {
    this.element = document.createElement('div');
    this.element.className = 'custom-crosshair crosshair-cross';
    this.element.innerHTML = `
      <div class="ch-part ch-top"></div>
      <div class="ch-part ch-bottom"></div>
      <div class="ch-part ch-left"></div>
      <div class="ch-part ch-right"></div>
      <div class="ch-center"></div>
      <div class="hitmarker">
        <svg viewBox="0 0 24 24" class="hm-svg">
          <line x1="5" y1="5" x2="9" y2="9" />
          <line x1="19" y1="5" x2="15" y2="9" />
          <line x1="5" y1="19" x2="9" y2="15" />
          <line x1="19" y1="19" x2="15" y2="15" />
        </svg>
      </div>
    `;
    this.hitmarker = this.element.querySelector('.hitmarker');
    this.arena.appendChild(this.element);
  }

  updateArenaRect() {
    if (!this.arena) return;
    const rect = this.arena.getBoundingClientRect();
    this.rectLeft = rect.left;
    this.rectTop = rect.top;
  }

  bindEvents() {
    this.updateArenaRect();
    window.addEventListener('resize', () => this.updateArenaRect(), { passive: true });
    window.addEventListener('scroll', () => this.updateArenaRect(), { passive: true });

    this.arena.addEventListener('mouseenter', () => {
      this.updateArenaRect();
      if (this.style !== 'system') {
        this.element.style.display = 'block';
      }
    });

    this.arena.addEventListener('mouseleave', () => {
      this.element.style.display = 'none';
    });

    // Zero getBoundingClientRect during mouse movement
    this.arena.addEventListener('mousemove', (e) => {
      const x = e.clientX - this.rectLeft;
      const y = e.clientY - this.rectTop;
      this.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }, { passive: true });
  }

  setStyle(styleName) {
    this.style = styleName || 'cross';
    this.element.className = `custom-crosshair crosshair-${this.style}`;
    if (this.style === 'system') {
      this.element.style.display = 'none';
    } else {
      this.element.style.display = 'block';
    }
  }

  triggerRecoil() {
    this.element.classList.remove('recoil');
    void this.element.offsetWidth;
    this.element.classList.add('recoil');
  }

  showHitmarker(isHit = true) {
    if (!this.hitmarker) return;
    this.hitmarker.classList.remove('active', 'hit-success', 'hit-fail');
    void this.hitmarker.offsetWidth;
    this.hitmarker.classList.add('active', isHit ? 'hit-success' : 'hit-fail');

    setTimeout(() => {
      this.hitmarker.classList.remove('active');
    }, 180);
  }
}
