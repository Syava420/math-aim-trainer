/**
 * Target Manager: Spawns, positions, and animates clickable targets in the arena.
 * Ensures zero overlap and optimal tactical layout.
 */
export class TargetManager {
  constructor(arenaElement, onTargetClick) {
    this.arena = arenaElement;
    this.onTargetClick = onTargetClick;
    this.targets = [];
    this.targetSize = 86; // px diameter
    this.sizeKey = 'medium';
  }

  setSize(sizeKey) {
    this.sizeKey = sizeKey;
    switch (sizeKey) {
      case 'small':
        this.targetSize = 68;
        break;
      case 'large':
        this.targetSize = 104;
        break;
      case 'medium':
      default:
        this.targetSize = 86;
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
   * Spawns targets corresponding to choices for the current problem.
   * @param {Array<number>} values List of numbers to display on targets
   * @param {number} correctAnswer The single correct answer
   */
  spawnTargets(values, correctAnswer) {
    this.clear();
    const positions = this.calculateNonOverlappingPositions(values.length);

    values.forEach((val, idx) => {
      const pos = positions[idx];
      const isCorrect = val === correctAnswer;
      const el = document.createElement('div');
      el.className = `math-target size-${this.sizeKey}`;
      el.style.width = `${this.targetSize}px`;
      el.style.height = `${this.targetSize}px`;
      el.style.left = `${pos.x}px`;
      el.style.top = `${pos.y}px`;

      el.innerHTML = `
        <div class="target-glow"></div>
        <div class="target-ring"></div>
        <span class="target-val">${val}</span>
      `;

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
   * Relocates a target to a fresh position (used in Gridshot continuous flow).
   */
  relocateTarget(targetEl, newValue, isCorrect) {
    const existingPositions = this.targets
      .filter(t => t.element !== targetEl)
      .map(t => ({ x: t.x, y: t.y }));

    const pos = this.findFreePosition(existingPositions);
    targetEl.style.left = `${pos.x}px`;
    targetEl.style.top = `${pos.y}px`;
    targetEl.classList.remove('popping', 'error-shake');

    const valSpan = targetEl.querySelector('.target-val');
    if (valSpan) valSpan.textContent = newValue;

    const targetObj = this.targets.find(t => t.element === targetEl);
    if (targetObj) {
      targetObj.x = pos.x;
      targetObj.y = pos.y;
      targetObj.value = newValue;
      targetObj.isCorrect = isCorrect;
    }

    // Force pop-in animation
    void targetEl.offsetWidth;
    targetEl.classList.add('pop-in');
  }

  calculateNonOverlappingPositions(count) {
    const positions = [];
    for (let i = 0; i < count; i++) {
      positions.push(this.findFreePosition(positions));
    }
    return positions;
  }

  findFreePosition(existingPositions) {
    const rect = this.arena.getBoundingClientRect();
    const pad = 24;
    const minX = pad;
    const maxX = Math.max(minX + 20, rect.width - this.targetSize - pad);
    const minY = pad;
    const maxY = Math.max(minY + 20, rect.height - this.targetSize - pad);
    const minDistance = this.targetSize * 1.25;

    let bestPos = { x: minX, y: minY };
    let found = false;

    for (let attempt = 0; attempt < 60; attempt++) {
      const candidate = {
        x: Math.floor(Math.random() * (maxX - minX)) + minX,
        y: Math.floor(Math.random() * (maxY - minY)) + minY
      };

      const hasOverlap = existingPositions.some(p => {
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
      // Fallback deterministic offset
      bestPos = {
        x: Math.min(maxX, minX + (existingPositions.length * (this.targetSize + 20)) % (maxX - minX + 1)),
        y: Math.min(maxY, minY + (existingPositions.length * 40) % (maxY - minY + 1))
      };
    }

    return bestPos;
  }
}
