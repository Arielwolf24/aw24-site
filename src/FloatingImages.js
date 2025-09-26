import React, 
{ useEffect, useRef } from 'react';

// === Edit this shit if you want to change defaults  ===
export const DEFAULT_TAIL_OFFSET_X = -0.01; // x axis offset (to the right)
export const DEFAULT_TAIL_OFFSET_Y = 0.1; // y axis offset (downwards)
export const ARI_FLOAT_SPEED = 0.045; // floating speed of ari in space
export const ARI_FLOAT_MARGIN = 260; // how far ari can go out of frame before re-entering
// ===========================================================

// FloatingImages: AriFloats entity with tail that spins slowly
export default function FloatingImages({ src = '/AriFloats.png', tailSrc = '/AriFloatsTAIL.png', speed = ARI_FLOAT_SPEED, scale = 0.9, spinSpeed = 0.0015, tailOffsetX = DEFAULT_TAIL_OFFSET_X, tailOffsetY = DEFAULT_TAIL_OFFSET_Y }) 
{
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const itemRef = useRef(null);

  useEffect(() => 
    {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.src = src;
    img.crossOrigin = 'anonymous';
    const tailImg = new Image();
    tailImg.src = tailSrc;
    tailImg.crossOrigin = 'anonymous';

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

    // single item state: random position and random direction
    const angle = Math.random() * Math.PI * 2;
    const mag = (0.6 + Math.random() * 0.9) * speed * 10; // magnitude scaled by speed
    itemRef.current = 
    {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: Math.cos(angle) * mag,
      vy: Math.sin(angle) * mag,
      spin: Math.random() * Math.PI * 2,
      // tail spin state
      tailSpin: Math.random() * Math.PI * 2,
      tailSpinSpeed: 0.004 + Math.random() * 0.006,
      scale,
      phase: Math.random() * Math.PI * 2,
    };

    function draw() 
    {
      ctx.clearRect(0, 0, width, height);
      const it = itemRef.current;

      it.x += it.vx;
      it.y += it.vy;

  // Ari floats constantly into the never ending space to his death

      // bob HAHAHA
      it.phase += 0.003;
      const bob = Math.sin(it.phase) * 6 * (it.scale / 1.2);

      const drawX = it.x;
      const drawY = it.y + bob;

      if (img.complete && img.naturalWidth) 
      {
        const w = img.naturalWidth * it.scale;
        const h = img.naturalHeight * it.scale;

        // the entirety of ari spinning
        it.spin += spinSpeed;
        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.rotate(it.spin);

        // tail: spin independently while attached to ari's body
        if (tailImg.complete && tailImg.naturalWidth) 
       {
          const tw = tailImg.naturalWidth * it.scale;
          const th = tailImg.naturalHeight * it.scale;
          // interpret tailOffsetX/Y: if absolute small number <=5 treat as fraction of width/height
          const computedTailOffsetX = Math.abs(tailOffsetX) <= 5 ? w * tailOffsetX : tailOffsetX;
          const computedTailOffsetY = Math.abs(tailOffsetY) <= 5 ? h * tailOffsetY : tailOffsetY;
          // advance tail spin
          it.tailSpin += it.tailSpinSpeed;
          ctx.save();
          // translate to the tail attachment point (already within entity rotation)
          ctx.translate(computedTailOffsetX, computedTailOffsetY);
          // rotate tail around its center
          ctx.rotate(it.tailSpin);
          ctx.globalAlpha = 0.95;
          ctx.drawImage(tailImg, -tw / 2, -th / 2, tw, th);
          ctx.restore();

          // needed help implementing this
        }

        // main
        ctx.globalAlpha = 0.98;
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.globalAlpha = 1;
        ctx.restore();
      }

  // re-enter from random position if ari floats out of frame
  const margin = ARI_FLOAT_MARGIN;
      function setNewDirection() 
      {
        const angle = Math.random() * Math.PI * 2;
        const mag = (0.6 + Math.random() * 0.9) * speed * 10;
        it.vx = Math.cos(angle) * mag;
        it.vy = Math.sin(angle) * mag;
      }
      if (it.x - margin > width) 
      {
        it.x = -margin;
        it.y = Math.random() * height;
        setNewDirection();
      }
      if (it.x + margin < 0) 
      {
        it.x = width + margin;
        it.y = Math.random() * height;
        setNewDirection();
      }
      if (it.y - margin > height) 
      {
        it.y = -margin;
        it.x = Math.random() * width;
        setNewDirection();
      }
      if (it.y + margin < 0) 
      {
        it.y = height + margin;
        it.x = Math.random() * width;
        setNewDirection();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    resize();
    rafRef.current = requestAnimationFrame(draw);

    window.addEventListener('resize', resize);

    return () => 
    {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [src, tailSrc, speed, scale, spinSpeed, tailOffsetX, tailOffsetY]);

  return (
    <canvas
      ref={canvasRef}
      className="floating-images-canvas"
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', display: 'block' }}
    />
  );
}

