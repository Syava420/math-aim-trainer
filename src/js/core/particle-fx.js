/**
 * Particle FX Engine: Canvas-based visual juice.
 * Performance-optimized: sleeps render loop when there are no active particles.
 */
export class ParticleFX {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.particles = [];
    this.floatingTexts = [];
    this.shockwaves = [];
    this.running = false;
    this.animating = false;
    this.resize();

    window.addEventListener('resize', () => this.resize(), { passive: true });
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  start() {
    this.running = true;
  }

  stop() {
    this.running = false;
    this.animating = false;
    this.particles = [];
    this.floatingTexts = [];
    this.shockwaves = [];
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  requestLoop() {
    if (!this.running || this.animating) return;
    this.animating = true;
    requestAnimationFrame(() => this.loop());
  }

  spawnHitSparks(x, y, color = '#38bdf8', count = 14) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = Math.random() * 4 + 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 2.5 + 1.5,
        alpha: 1,
        decay: Math.random() * 0.04 + 0.03,
        color
      });
    }

    this.shockwaves.push({
      x,
      y,
      radius: 10,
      maxRadius: 48,
      alpha: 0.75,
      color
    });

    this.requestLoop();
  }

  spawnFloatingText(text, x, y, color = '#ffffff', isCrit = false) {
    this.floatingTexts.push({
      text,
      x: x + (Math.random() - 0.5) * 16,
      y: y - 10,
      alpha: 1,
      vy: -1.6,
      size: isCrit ? 20 : 15,
      weight: isCrit ? 'bold' : '600',
      color
    });

    this.requestLoop();
  }

  loop() {
    if (!this.running) {
      this.animating = false;
      return;
    }

    this.update();
    this.render();

    const hasActiveFx = this.particles.length > 0 || this.shockwaves.length > 0 || this.floatingTexts.length > 0;
    if (hasActiveFx) {
      requestAnimationFrame(() => this.loop());
    } else {
      this.animating = false;
      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }

  update() {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.93;
      p.vy *= 0.93;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += 2.6;
      sw.alpha = 1 - sw.radius / sw.maxRadius;
      if (sw.radius >= sw.maxRadius || sw.alpha <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    // Update floating text
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.025;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  render() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw shockwaves
    for (const sw of this.shockwaves) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = sw.color;
      this.ctx.globalAlpha = Math.max(0, sw.alpha);
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      this.ctx.restore();
    }

    // Draw particles
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fill();
      this.ctx.restore();
    }

    // Draw floating texts
    for (const ft of this.floatingTexts) {
      this.ctx.save();
      this.ctx.font = `${ft.weight} ${ft.size}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      this.ctx.fillStyle = ft.color;
      this.ctx.textAlign = 'center';
      this.ctx.globalAlpha = Math.max(0, ft.alpha);
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      this.ctx.shadowBlur = 3;
      this.ctx.fillText(ft.text, ft.x, ft.y);
      this.ctx.restore();
    }
  }
}
