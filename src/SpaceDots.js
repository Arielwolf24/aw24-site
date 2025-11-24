import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

// Hoisted easing map so useImperativeHandle dependency array can stay empty without warning
const EASINGS =
{
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
};

// there is speed animation control for a few reasons.
// exposes: ref.current.animateSpeed(targetSpeed, durationMs, { easing, onDone })
// also allows setting speedFactor prop as initial/base speed, well be using that for a few things :)))
const SpaceDots = forwardRef(function SpaceDots({ count = 120, color = '#dcdcdc', minSize = 0.8, maxSize = 2.6, speedFactor = 0.4 }, ref) // EDIT THIS FOR SEQUENCE CHANGES
{
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const rafRef = useRef(null);
  const currentSpeedRef = useRef(speedFactor);
  const baseSpeedRef = useRef(speedFactor);
  const animRef = useRef(null); // { from, to, startTime, duration, easing, onDone }

  useImperativeHandle(ref, () => ({
    getSpeed: () => currentSpeedRef.current,
    setBaseSpeed: (v) => { baseSpeedRef.current = v; currentSpeedRef.current = v; },
    animateSpeed: (target, durationMs = 1000, opts = {}) =>
    {
      const { easing = 'easeInOutQuad', onDone } = opts;
      animRef.current = {
        from: currentSpeedRef.current,
        to: target,
        startTime: performance.now(),
        duration: Math.max(16, durationMs),
        easing: EASINGS[easing] || EASINGS.easeInOutQuad,
        onDone,
      };
    },
    // convenience to animate up then back down to base
    pulseSpeed: async (peak, upMs = 1300, downMs = 500) =>
    {
      return new Promise((resolve) =>
      {
        const startBase = baseSpeedRef.current;
        const runDown = () =>
        {
          // animate back to base stupidly
          const doneDown = () => resolve();
          animRef.current =
          {
            from: currentSpeedRef.current,
            to: startBase,
            startTime: performance.now(),
            duration: Math.max(16, downMs),
            easing: EASINGS.easeOutQuad,
            onDone: doneDown,
          };
        };
        animRef.current =
        {
          from: currentSpeedRef.current,
          to: peak,
          startTime: performance.now(),
          duration: Math.max(16, upMs),
          easing: EASINGS.easeInQuad,
          onDone: runDown,
        };
      });
    },
  }), []);

  useEffect(() =>
  {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    function resize()
    {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function createParticles()
    {
      const particles = [];
      for (let i = 0; i < count; i++)
      {
        const r = Math.random() * (maxSize - minSize) + minSize;
        particles.push(
        {
          x: Math.random() * width,
          y: Math.random() * height,
          r,
          vyBase: (Math.random() * 0.6 + 0.2) * (r / maxSize + 0.5), // base vertical speed unit
        });
      }
      particlesRef.current = particles;
    }

    function applySpeedAnimation(now)
    {
      const anim = animRef.current;
      if (!anim) return;
      const { from, to, startTime, duration, easing, onDone } = anim;
      const t = Math.min(1, (now - startTime) / duration);
      const eased = easing(t);
      currentSpeedRef.current = from + (to - from) * eased;
      if (t >= 1)
      {
        animRef.current = null;
        if (onDone)
        {
          try { onDone(); }
          catch (e) { /* ignore */ }
        }
      }
    }

    function draw(now)
    {
      applySpeedAnimation(now);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;
      const particles = particlesRef.current;
      const speed = currentSpeedRef.current;
      for (let i = 0; i < particles.length; i++)
      {
        const p = particles[i];
        p.y += p.vyBase * speed;
        if (p.y - p.r > height)
        {
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

    return () =>
    {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [count, color, minSize, maxSize]);

  useEffect(() =>
  {
    // update base speed if prop changes, i fucking hate mathing this shit dude but it works
    baseSpeedRef.current = speedFactor;
    if (!animRef.current) currentSpeedRef.current = speedFactor; // only snap when not animating
  }, [speedFactor]);

  return (
    <canvas
      ref={canvasRef}
      className="space-dots-canvas"
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', display: 'block' }}
    />
  );
});

export default SpaceDots;
