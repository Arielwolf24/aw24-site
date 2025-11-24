import React, { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';
import SpaceDots from './SpaceDots';
import FloatingImages from './FloatingImages';
import IntroOverlay from './IntroOverlay';
import Router, { Route, navigate } from './Router';
import Main from './Main';

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
  const [headerMounted, setHeaderMounted] = useState(true);
  const [ariMounted, setAriMounted] = useState(true);
  const [ariVisible, setAriVisible] = useState(true);
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/');
  const SPACE_FADE_MS = 1400; // should roughly match IntroOverlay FADE_SECONDS * 1000
  const HEADER_DELAY_MS = 160; // short delay after space fade completes before header appears

  // common audio creation to avoid duplicated new audio shit cuz itll be annoying
  // big news! AHHHHHHHHH
  const createAudioElement = useCallback((src = '/Audio/loop.ogg') =>
  {
    const a = new Audio(src);
    a.loop = true;
    a.volume = 0.5;
    a.muted = false;
    a.preload = 'auto';
    try{ a.load(); } catch (e) {}
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

  // audio fade control refs
  const fadeRafRef = useRef(null);
  const desiredVolumeRef = useRef(0.5);
  const allowPlayOnFadeRef = useRef(false);
  const playedSinceFadeRef = useRef(false);

  const playLoopImmediate = React.useCallback(async () =>
  {
    try
    {
      const a = getOrCreateAudio();
      // restore volume for playback (we don't fade-in)
      try { a.volume = desiredVolumeRef.current; } catch (e) {}
      try { a.currentTime = 0; } catch (e) {}
      await a.play();
      setIsMuted(a.muted);
      setAutoplayBlocked(false);
      playedSinceFadeRef.current = true;
    }
    catch (err)
    {
      console.warn('Autoplay blocked when attempting immediate play', err);
      setAutoplayBlocked(true);
      setRequireEnable(true);
    }
  }, [getOrCreateAudio]);

  // fade audio to 0 over duration, then pause and reset currentTime.
  const fadeOutAndStopAudio = React.useCallback((duration = 400) => {
    const audio = audioRef.current;
    if (!audio) return;
    // cancel any in-flight fade
    if (fadeRafRef.current)
    {
      cancelAnimationFrame(fadeRafRef.current);
      fadeRafRef.current = null;
    }
    const start = performance.now();
    const from = audio.volume;
    const step = (now) =>
    {
      const t = Math.min(1, (now - start) / duration);
      // linear fade to 0
      audio.volume = Math.max(0, Math.min(1, from * (1 - t)));
      if (t < 1)
      {
        fadeRafRef.current = requestAnimationFrame(step);
      }
      else
      {
        fadeRafRef.current = null;
        try
        {
          audio.pause();
          try { audio.currentTime = 0; } catch (e) {}
          // restore volume for the next time we start playback
          try { audio.volume = desiredVolumeRef.current; } catch (e) {}
        }
        catch (e) {}
      }
    };
    fadeRafRef.current = requestAnimationFrame(step);
  }, []);

  // initialize audio and try to play only after intro has completed
  useEffect(() =>
  {
  if (!introDone) return;
  // if audio already exists (preloaded during fade), reuse it
  const audio = getOrCreateAudio();

    let triedMp3 = false;

    // only preload here. Actual playback should only start when the
    // visual UI fade starts (fadeStarted) so we do not call play() here.
    const onError = () =>
    {
      console.warn('Audio element error for', audio.src);
      if (!triedMp3)
      {
        triedMp3 = true;
        audio.src = '/loop.mp3';
        // do not auto-play here; just update src for future attempts
      }
    };

    audio.addEventListener('error', onError);

    // do the listeners minimal — we don't auto-play on visibility/focus/load here.
    const onVisibility = () => { /* noop: we don't auto-play during intro */ };
    const onFocus = () => { /* noop */ };
    const onLoad = () => { /* noop */ };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    window.addEventListener('load', onLoad);

    return () =>
    {
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

  // listen for route changes to coordinate UI transitions
  useEffect(() =>
  {
    const onNav = () => setCurrentPath(window.location.pathname || '/');
    window.addEventListener('popstate', onNav);
    const origPush = window.history.pushState;
    // monkey-patch?????? pushState to notify on navigations
    window.history.pushState = function ()
    {
      origPush.apply(this, arguments);
      window.dispatchEvent(new PopStateEvent('popstate'));
    };
    return () =>
    {
      window.removeEventListener('popstate', onNav);
      window.history.pushState = origPush;
    };
  }, []);

  // react to path changes
  useEffect(() =>
  {
    if (currentPath === '/main')
    {
      // entering main: fade out header, fade audio out, then unmount
      setHeaderVisible(false);
      // fade out Ari then unmount after same delay as header
      setAriVisible(false);
      // start audio fade-out when the UI is called to fade out
      fadeOutAndStopAudio(420);
      // allow the fade to finish then unmount
  const t = setTimeout(() => setHeaderMounted(false), 500);
  setTimeout(() => setAriMounted(false), 520); // no need to store handle; short-lived
  return () => clearTimeout(t);
    }
    else
    {
      // returning to root: ensure header is mounted and fade in
      setHeaderMounted(true);
      setAriMounted(true);
      // small timeout to allow mount before fade in
  const t = setTimeout(() => setHeaderVisible(true), 40);
  setTimeout(() => setAriVisible(true), 60);
      // audio will be started when the visual fade begins (fadeStarted),
      // do not attempt to play here to avoid playing before the UI fade.
      return () => clearTimeout(t);
    }
  }, [currentPath, getOrCreateAudio, fadeOutAndStopAudio]);

  // play or stop/fade audio when header becomes visible/invisible
  useEffect(() =>
  {
    // no audio actions here — audio fade-out is triggered explicitly when
    // the UI is called to fade out (for example when navigating to /main).
    // awful shit right here, im loosing my mind #2
  }, [headerVisible]);

  // when the visual fade starts, only auto-play loop on the root UI ("/"),
  // not on subpages. Subpages should never start loop on fade other wise im killing myself (joke)
  useEffect(() =>
  {
    if (!fadeStarted) return;
    if (currentPath === '/' && !playedSinceFadeRef.current) {
      playLoopImmediate();
    }
  }, [fadeStarted, currentPath, playLoopImmediate]);

  // ensure that when header shows again (UI being called to fade back in),
  // we play the loop from the start if we haven't already for this cycle.
  useEffect(() =>
  {
    if (headerVisible)
    {
      // only start when UI visual has already been enabled (not during intro)
      if (fadeStarted && !playedSinceFadeRef.current)
      {
        playLoopImmediate();
      }
    }
    else
    {
      // header hidden — mark that we need to replay when it next shows
      playedSinceFadeRef.current = false;
    }
  }, [headerVisible, fadeStarted, playLoopImmediate]);

  // preload audio during fade so it can start immediately after intro finishes
  const handleOverlayFadeStart = () =>
  {
    if (fadeStarted) return;
    // ensure the space UI is mounted first (opacity is 0), then trigger the transition on the next frame
    // mount space so assets can be ready, but DO NOT start the visual fade yet.
    // the visual fade (setFadeStarted) should only happen once the intro video
    // has fully finished and been removed (handled in handleIntroComplete).
    if (!mountSpace) setMountSpace(true);
    // preload audio but don't play yet, we'll play when the video element is removed (onComplete)
    try
    {
      getOrCreateAudio();
    }
    catch (e) {}
  };

  // used to request overlay to try playback under a user gesture
  const [playRequestedKey, setPlayRequestedKey] = useState(0);

  const handleIntroComplete = useCallback(() =>
  {
    // video element has been removed by IntroOverlay
    setIntroDone(true);
    // do NOT start playback here. Playback will begin when the UI visual
    // fade starts (fadeStarted) so the loop does not play while the intro video is visible.

    // ensure space UI is mounted before starting the visual fade
    if (!mountSpace) setMountSpace(true);
    // trigger the visual fade on the next frame (two rAFs to ensure CSS transition)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setFadeStarted(true);
      // start playback immediately when the UI fade is triggered here
      playLoopImmediate();
    }));
    // short delay then fade in header UI so space finishes fading in first
    setTimeout(() => setHeaderVisible(true), HEADER_DELAY_MS);
  }, [mountSpace, playLoopImmediate]);

  const handleEnableMedia = async () => 
  {
    setEnableError('');
    // start and play audio and video on user gesture
    // Instead of forcing playback immediately, record that the user has
    // given a gesture allowing playback. If the UI has already faded in
    // (fadeStarted === true), attempt playback now. Otherwise, the playback
    // will be attempted when the UI fade begins.
    try {
      allowPlayOnFadeRef.current = true;
      setPlayRequestedKey((k) => k + 1);
      if (fadeStarted && headerVisible) {
        const audio = getOrCreateAudio();
        await audio.play();
        setIsMuted(audio.muted);
        setAutoplayBlocked(false);
        if (!videoAutoplayBlocked) setRequireEnable(false);
      }
    } catch (err) {
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

  // if we're on a mobile device, skip the intro video entirely and
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

      // mount the space and then run the same completion handler which
      // triggers the visual fade and starts playback.
      if (!mountSpace) setMountSpace(true);
      handleIntroComplete();
    }
    catch (e)
    {
      // swallow any unexpected errors here — nothing fatal for desktop flow
      console.warn('Mobile skip intro failed, your fucking device sucks ass (unsupported)', e);
    }
    // intentionally run once on mount
    // awful shit right here, im loosing my mind
    // i dont think im working on mobile support
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introDone, mountSpace, handleIntroComplete]);

  // checks for subpage (not "/"), if subpage then skip the intro completely and
  // bring the background in immediately. Do not show header for /main.
  useEffect(() =>
  {
    const path = window.location.pathname || '/';
    if (path === '/') return; // keep intro on home
    // skip intro on subpages, should only be played on root page
    setIntroDone(true);
    if (!mountSpace) setMountSpace(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setFadeStarted(true)));
    if (path === '/main')
    {
      setHeaderMounted(false);
      setHeaderVisible(false);
    }
  // run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spaceDotsRef = useRef(null);
  const originalSpaceSpeedRef = useRef(0.6); // matches SpaceDots speedFactor
  const navigatingRef = useRef(false);

  const handleStartSequence = async () =>
  {
    if (navigatingRef.current) return; // prevent overlapping sequences
    navigatingRef.current = true;
    try
    {
      // hide header immediately (fade handled by opacity transition already)
      setHeaderVisible(false);
      // hide Ari
      setAriVisible(false);
      // fire audio fade-out in parallel
      fadeOutAndStopAudio(420);
      // play entering main SFX once (independent of loop) if user allowed playback
      try
      {
        const sfx = new Audio('/Audio/EnteringMain.ogg');
        sfx.volume = 0.9;
        sfx.play().catch(err =>
        {
          // try mp3 fallback
          try { sfx.src = '/Audio/EnteringMain.mp3'; sfx.play().catch(()=>{}); } catch(e) {}
        });
      }
      catch(e)
      { /* ignore */ }
      // accelerate stars then decelerate
      const space = spaceDotsRef.current;
      if (space && typeof space.pulseSpeed === 'function')
      {
        await space.pulseSpeed(50, 1250, 550); // peak 30, up 1.3s, down 0.5s
      }
      // after sequence, unmount Ari to avoid interaction on /main
      // this shit should've been done earlier god damn it
      setAriMounted(false);
      // after sequence navigate
      navigate('/main');
    }
    catch (e)
    {
      console.warn('Start sequence failed', e);
      navigate('/main');
    }
    finally  // this fucntion is so annoying jesus christ
    {
      navigatingRef.current = false;
    }
  };

  const mainAudioRef = useRef(null);

  const playMainLoop = useCallback(async () =>
    {
    if (!mainAudioRef.current)
    {
      mainAudioRef.current = createAudioElement('/Audio/Main-Loop.ogg');
    }
    const mainAudio = mainAudioRef.current;
    try
    {
      mainAudio.volume = 0.35;
      mainAudio.currentTime = 0;
      await mainAudio.play();
    }
    catch (err)
    {
      console.warn('Failed to play Main-Loop.ogg', err);
    }
  }, [createAudioElement]);

  const stopMainLoop = useCallback(() => {
    if (mainAudioRef.current)
    {
      try
      {
        mainAudioRef.current.pause();
        mainAudioRef.current.currentTime = 0;
      }
      catch (err)
      {
        console.warn('Failed to stop Main-Loop.ogg', err);
      }
    }
  }, []);

  useEffect(() =>
  {
    if (currentPath === '/main')
    {
      playMainLoop();
    }
    else
    {
      stopMainLoop();
    }
  }, [currentPath, playMainLoop, stopMainLoop]);

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
          <SpaceDots ref={spaceDotsRef} count={140} color="#d4d4d4" minSize={0.9} maxSize={3.0} speedFactor={originalSpaceSpeedRef.current} />
          {ariMounted && (
            <div style={{ opacity: ariVisible ? 1 : 0, transition: 'opacity 360ms ease' }}>
              <FloatingImages src={'/AriFloats.png'} count={1} speed={0.08} scaleMin={0.6} scaleMax={1.1} />
            </div>
          )}
          {headerMounted && (
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                  {/* Start button - navigates to /main. (ONE WAY TRIP, or it should be if i forgor to remove the return button in /main)*/}
                  <button
                    onClick={handleStartSequence}
                    aria-label="Start"
                    style={{
                      marginTop: 4,
                      padding: '16px 42px',
                      fontSize: '1.2rem',
                      fontWeight: 600,
                      borderRadius: 12,
                      letterSpacing: '0.6px',
                      cursor: 'pointer',
                      background: '#ffffff10',
                      color: '#fff',
                      border: '1px solid #ffffff40',
                      backdropFilter: 'blur(4px)',
                      boxShadow: '0 4px 14px -4px rgba(0,0,0,0.6)',
                      transition: 'transform 160ms ease, background 240ms ease',
                    }}
                    onPointerDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
                    onPointerUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#ffffff25'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff10'; e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    Start
                  </button>
                  <button onClick={toggleMute} aria-pressed={!isMuted} aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}>
                    {isMuted ? 'Unmute' : 'Mute'}
                  </button>
                </div>
              </div>
              <div className="copyright-line">
                © Arielwolf24 2018 - 2025. <span style={{ textDecoration: 'underline' }}>All rights reserved.</span>
              </div>
              </header>
            </div>
          )}

          {/* floating area for audio status/errors — render only when needed you prick */}

          {(autoplayBlocked || enableError) && (
            <div style={{ position: 'fixed', bottom: 12, right: 12, background: 'rgba(255,255,255,0.95)', padding: 8, borderRadius: 8, zIndex: 9999, minWidth: 180 }}>
              {autoplayBlocked && <div style={{ fontSize: 12, color: '#444', marginTop: 6 }}>Autoplay blocked — sound will start when allowed</div>}
              {enableError && <div style={{ fontSize: 13, color: '#a00', marginTop: 6 }}>{enableError}</div>}
            </div>
          )}

          {/* requireEnable modal removed from here; rendered at top-level so it overlays the intro video */}
          {/* Router content - keep background mounted above routes so SpaceDots stays persistent */}
          <Router>
            <Route path="/">
              {/* Root content is already the header area above. Nothing extra needed. */}
            </Route>
            <Route path="/main">
              <div style={{ position: 'relative', zIndex: 2 }}>
                <Main />
              </div>
            </Route>
          </Router>
        </div>
      )}
    </div>
  );
}

export default App;

