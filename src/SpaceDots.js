import React, { useEffect, useRef } from 'react';

// === gpt generated bc i was too lazy to figure this one out ===

// Simple full-screen canvas that draws non-glowing falling dots (circles)
export default function SpaceDots({ count = 120, color = '#dcdcdc', minSize = 0.8, maxSize = 2.6, speedFactor = 0.4 }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function createParticles() {
      const particles = [];
      for (let i = 0; i < count; i++) {
        const r = Math.random() * (maxSize - minSize) + minSize;
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r,
          vy: (Math.random() * 0.6 + 0.2) * speedFactor * (r / maxSize + 0.5),
          vx: 0, // no horizontal drift — only fall straight down
        });
      }
      particlesRef.current = particles;
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;
      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.vy;

        // when a particle moves off the bottom, respawn it at the top with a new x
        if (p.y - p.r > height) {
          p.y = -p.r;
          p.x = Math.random() * width;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(draw);
    }

    resize();
    createParticles();
    rafRef.current = requestAnimationFrame(draw);

    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [count, color, minSize, maxSize, speedFactor]);

  return (
    <canvas
      ref={canvasRef}
      className="space-dots-canvas"
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', display: 'block' }}
    />
  );
}
