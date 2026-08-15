// ==========================================================================
// GOLDEN STARDUST & CHAMPAGNE PARTICLES ENGINE
// Canvas-based interactive physics & sparkling ambient dust
// ==========================================================================

export class StardustEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.particleCount = window.innerWidth < 768 ? 45 : 85;
    this.mouse = { x: null, y: null, radius: 140 };

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    window.addEventListener('mouseleave', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });

    this.createParticles();
    this.animate();
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }

  createParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 2.2 + 0.6,
        baseSize: Math.random() * 2.2 + 0.6,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.5) * 0.4 - 0.2, // slight upward float
        opacity: Math.random() * 0.6 + 0.2,
        pulseSpeed: Math.random() * 0.02 + 0.005,
        pulseAngle: Math.random() * Math.PI * 2,
        color: this.getRandomGoldColor()
      });
    }
  }

  getRandomGoldColor() {
    const golds = [
      'rgba(243, 229, 171, ', // champagne light
      'rgba(212, 175, 55, ',  // metallic gold
      'rgba(255, 223, 115, ', // bright sparkle
      'rgba(255, 255, 255, '  // starlight white
    ];
    return golds[Math.floor(Math.random() * golds.length)];
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Update position
      p.x += p.speedX;
      p.y += p.speedY;

      // Pulse glow
      p.pulseAngle += p.pulseSpeed;
      const currentOpacity = p.opacity + Math.sin(p.pulseAngle) * 0.2;

      // Wrap around edges
      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;

      // Mouse repulsion & attraction
      if (this.mouse.x !== null && this.mouse.y !== null) {
        const dx = p.x - this.mouse.x;
        const dy = p.y - this.mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.mouse.radius) {
          const force = (this.mouse.radius - distance) / this.mouse.radius;
          p.x += (dx / distance) * force * 3;
          p.y += (dy / distance) * force * 3;
        }
      }

      // Draw particle
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color + Math.max(0.1, Math.min(1, currentOpacity)) + ')';
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = '#FFDF73';
      this.ctx.fill();
    }

    requestAnimationFrame(() => this.animate());
  }
}

// Instantiate on load
window.addEventListener('DOMContentLoaded', () => {
  new StardustEngine('stardust-canvas');
});
