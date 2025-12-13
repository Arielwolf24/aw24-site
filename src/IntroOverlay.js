import React, { useEffect, useRef, useState } from 'react';
import masterVolume from './masterVolume';

// IntroOverlay: preloads assets and plays the intro video from /Video/HeartIntro-site.mp4
export default function IntroOverlay({ onComplete, onFadeStart, onAutoplayBlocked, onAutoplayAllowed, playRequestedKey = 0 })
{
  const videoRef = useRef(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [readyToPlay, setReadyToPlay] = useState(false);
  const [, setAutoplayBlocked] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const loaderFadeTimerRef = useRef(null);
  // const [autoplayBlocked, setAutoplayBlocked] = useState(false); // removed: unused
  const FADE_SECONDS = 1.0; // fade trigger (seconds remaining) - start earlier
  const FADE_EARLY = 0.10; // make the visual fade finish this many seconds before the video end (increase to shorten visual fade)

  useEffect(() =>
  {
    let mounted = true;

    // Preload images
    const images = ['/AriFloats.png', '/AriFloatsTAIL.png', '/AriBlink.png', '/Heart.png'];
    let loaded = 0;
    images.forEach((src) =>
    {
      const img = new Image();
      img.src = src;
      img.onload = img.onerror = () =>
      {
        loaded += 1;
        if (!mounted) return;
        setLoadingProgress(Math.round((loaded / images.length) * 80));
      };
    });

    // preload audio
    const audio = new Audio('/Audio/loop.ogg');
    audio.preload = 'auto';
    audio.oncanplaythrough = () =>
    {
      if (!mounted) return;
      setLoadingProgress((p) => Math.max(p, 85));
    };
    audio.onerror = () =>
    {
      // try mp3 fallback
      audio.src = '/Audio/loop.mp3';
    };

    // preload video
    const video = document.createElement('video');
    video.src = '/Video/HeartIntro-site.mp4';
    video.preload = 'auto';
    video.oncanplaythrough = () =>
    {
      if (!mounted) return;
      setLoadingProgress(100);
      setReadyToPlay(true);
    };
    video.onerror = () =>
    {
      if (!mounted) return;
      setReadyToPlay(true);
      setLoadingProgress(100);
    };

    return () =>
    {
      mounted = false;
      // clean up
      audio.oncanplaythrough = null;
      audio.onerror = null;
      video.oncanplaythrough = null;
      video.onerror = null;
      if (loaderFadeTimerRef.current)
      {
        clearTimeout(loaderFadeTimerRef.current);
        loaderFadeTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() =>
  {
    // on complete quickly fade out the loader text
    if (loadingProgress >= 100)
    {
      // keep loader visible briefly then fade
      loaderFadeTimerRef.current = setTimeout(() =>
      {
        setShowLoader(false);
        loaderFadeTimerRef.current = null;
      }, 600); // 600ms before fade
    }
  }, [loadingProgress]);

  useEffect(() =>
  {
    if (!readyToPlay) return;
    const v = videoRef.current;
    if (!v) return;

    let mounted = true;
    const tryPlay = async () =>
    {
      // ensure the intro video honors the persisted master volume
      try {
        if (typeof v._baseVolume === 'undefined') v._baseVolume = Number.isFinite(v.volume) ? v.volume : 1.0;
        try { v.volume = v._baseVolume * masterVolume.getMasterVolume(); } catch (e) {}
        try { masterVolume.applyToElement(v); } catch (e) {}
      } catch (e) {}
      try
      {
        await v.play();
        if (!mounted) return;
        setAutoplayBlocked(false);
        try { onAutoplayAllowed && onAutoplayAllowed(); } catch (e) {}
      }
      catch (err)
      {
        // autoplay blocked
        setAutoplayBlocked(true);
        try { onAutoplayBlocked && onAutoplayBlocked(); } catch (e) {}
      }
    };
    tryPlay();

    const onEnded = () =>
    {
      if (!mounted) return;
      // unload video I NEED TO SEE THINGS
      try
      {
        v.pause();
        v.removeAttribute('src');
        v.load();
      }
      catch (e)
      {
        // ignore
      }
      onComplete && onComplete();
    };
    v.addEventListener('ended', onEnded);

    // fade the video when its remaining time is <= FADE_SECONDS
    const onTimeUpdate = () =>
    {
      try
      {
        const dur = v.duration;
        const now = v.currentTime;
        if (!isFinite(dur) || isNaN(dur)) return;
        const remaining = dur - now;
        if (remaining <= FADE_SECONDS && !isFading)
        {
          setIsFading(true);
          try { onFadeStart && onFadeStart(); } catch (e) {}
        }
      }
      catch (e)
      {
        // ignore
      }
    };
    v.addEventListener('timeupdate', onTimeUpdate);

    return () =>
    {
      mounted = false;
      v.removeEventListener('ended', onEnded);
      v.removeEventListener('timeupdate', onTimeUpdate);
      if (loaderFadeTimerRef.current)
      {
        clearTimeout(loaderFadeTimerRef.current);
        loaderFadeTimerRef.current = null;
      }
    };
  }, [readyToPlay, onComplete, onFadeStart, isFading, onAutoplayAllowed, onAutoplayBlocked]);

  // attempt playback on explicit request (e.g., after user gesture in App)
  useEffect(() =>
  {
    if (!readyToPlay) return;
    const v = videoRef.current;
    if (!v) return;
    // playRequestedKey increments when App wants the video to try to play with a user gesture
    const tryPlayOnRequest = async () =>
    {
      // ensure master volume is applied in case it wasn't earlier
      try {
        if (typeof v._baseVolume === 'undefined') v._baseVolume = Number.isFinite(v.volume) ? v.volume : 1.0;
        try { v.volume = v._baseVolume * masterVolume.getMasterVolume(); } catch (e) {}
        try { masterVolume.applyToElement(v); } catch (e) {}
      } catch (e) {}
      try
      {
        await v.play();
        setAutoplayBlocked(false);
        try{ onAutoplayAllowed && onAutoplayAllowed(); } catch (e) {}
      }
      catch (err)
      {
        setAutoplayBlocked(true);
        try { onAutoplayBlocked && onAutoplayBlocked(); } catch (e) {}
      }
    };
    // only attempt when playRequestedKey changes to a non-zero value
    if (playRequestedKey) tryPlayOnRequest();
  }, [playRequestedKey, readyToPlay, onAutoplayBlocked, onAutoplayAllowed]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20000 }}>
      <div style={{ width: '90%', maxWidth: 1100, background: 'transparent', textAlign: 'center' }}>
        <video
          ref={videoRef}
          src={'/Video/HeartIntro-site.mp4'}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            margin: '0 auto',
            borderRadius: 6,
            opacity: isFading ? 0 : 1,
            transition: `opacity ${Math.max(0.05, FADE_SECONDS - FADE_EARLY)}s ease`,
          }}
          controls={false}
        />
        <div style={{ marginTop: 12, color: '#fff', minHeight: 28 }}>
          {/* show loader only while still preloading */}
          {showLoader && loadingProgress < 100 && (
            <div style={{ marginBottom: 8, transition: 'opacity 300ms ease' }}>Loading: {loadingProgress}%</div>
          )}

          {/* autoplay state is handled by the global enable prompt in App */}
        </div>
      </div>
    </div>
  );
}
