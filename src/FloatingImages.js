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
    const dragRef = useRef({ active: false, offsetX: 0, offsetY: 0, lastMoves: [] });
    const pointerActiveRef = useRef(false);

    // tuning constants for drag/momentum
    const TOSS_FRICTION = 0.92; // friction applied immediately after toss, keep this consistant you fuck
    const MIN_TOSS_SPEED = 0.6; // when toss speed falls below this, begin recovery speed 
    const RECOVERY_ACCEL = 0.12; // acceleration per frame back toward cruising speed 

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

        // random position and random direction, fix this to a cone direction later
        const angle = Math.random() * Math.PI * 2;
        const mag = (0.6 + Math.random() * 0.9) * speed * 10; // magnitude scaled by speed
        itemRef.current =
        {
            x: Math.random() * width,
            y: Math.random() * height,
            vx: Math.cos(angle) * mag,
            vy: Math.sin(angle) * mag,
            spin: Math.random() * Math.PI * 2,
            // tail spin shit
            tailSpin: Math.random() * Math.PI * 2,
            tailSpinSpeed: 0.004 + Math.random() * 0.006,
            scale,
            phase: Math.random() * Math.PI * 2,
            // recovery stuff
            desiredMag: mag,
            recovering: false,
        };

        function draw()
        {
            ctx.clearRect(0, 0, width, height);
            const it = itemRef.current;

            // if dragging, position is handled by pointerMove
            if (!dragRef.current.active)
            {
                it.x += it.vx;
                it.y += it.vy;

                // apply toss friction & recovery logic
                it.vx *= TOSS_FRICTION;
                it.vy *= TOSS_FRICTION;
                const speedNow = Math.hypot(it.vx, it.vy);
                if (!it.recovering)
                {
                    if (speedNow < MIN_TOSS_SPEED)
                    {
                        it.recovering = true;
                    }
                }
                else
                {
                    // gently accelerate back toward fixed desiredMag
                    // ugh this sucks i need to do vector math
                    const desiredMag = it.desiredMag || ((0.6 + Math.random() * 0.9) * speed * 10);
                    const curAngle = Math.atan2(it.vy, it.vx || 0.0001);
                    const curMag = Math.hypot(it.vx, it.vy);
                    const newMag = Math.min(desiredMag, curMag + RECOVERY_ACCEL);
                    it.vx = Math.cos(curAngle) * newMag;
                    it.vy = Math.sin(curAngle) * newMag;
                    if (newMag >= desiredMag - 0.01) it.recovering = false;
                }
            }

            // bob HAHAHAHAH
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
                    // interpret tailOffsetX/Y becuase i am bad at math
                    const computedTailOffsetX = Math.abs(tailOffsetX) <= 5 ? w * tailOffsetX : tailOffsetX;
                    const computedTailOffsetY = Math.abs(tailOffsetY) <= 5 ? h * tailOffsetY : tailOffsetY;
                    // advance tail spin
                    it.tailSpin += it.tailSpinSpeed;
                    ctx.save();
                    // translate to the tail attachment point on ari
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
        // pointer helpers
        function setCanvasPointerActive(active)
        {
            pointerActiveRef.current = active;
            // bring canvas above UI while active so it can receive pointerdown
            if (active)
            {
                canvas.style.pointerEvents = 'auto';
                canvas.style.zIndex = 9999;
            }
            else
            {
                canvas.style.pointerEvents = 'none';
                canvas.style.zIndex = 0;
            }
        }

        function getPos(e)
        {
            const r = canvas.getBoundingClientRect();
            return { x: e.clientX - r.left, y: e.clientY - r.top };
        }

        function pointerDown(e)
        {
            const pos = getPos(e);
            const it = itemRef.current;
            const iw = (img.naturalWidth || 64) * it.scale;
            const ih = (img.naturalHeight || 64) * it.scale;
            const dx = pos.x - it.x;
            const dy = pos.y - it.y;
            const rHit = Math.max(iw, ih) * 0.6;
            if (dx * dx + dy * dy <= rHit * rHit)
            {
                dragRef.current.active = true;
                dragRef.current.offsetX = pos.x - it.x;
                dragRef.current.offsetY = pos.y - it.y;
                dragRef.current.lastMoves = [{ x: pos.x, y: pos.y, t: performance.now() }];
                setCanvasPointerActive(true);
                try { canvas.setPointerCapture(e.pointerId); } catch (err) { }
                e.preventDefault();
            }
        }

        function pointerMove(e)
        {
            const pos = getPos(e);
            const it = itemRef.current;
            if (!dragRef.current.active)
            {
                // hover detection: enable pointer events only when over Ari
                // IT FUCKING WORKS HELL YEAHHHHHHHHHH
                const iw = (img.naturalWidth || 64) * it.scale;
                const ih = (img.naturalHeight || 64) * it.scale;
                const dx = pos.x - it.x;
                const dy = pos.y - it.y;
                const rHit = Math.max(iw, ih) * 0.6;
                setCanvasPointerActive(dx * dx + dy * dy <= rHit * rHit);
                return;
            }
            it.x = pos.x - dragRef.current.offsetX;
            it.y = pos.y - dragRef.current.offsetY;
            dragRef.current.lastMoves.push({ x: pos.x, y: pos.y, t: performance.now() });
            while (dragRef.current.lastMoves.length > 8) dragRef.current.lastMoves.shift();
            e.preventDefault();
        }

        function pointerUp(e)
        {
            if (!dragRef.current.active) return;
            const moves = dragRef.current.lastMoves;
            const it = itemRef.current;
            if (moves.length >= 2)
            {
                const last = moves[moves.length - 1];
                let start = moves[0];
                for (let j = moves.length - 2; j >= 0; j--)
                {
                    if (last.t - moves[j].t > 40)
                    { start = moves[j]; break; }
                }
                const dt = Math.max(1, last.t - start.t);
                const vxMs = (last.x - start.x) / dt;
                const vyMs = (last.y - start.y) / dt;
                // apply toss velocity, ew
                it.vx = vxMs * 16;
                it.vy = vyMs * 16;
                // begin friction phase,
                it.recovering = false;
            }
            dragRef.current.active = false;
            dragRef.current.lastMoves = [];
            setCanvasPointerActive(false);
            try { canvas.releasePointerCapture(e.pointerId); } catch (err) { }
            e.preventDefault();
        }

        canvas.addEventListener('pointerdown', pointerDown, { passive: false });
        // listen on window for pointermove so drag doesn't break if mouse leaves canvas
        window.addEventListener('pointermove', pointerMove, { passive: false });
        canvas.addEventListener('pointerup', pointerUp, { passive: false });
        canvas.addEventListener('pointercancel', pointerUp, { passive: false });

        return () =>
        {
            window.removeEventListener('resize', resize);
            canvas.removeEventListener('pointerdown', pointerDown);
            window.removeEventListener('pointermove', pointerMove);
            canvas.removeEventListener('pointerup', pointerUp);
            canvas.removeEventListener('pointercancel', pointerUp);
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

