import React, { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';
import SpaceDots from './SpaceDots';
import FloatingImages from './FloatingImages';
import IntroOverlay from './IntroOverlay';

function useTyping(words, typingSpeed = 100, pause = 800, deletingSpeed = 40) 
{
  const [text, setText] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => 
  {
    let timeout;
    const currentWord = words[wordIndex % words.length];

    if (!isDeleting) 
    {
      timeout = setTimeout(() => 
      {
        setText((current) => current + currentWord.charAt(current.length));
      }, typingSpeed);

      if (text === currentWord) 
      {
        timeout = setTimeout(() => setIsDeleting(true), pause);
      }
    } 
    else 
    {
      timeout = setTimeout(() => 
      {
        setText((current) => current.slice(0, -1));
      }, deletingSpeed);

      if (text === '') 
      {
        setIsDeleting(false);
        setWordIndex((i) => i + 1);
      }
    }

    return () => clearTimeout(timeout);
  }, [text, isDeleting, wordIndex, words, typingSpeed, pause, deletingSpeed]);

  return text;
}

function App() 
{
  const messages =
  [
    "I'm still learning React you fucking idiot.",
    "This will be a cool site once i figure out how to do this shit.",
    'STILL A WORK IN PROGRESS GO AWAY!!',
    'AHHHHHHHHHHHHHHHHHHHHHHH',
    'Just go to the other link already!',
    'I have more stuff there to show for now',
    'Nothing else to see here, just come back some time later!',
    'The 24 in my alias has a secret',
    'Did you know silver is a spinch???????',
    'I hate christmas',
    'Fun fact, you can drag Ari and toss him around!',
    'took me a while to figure it out',
    'only about like 1 hour and 30 min to get it working after searching on reddit',
    'HEHEHEHA',
    'Sel if youre watching this',
    'You are gay',
    'LMAOOOOOOOOOOOOOOOOOOOOOOOOOOOO',
    'Welp, back to it',
  ];

  const typed = useTyping(messages, 60, 700, 30);
  const audioRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [videoAutoplayBlocked, setVideoAutoplayBlocked] = useState(false);
  const [requireEnable, setRequireEnable] = useState(false);
  const [enableError, setEnableError] = useState('');
  const [introDone, setIntroDone] = useState(false);
  const [fadeStarted, setFadeStarted] = useState(false);
  const [mountSpace, setMountSpace] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const SPACE_FADE_MS = 1400; // should roughly match IntroOverlay FADE_SECONDS * 1000
  const HEADER_DELAY_MS = 160; // short delay after space fade completes before header appears

  // common audio creation to avoid duplicated new audio shit cuz itll be annoying
  const createAudioElement = useCallback((src = '/Audio/loop.ogg') =>
  {
    const a = new Audio(src);
    a.loop = true;
    a.volume = 0.5;
    a.muted = false;
    a.preload = 'auto';
    try { a.load(); } catch (e) {}
    return a;
  }, []);

  const getOrCreateAudio = useCallback(() =>
  {
    if (!audioRef.current)
    {
      audioRef.current = createAudioElement('/Audio/loop.ogg');
    }
    return audioRef.current;
  }, [createAudioElement]);

  // initialize audio and try to play only after intro has completed
  useEffect(() =>
  {
  if (!introDone) return;
  // if audio already exists (preloaded during fade), reuse it
  const audio = getOrCreateAudio();

    let triedMp3 = false;
    let mounted = true;

    const tryPlay = async () => 
    {
      if (!mounted) return;
      try
      {
        await audio.play();
        if (!mounted) return;
        setIsMuted(audio.muted);
        setAutoplayBlocked(false);
      }
      catch (err)
      {
        console.warn('Autoplay/play failed for', audio.src, err);
        if (!triedMp3)
        {
          triedMp3 = true;
          audio.src = '/Audio/loop.mp3';
          tryPlay();
        }
        else
        {
          if (!mounted) return;
          setAutoplayBlocked(true);
          setRequireEnable(true);
        }
      }
    };

    const onError = () =>
    {
      console.warn('Audio element error for', audio.src);
      if (!triedMp3)
      {
        triedMp3 = true;
        audio.src = '/loop.mp3';
        tryPlay();
      }
    };

    audio.addEventListener('error', onError);
    tryPlay();

    const onVisibility = () =>
    {
      if (document.visibilityState === 'visible') tryPlay();
    };
    const onFocus = () => tryPlay();
    const onLoad = () => tryPlay();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    window.addEventListener('load', onLoad);

    return () =>
    {
      mounted = false;
      audio.removeEventListener('error', onError);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('load', onLoad);
      if (audioRef.current)
      {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [introDone, getOrCreateAudio]);

  // preload audio during fade so it can start immediately after intro finishes
  const handleOverlayFadeStart = () =>
  {
    if (fadeStarted) return;
    // ensure the space UI is mounted first (opacity is 0), then trigger the transition on the next frame
    if (!mountSpace) setMountSpace(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setFadeStarted(true)));
    // preload audio but don't play yet, we'll play when the video element is removed (onComplete)
    try
    {
      getOrCreateAudio();
    } catch (e) {}
  };

  // used to request overlay to try playback under a user gesture
  const [playRequestedKey, setPlayRequestedKey] = useState(0);

  const handleIntroComplete = () =>
  {
    // video element has been removed by IntroOverlay
    setIntroDone(true);
    // play loop audio immediately (if not blocked)
    try
    {
      const a = getOrCreateAudio();
      a.play().catch((err) => console.warn('Autoplay blocked when starting after intro', err));
    } catch (e) {
      console.warn('Failed to start audio on intro complete', e);
    }

    // short delay then fade in header UI so space finishes fading in first
    setTimeout(() => setHeaderVisible(true), HEADER_DELAY_MS);
  };

  const handleEnableMedia = async () => 
  {
    setEnableError('');
    // start and play audio and video on user gesture
    try 
  {
  // audio wasnt made?? MAKE IT
  const audio = getOrCreateAudio();
      // play loop.ogg, if it fails then try mp3 fallback
      try 
      {
        await audio.play();
        setIsMuted(audio.muted);
        setAutoplayBlocked(false);
        // audio allowed but try to request the intro video to play under this user gesture
        setPlayRequestedKey((k) => k + 1);
        // if video was previously blocked, we'll clear it when IntroOverlay reports back
        // but do not close the notice until both audio and video are unblocked bc i neeeeed it to work properly
        if (!videoAutoplayBlocked) setRequireEnable(false);
      }
      catch (err) 
      {
        // use for fallback
  audio.src = '/Audio/loop.mp3';
        await audio.play();
        setIsMuted(audio.muted);
        setAutoplayBlocked(false);
        setPlayRequestedKey((k) => k + 1);
        if (!videoAutoplayBlocked) setRequireEnable(false);
      }
    } 
    catch (err) 
    {
      console.error('Enable media failed', err);
      setEnableError('Playback failed. Please allow audio/video and try again.');
      setRequireEnable(true);
    }
  };

  const toggleMute = () => 
  {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
  };

  // If we're on a mobile device, skip the intro video entirely and
  // immediately mount the space UI, start the fade transition, and
  // attempt to start the loop audio (this will still respect autoplay
  // policies and surface the enable modal if blocked).
  useEffect(() =>
  {
    try
    {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
      const isMobile = /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(ua);
      if (!isMobile) return;
      // avoid double-running if the intro was already completed for some reason
      if (introDone) return;

      // Mmount the space shit and trigger the fade (two rAFs to ensure CSS transition)
      if (!mountSpace) setMountSpace(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setFadeStarted(true)));

      // call the same completion handler used when the intro video finishes
      // so we keep behavior consistent (sets introDone, plays audio, reveals header)
      handleIntroComplete();
    }
    catch (e)
    {
      // swallow any unexpected errors here — nothing fatal for desktop flow
      console.warn('Mobile skip intro failed, device might be unsupported', e);
    }
    // intentionally run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="App">
  {!introDone && (
    <IntroOverlay
      onComplete={handleIntroComplete}
      onFadeStart={handleOverlayFadeStart}
      playRequestedKey={playRequestedKey}
      onAutoplayBlocked={() =>
      {
        // video autoplay blocked prompt the fucker to enable media before proceeding
        setVideoAutoplayBlocked(true);
        setRequireEnable(true);
      }}
      onAutoplayAllowed={() =>
      { setVideoAutoplayBlocked(false); if (!autoplayBlocked) setRequireEnable(false); }}
    />
  )}

  {/* render above everything (overlay has zIndex 20000 BC IT WASNT WORKING) */}
  {requireEnable && (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30001 }}>
      <div style={{ maxWidth: 480, padding: 24, background: '#111', borderRadius: 8, textAlign: 'center' }} role="dialog" aria-modal="true">
        <h2 style={{ marginTop: 0 }}>Enable audio & video</h2>
        <p>To continue, please enable audio and video playback in your browser and click the button below.</p>
        {enableError && <div style={{ color: '#f99', marginBottom: 8 }}>{enableError}</div>}
        <button onClick={handleEnableMedia} style={{ marginTop: 12, padding: '8px 16px' }}>Enable audio & video</button>
      </div>
    </div>
  )}

      {/* This shit controls for the spaceDots shown in the background!! */}
      {(mountSpace || introDone) && (
        <div style={{
          opacity: fadeStarted ? 1 : 0,
          transition: `opacity ${SPACE_FADE_MS}ms ease`,
          pointerEvents: introDone ? 'auto' : 'none',
        }}>
          <SpaceDots count={140} color="#d4d4d4" minSize={0.9} maxSize={3.0} speedFactor={0.6} />
          <FloatingImages src={'/AriFloats.png'} count={1} speed={0.08} scaleMin={0.6} scaleMax={1.1} />
          <div style={{ opacity: headerVisible ? 1 : 0, transition: 'opacity 280ms ease', pointerEvents: headerVisible ? 'auto' : 'none' }}>
            <header className="App-header">
              <img src="/Heart.png" className="Heart-image" alt="heart" />
              <p className="typing">
                <span>{typed}</span>
                <span className="typing-cursor" aria-hidden="true">|</span>
              </p>
              <a className="App-link" href="https://arielwolf24.carrd.co/" target="_blank" rel="noopener noreferrer">
                My socials and other stuff!
              </a>
              <div style={{ marginTop: 8 }}>
                <button onClick={toggleMute} aria-pressed={!isMuted} aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}>
                  {isMuted ? 'Unmute' : 'Mute'}
                </button>
              </div>
              <div className="copyright-line">
                © Arielwolf24 2018 - 2025. <span style={{ textDecoration: 'underline' }}>All rights reserved.</span>
              </div>
            </header>
          </div>

          {/* floating area for audio status/errors — render only when needed you prick */}

          {(autoplayBlocked || enableError) && (
            <div style={{ position: 'fixed', bottom: 12, right: 12, background: 'rgba(255,255,255,0.95)', padding: 8, borderRadius: 8, zIndex: 9999, minWidth: 180 }}>
              {autoplayBlocked && <div style={{ fontSize: 12, color: '#444', marginTop: 6 }}>Autoplay blocked — sound will start when allowed</div>}
              {enableError && <div style={{ fontSize: 13, color: '#a00', marginTop: 6 }}>{enableError}</div>}
            </div>
          )}

          {/* requireEnable modal removed from here; rendered at top-level so it overlays the intro video */}
        </div>
      )}
    </div>
  );
}

export default App;

