/**
 * Particle FX Engine: Canvas-based visual juice.
 * Sparks, expanding shockwaves, floating combat text, screen shake.
 */
export class ParticleFX {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.particles = [];
    this.floatingTexts = [];
    this.shockwaves = [];
    this.running = false;
    this.resize();

    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  stop() {
    this.running = false;
    this.particles = [];
    this.floatingTexts = [];
    this.shockwaves = [];
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  spawnHitSparks(x, y, color = '#38bdf8', count = 16) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = Math.random() * 4.5 + 2.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 2,
        alpha: 1,
        decay: Math.random() * 0.03 + 0.02,
        color
      });
    }

    // Expanding shockwave ring
    this.shockwaves.push({
      x,
      y,
      radius: 12,
      maxRadius: 55,
      alpha: 0.8,
      color
    });
  }

  spawnFloatingText(text, x, y, color = '#ffffff', isCrit = false) {
    this.floatingTexts.push({
      text,
      x: x + (Math.random() - 0.5) * 20,
      y: y - 10,
      alpha: 1,
      vy: -1.8,
      size: isCrit ? 22 : 16,
      weight: isCrit ? 'bold' : '600',
      color
    });
  }

  loop() {
    if (!this.running) return;
    this.update();
    this.render();
    requestAnimationFrame(() => this.loop());
  }

  update() {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += 2.8;
      sw.alpha = 1 - sw.radius / sw.maxRadius;
      if (sw.radius >= sw.maxRadius || sw.alpha <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    // Update floating text
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.022;
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
      this.ctx.lineWidth = 2.5;
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
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      this.ctx.shadowBlur = 4;
      this.ctx.fillText(ft.text, ft.x, ft.y);
      this.ctx.restore();
    }
  }
}
