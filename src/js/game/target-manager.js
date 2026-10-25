/**
 * Target Manager: Spawns, positions, and animates clickable targets in the arena.
 * Uses adaptive clustering so fewer targets are grouped closer together for satisfying flicks.
 */
export class TargetManager {
  constructor(arenaElement, onTargetClick) {
    this.arena = arenaElement;
    this.onTargetClick = onTargetClick;
    this.targets = [];
    this.targetSize = 84;
    this.sizeKey = 'medium';
  }

  setSize(sizeKey) {
    this.sizeKey = sizeKey;
    switch (sizeKey) {
      case 'small':
        this.targetSize = 68;
        break;
      case 'large':
        this.targetSize = 102;
        break;
      case 'medium':
      default:
        this.targetSize = 84;
        break;
    }
  }

  clear() {
    for (const t of this.targets) {
      if (t.element && t.element.parentElement) {
        t.element.remove();
      }
    }
    this.targets = [];
  }

  /**
   * Spawns targets with adaptive clustering.
   * @param {Array<number>} values List of numbers to display on targets
   * @param {number} correctAnswer The single correct answer
   */
  spawnTargets(values, correctAnswer) {
    this.clear();
    const positions = this.calculateClusteredPositions(values.length);

    values.forEach((val, idx) => {
      const pos = positions[idx];
      const isCorrect = val === correctAnswer;
      const el = document.createElement('div');
      el.className = `math-target size-${this.sizeKey}`;
      el.style.width = `${this.targetSize}px`;
      el.style.height = `${this.targetSize}px`;
      el.style.left = `${pos.x}px`;
      el.style.top = `${pos.y}px`;

      el.innerHTML = `<span class="target-val">${val}</span>`;

      el.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        this.onTargetClick({
          value: val,
          isCorrect,
          x: centerX,
          y: centerY,
          targetEl: el
        });
      });

      this.arena.appendChild(el);
      this.targets.push({ element: el, value: val, isCorrect, x: pos.x, y: pos.y });
    });
  }

  /**
   * Calculates target positions within a clustered zone.
   * Fewer targets => tighter spread around a localized focal point.
   */
  calculateClusteredPositions(count) {
    const rect = this.arena.getBoundingClientRect();
    const arenaW = rect.width || 1200;
    const arenaH = rect.height || 700;

    // Spread factor scales with target count (2 => 0.38, 3 => 0.52, 4 => 0.65)
    let spreadScale = 0.38;
    if (count === 3) spreadScale = 0.52;
    else if (count >= 4) spreadScale = 0.68;

    const clusterW = Math.max(this.targetSize * 2.5, arenaW * spreadScale);
    const clusterH = Math.max(this.targetSize * 2.5, arenaH * spreadScale);

    // Pick a cluster center point inside safe margin
    const marginX = this.targetSize + 30;
    const marginY = this.targetSize + 30;
    const maxCenterX = arenaW - marginX - clusterW / 2;
    const minCenterX = marginX + clusterW / 2;
    const maxCenterY = arenaH - marginY - clusterH / 2;
    const minCenterY = marginY + clusterH / 2;

    const centerX = Math.random() * Math.max(20, maxCenterX - minCenterX) + minCenterX;
    const centerY = Math.random() * Math.max(20, maxCenterY - minCenterY) + minCenterY;

    // Calculate cluster bounding limits
    const minX = Math.max(marginX, centerX - clusterW / 2);
    const maxX = Math.min(arenaW - this.targetSize - marginX, centerX + clusterW / 2 - this.targetSize);
    const minY = Math.max(marginY, centerY - clusterH / 2);
    const maxY = Math.min(arenaH - this.targetSize - marginY, centerY + clusterH / 2 - this.targetSize);

    const positions = [];
    const minDistance = this.targetSize * 1.18;

    for (let i = 0; i < count; i++) {
      let bestPos = { x: minX, y: minY };
      let found = false;

      for (let attempt = 0; attempt < 80; attempt++) {
        const candidate = {
          x: Math.floor(Math.random() * Math.max(1, maxX - minX)) + minX,
          y: Math.floor(Math.random() * Math.max(1, maxY - minY)) + minY
        };

        const hasOverlap = positions.some(p => {
          const dx = (candidate.x + this.targetSize / 2) - (p.x + this.targetSize / 2);
          const dy = (candidate.y + this.targetSize / 2) - (p.y + this.targetSize / 2);
          return Math.hypot(dx, dy) < minDistance;
        });

        if (!hasOverlap) {
          bestPos = candidate;
          found = true;
          break;
        }
      }

      if (!found) {
        // Fallback staggered circular offset around center
        const angle = (Math.PI * 2 * i) / count;
        const radius = this.targetSize * 1.15;
        bestPos = {
          x: Math.min(maxX, Math.max(minX, centerX + Math.cos(angle) * radius - this.targetSize / 2)),
          y: Math.min(maxY, Math.max(minY, centerY + Math.sin(angle) * radius - this.targetSize / 2))
        };
      }

      positions.push(bestPos);
    }

    return positions;
  }
}
