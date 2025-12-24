import React, { useEffect, useRef } from 'react';

// RGLIcon, sprite-sheet animator driven by an XML atlas
// needs a basePath for the image and XML files
// (default '/RGL-Icon.png' and '/RGL-Icon.xml'). Animates at `fps`, dont forget
export default function RGLIcon({ basePath = '/RGL-Icon', size = 120, fps = 30, style = {} })
{
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const framesRef = useRef([]);
  const timerRef = useRef(null);
  const idxRef = useRef(0);

  useEffect(() =>
  {
    let mounted = true;

    const loadImage = () => new Promise((resolve, reject) =>
    {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = `${basePath}.png`;
    });

    const loadXML = () => fetch(`${basePath}.xml`).then(r => r.text());

    // parse common XML shit like format at (<TextureAtlas><SubTexture .../>)
    const parseAtlas = (xmlText) =>
    {
      try
      {
        const dom = new DOMParser().parseFromString(xmlText, 'application/xml');
        const subs = Array.from(dom.getElementsByTagName('SubTexture'));
        if (subs.length)
        {
          return subs.map(s => ({
            x: parseInt(s.getAttribute('x') || '0', 10),
            y: parseInt(s.getAttribute('y') || '0', 10),
            w: parseInt(s.getAttribute('width') || s.getAttribute('w') || '0', 10),
            h: parseInt(s.getAttribute('height') || s.getAttribute('h') || '0', 10),
          }));
        }

        // weird fallback
        const frames = Array.from(dom.getElementsByTagName('frame'));
        if (frames.length)
        {
          return frames.map(f => ({
            x: parseInt(f.getAttribute('x') || '0', 10),
            y: parseInt(f.getAttribute('y') || '0', 10),
            w: parseInt(f.getAttribute('w') || f.getAttribute('width') || '0', 10),
            h: parseInt(f.getAttribute('h') || f.getAttribute('height') || '0', 10),
          }));
        }
      }
      catch (e) {}
      return [];
    };

    Promise.all([loadImage(), loadXML()])
      .then(([img, xmlText]) =>
      {
        if (!mounted) return;
        imageRef.current = img;
        const parsed = parseAtlas(xmlText);
        framesRef.current = parsed.length ? parsed : [{ x: 0, y: 0, w: img.width, h: img.height }];
        startLoop();
      })
      .catch(() =>
      {
        // if loading atlas fails, try only image
        loadImage().then(img =>
        {
          if (!mounted) return;
          imageRef.current = img;
          framesRef.current = [{ x: 0, y: 0, w: img.width, h: img.height }];
          startLoop();
        }).catch(() => {});
      });

    const startLoop = () =>
    {
      const interval = 1000 / Math.max(1, fps);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() =>
      {
        drawFrame();
        idxRef.current = (idxRef.current + 1) % Math.max(1, framesRef.current.length);
      }, interval);
    };

    const drawFrame = () =>
    {
      const canvas = canvasRef.current;
      const img = imageRef.current;
      const frames = framesRef.current;
      if (!canvas || !img || !frames.length) return;
      const ctx = canvas.getContext('2d');
      const frame = frames[idxRef.current % frames.length];
      const cw = canvas.width;
      const ch = canvas.height;
      ctx.clearRect(0, 0, cw, ch);
      try
      {
        // draw source frame to fit canvas
        ctx.drawImage(img, frame.x, frame.y, frame.w, frame.h, 0, 0, cw, ch);
      }
      catch (e) {}
    };

    return () =>
    {
      mounted = false;
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
  }, [basePath, fps]);

  // keep canvas sized to `size`, its a square
  useEffect(() =>
  {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [size]);

  return (
    <canvas ref={canvasRef} style={{ width: size, height: size, display: 'block', ...style }} />
  );
}
