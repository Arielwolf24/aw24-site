import React, { useEffect, useRef, useState } from 'react';
import masterVolume from './masterVolume';
import RGLIcon from './RGLIcon';

export default function RGL()
{
  const topRef = useRef(null);
  const bottomRef = useRef(null);
  const [closedEnded, setClosedEnded] = useState(false);
  const [openPlaying, setOpenPlaying] = useState(false);
  const [swappedToOpen, setSwappedToOpen] = useState(false);
  const [showUI, setShowUI] = useState(false);
  const uiTimerRef = useRef(null);
  const audioRef = useRef(null); // loop audio
  const appearAudioRef = useRef(null); // one-shot appear audio (SHOOM!)
  const appearAudioTimerRef = useRef(null); // schedule slight delay
  const audioFadeTimerRef = useRef(null);
  const audioFadeRafRef = useRef(null);
  const audioFadePendingRef = useRef(false);

  useEffect(() =>
  {
    const top = topRef.current;
    const bottom = bottomRef.current;

    // create loop audio but do not auto-play until UI is shown
    try
    {
      const a = new Audio('/Audio/RGL-Loop.ogg');
      a.loop = true;
      a._baseVolume = typeof a._baseVolume === 'undefined' ? 0.6 : a._baseVolume;
      try { masterVolume.applyToElement(a); } catch (e) {}
      audioRef.current = a;
    }
    catch (e) { /* ignore */ }

    // create appear audio (no loop) to play when UI appears
    try
    {
      const ap = new Audio('/Audio/RGL-Appear.ogg');
      ap.loop = false;
      ap._baseVolume = typeof ap._baseVolume === 'undefined' ? 1.0 : ap._baseVolume;
      try { masterVolume.applyToElement(ap); } catch (e) {}
      appearAudioRef.current = ap;
    }
    catch (e) { /* ignore */ }

    if (top)
    {
      try { top._baseVolume = typeof top._baseVolume === 'undefined' ? 1.0 : top._baseVolume; } catch (e) {}
      try { masterVolume.applyToElement(top); } catch (e) {}
      top.play().catch(() => {});
    }

    if (bottom)
    {
      try { bottom._baseVolume = typeof bottom._baseVolume === 'undefined' ? 1.0 : bottom._baseVolume; } catch (e) {}
      try { masterVolume.applyToElement(bottom); } catch (e) {}
      // preload the opening video so it's ready to play when swapped
      try { bottom.load(); } catch (e) {}
    }

    return () =>
    {
      try { if (top && top._masterVolumeUnsub) top._masterVolumeUnsub(); } catch (e) {}
      try { if (bottom && bottom._masterVolumeUnsub) bottom._masterVolumeUnsub(); } catch (e) {}
      if (uiTimerRef.current) { clearTimeout(uiTimerRef.current); uiTimerRef.current = null; }
      if (audioFadeTimerRef.current) { clearTimeout(audioFadeTimerRef.current); audioFadeTimerRef.current = null; }
      if (audioFadeRafRef.current) { cancelAnimationFrame(audioFadeRafRef.current); audioFadeRafRef.current = null; }
      if (audioRef.current)
      {
        try { audioRef.current.pause(); audioRef.current.src = ''; } catch(e) {}
        audioRef.current = null;
      }
      if (appearAudioRef.current)
      {
        try { appearAudioRef.current.pause(); appearAudioRef.current.src = ''; } catch(e) {}
        appearAudioRef.current = null;
      }
      if (appearAudioTimerRef.current) { clearTimeout(appearAudioTimerRef.current); appearAudioTimerRef.current = null; }
    };
  }, []);

  const onClosedEnded = () =>
  {
    setClosedEnded(true);
  };

  const onReturnClick = async () =>
  {
    const bottom = bottomRef.current;
    if (!bottom) return;
    // schedule audio fade after 1s, but do not let the effect immediately pause the audio
    audioFadePendingRef.current = true;
    if (audioFadeTimerRef.current) { clearTimeout(audioFadeTimerRef.current); audioFadeTimerRef.current = null; }
    audioFadeTimerRef.current = setTimeout(() =>
    {
      // fade audio over 420ms
      const a = audioRef.current;
      if (!a) { audioFadePendingRef.current = false; return; }
      const duration = 420;
      const start = performance.now();
      const from = (() => { try { return a.volume; } catch (e) { return 0; } })();
      const step = (now) =>
      {
        const t = Math.min(1, (now - start) / duration);
        try { a.volume = Math.max(0, Math.min(1, from * (1 - t))); } catch (e) {}
        if (t < 1)
        {
          audioFadeRafRef.current = requestAnimationFrame(step);
        }
        else
        {
          audioFadeRafRef.current = null;
          try { a.pause(); a.currentTime = 0; } catch (e) {}
          audioFadePendingRef.current = false;
        }
      };
      audioFadeRafRef.current = requestAnimationFrame(step);
    }, 1000);

    // remove top immediately and play bottom
    setSwappedToOpen(true);
    setOpenPlaying(true);
    setClosedEnded(false);
    // hide UI immediately when opening
    setShowUI(false);
    bottom.currentTime = 0;
    try { bottom._baseVolume = typeof bottom._baseVolume === 'undefined' ? 1.0 : bottom._baseVolume; } catch (e) {}
    try { masterVolume.applyToElement(bottom); } catch (e) {}
    try { await bottom.play(); } catch (e) {}
  };

  // play/pause RGL loop audio and appear audio when UI becomes visible/hidden (appear audio delayed by 100ms)
  useEffect(() =>
  {
    const a = audioRef.current;
    const ap = appearAudioRef.current;
    if (!a) return;
    if (showUI && !swappedToOpen)
    {
      try { a.currentTime = 0; } catch(e) {}
      a.play().catch(() => {});
      if (appearAudioTimerRef.current) { clearTimeout(appearAudioTimerRef.current); appearAudioTimerRef.current = null; }
      if (ap)
      {
        appearAudioTimerRef.current = setTimeout(() => {
          try { ap.currentTime = 0; } catch(e) {}
          ap.play().catch(() => {});
          appearAudioTimerRef.current = null;
        }, 50);
      }
    }
    else
    {
      // stop any pending appear audio timer and the appear audio itself
      if (appearAudioTimerRef.current) { clearTimeout(appearAudioTimerRef.current); appearAudioTimerRef.current = null; }
      if (ap) { try { ap.pause(); ap.currentTime = 0; } catch(e) {} }
      // if a fade-out is pending because the user clicked return, do not pause loop immediately
      if (audioFadePendingRef.current) return;
      try { a.pause(); a.currentTime = 0; } catch(e) {}
    }
  }, [showUI, swappedToOpen]);

  const onOpenEnded = () =>
  {
    window.dispatchEvent(new CustomEvent('rgl-open-finished'));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, pointerEvents: 'auto' }}>
      {/* preloaded OPEN video, underneath */}
      <video
        ref={bottomRef}
        src="/Video/TF2_CompDoors-OPEN.mp4"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 9999, pointerEvents: 'none' }}
        playsInline
        preload="auto"
        onEnded={onOpenEnded}
      />

      {/* CLOSE video shown on entry, removed when swappedToOpen */}
      {!swappedToOpen && (
        <video
          ref={topRef}
          src="/Video/TF2_CompDoors-CLOSE.mp4"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 10000 }}
          playsInline
          autoPlay
          onEnded={onClosedEnded}
          onPlay={() => {
            // show UI 1s after the CLOSE video starts playing
            if (uiTimerRef.current) clearTimeout(uiTimerRef.current);
            uiTimerRef.current = setTimeout(() => { setShowUI(true); uiTimerRef.current = null; }, 1000);
          }}
        />
      )}
        {/* Grouped overlay: background, icon, label and return button - show together */}
        {!swappedToOpen && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: showUI ? 'auto' : 'none', zIndex: 10001, opacity: showUI ? 1 : 0, transition: 'opacity 160ms linear' }}>
            {/* centered stack to lock positions on resize */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* background behind the group, centered and sliding from left */}
              <img src="/BG-RGL_Icon.png" alt="" style={{ position: 'absolute', left: '50%', top: '50%', transform: (showUI ? 'translate(-50%, -119%) translateX(0)' : 'translate(-50%, -119%) translateX(-120vw)'), transition: 'transform 200ms linear', width: 520, height: 'auto', zIndex: 10000, pointerEvents: 'none' }} />

              {/* content column, centered; only icon+text animate from right */}
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, zIndex: 10002 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, transform: showUI ? 'translateX(0)' : 'translateX(120vw)', transition: 'transform 200ms linear' }}>
                <div style={{ pointerEvents: 'none' }}>
                  <RGLIcon basePath="/RGL-Icon" size={128} fps={30} />
                </div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 60, transform: 'translate(-0%,-5%)', textShadow: '0 3px 2px rgba(0,0,0,1)', pointerEvents: 'none' }}>RGL.gg</div>
                </div>

                <div style={{ color: '#fff', fontWeight: 600, fontSize: 42, textAlign: 'center', textShadow: '0 2px 2px rgba(0, 0, 0, 1)' }}>
                  More cool things will be here soon!
                </div>

              <div>
                <button
                  onClick={onReturnClick}
                  style={{ padding: '12px 22px', borderRadius: 10, background: 'rgba(0, 0, 0, 0.42)', border: '2px solid #000', color: '#ffffffff', cursor: 'pointer', fontWeight: 700, fontSize: 18, boxShadow: '0 6px 16px rgba(0,0,0,0.35)', opacity: 0.95 }}
                >
                  Return to /main
                </button>
              </div>
            </div>
          </div>
          </div>
        )}
    </div>
  );
}
