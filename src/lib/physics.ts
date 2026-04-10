export interface Point {
  x: number;
  y: number;
  oldx: number;
  oldy: number;
  pinned?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  type: 'blood' | 'star' | 'lightning';
  size: number;
}

export class WhipPhysics {
  points: Point[] = [];
  segmentLength: number = 10;
  gravity: number = 0.5;
  friction: number = 0.95;
  stiffness: number = 1;

  constructor(length: number, startX: number, startY: number) {
    this.init(length, startX, startY);
  }

  init(length: number, startX: number, startY: number) {
    this.points = [];
    for (let i = 0; i < length; i++) {
      this.points.push({
        x: startX,
        y: startY + i * this.segmentLength,
        oldx: startX,
        oldy: startY + i * this.segmentLength,
        pinned: i === 0
      });
    }
  }

  update(mouseX: number, mouseY: number, attackType: string) {
    if (this.points.length === 0) return;

    // Update first point to follow mouse
    this.points[0].x = mouseX;
    this.points[0].y = mouseY;

    // Adjust physics based on attack type
    let currentGravity = this.gravity;
    let currentFriction = this.friction;
    let currentStiffness = this.stiffness;

    if (attackType === 'sweep') {
      currentGravity = 0.1;
      currentFriction = 0.98;
    } else if (attackType === 'wrap') {
      currentStiffness = 0.5;
      currentFriction = 0.9;
    } else if (attackType === 'whip') {
      currentStiffness = 1.2;
      currentFriction = 0.92;
    }

    // Verlet integration
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      if (!p.pinned) {
        const vx = (p.x - p.oldx) * currentFriction;
        const vy = (p.y - p.oldy) * currentFriction;
        p.oldx = p.x;
        p.oldy = p.y;
        p.x += vx;
        p.y += vy + currentGravity;
      }
    }

    // Constrain points
    const iterations = attackType === 'whip' ? 5 : 3;
    for (let i = 0; i < iterations; i++) {
      for (let j = 0; j < this.points.length - 1; j++) {
        const p1 = this.points[j];
        const p2 = this.points[j + 1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const difference = this.segmentLength - distance;
        const percent = (difference / distance) / 2 * currentStiffness;
        const offsetX = dx * percent;
        const offsetY = dy * percent;

        if (!p1.pinned) {
          p1.x -= offsetX;
          p1.y -= offsetY;
        }
        if (!p2.pinned) {
          p2.x += offsetX;
          p2.y += offsetY;
        }
      }
    }
  }
}
