import React, { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';
import SpaceDots from './SpaceDots';
import FloatingImages from './FloatingImages';
import IntroOverlay from './IntroOverlay';
import Router, { Route, navigate } from './Router';
import SubpageFade from './SubpageFade';
import Main from './Main';
import RGL from './RGL';
import VolumeControl from './VolumeControl';
import masterVolume from './masterVolume';

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
  const hover1Ref = useRef(null);
  const hover2Ref = useRef(null);
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
  const createAudioElement = useCallback((src = '/Audio/IntroLoop-Base.ogg', baseVolume = 0.5, applyMaster = true) =>
  {
    const a = new Audio(src);
    a.loop = true;
    // store base volume (per-file) and apply master volume multiplier
    a._baseVolume = baseVolume;
    try { a.volume = a._baseVolume * masterVolume.getMasterVolume(); } catch (e) {}
    a.muted = false;
    a.preload = 'auto';
    try{ a.load(); } catch (e) {}
    try { if (applyMaster) masterVolume.applyToElement(a); } catch (e) {}
    return a;
  }, []);

  // apply persisted master volume to any existing media elements on first mount
  useEffect(() => {
    try { masterVolume.applyToAllMedia(); } catch (e) {}
  }, []);

  const getOrCreateAudio = useCallback(() =>
  {
    if (!audioRef.current)
    {
      // create homepage loop
      audioRef.current = createAudioElement('/Audio/IntroLoop-Base.ogg', 0.5, true);
      // create hover variants (start muted at volume 0) without auto master apply
      try
      {
        hover1Ref.current = createAudioElement('/Audio/IntroLoop-Hover1.ogg', 0.5, false);
        hover1Ref.current._hoverGain = 0;
        hover1Ref.current.volume = 0;
        // add shit to master volume changes for hover element
        try
        {
          hover1Ref.current._masterUnsub = masterVolume.subscribe((m) => {
            try { hover1Ref.current.volume = Math.max(0, Math.min(1, (hover1Ref.current._baseVolume || 0.5) * m * (hover1Ref.current._hoverGain || 0)) ); } catch (e) {}
          });
        } catch (e) {}
      } catch (e) { hover1Ref.current = null; }
      try
      {
        hover2Ref.current = createAudioElement('/Audio/IntroLoop-Hover2.ogg', 0.5, false);
        hover2Ref.current._hoverGain = 0;
        hover2Ref.current.volume = 0;
        try
        {
          hover2Ref.current._masterUnsub = masterVolume.subscribe((m) => {
            try { hover2Ref.current.volume = Math.max(0, Math.min(1, (hover2Ref.current._baseVolume || 0.5) * m * (hover2Ref.current._hoverGain || 0)) ); } catch (e) {}
          });
        } catch (e) {}
      } catch (e) { hover2Ref.current = null; }
    }
    return audioRef.current;
  }, [createAudioElement]);

  // shit to make the audios for homepage not lag
  const audioCtxRef = useRef(null);
  const webBuffersRef = useRef({ base: null, h1: null, h2: null });
  const webSrcRef = useRef({ base: null, h1: null, h2: null });
  const webGainsRef = useRef({ master: null, base: null, h1: null, h2: null });
  const webLoadedRef = useRef(false);

  const preloadWebAudio = useCallback(async () =>
  {
    if (webLoadedRef.current) return;
    try
    {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = audioCtxRef.current || new AudioContext();
      audioCtxRef.current = ctx;

      // master gain to apply masterVolume easily
      const masterGain = ctx.createGain();
      masterGain.gain.value = masterVolume.getMasterVolume();
      masterGain.connect(ctx.destination);
      webGainsRef.current.master = masterGain;

      const baseGain = ctx.createGain(); baseGain.gain.value = 0.0; baseGain.connect(masterGain);
      const h1Gain = ctx.createGain(); h1Gain.gain.value = 0.0; h1Gain.connect(masterGain);
      const h2Gain = ctx.createGain(); h2Gain.gain.value = 0.0; h2Gain.connect(masterGain);
      webGainsRef.current.base = baseGain;
      webGainsRef.current.h1 = h1Gain;
      webGainsRef.current.h2 = h2Gain;

      const fetchAndDecode = async (url) =>
      {
        const res = await fetch(url);
        const ab = await res.arrayBuffer();
        return await ctx.decodeAudioData(ab);
      };

      const [baseBuf, h1Buf, h2Buf] = await Promise.all([
        fetchAndDecode('/Audio/IntroLoop-Base.ogg'),
        fetchAndDecode('/Audio/IntroLoop-Hover1.ogg'),
        fetchAndDecode('/Audio/IntroLoop-Hover2.ogg'),
      ]);
      webBuffersRef.current.base = baseBuf;
      webBuffersRef.current.h1 = h1Buf;
      webBuffersRef.current.h2 = h2Buf;
      webLoadedRef.current = true;

      // add shit to master volume changes
      try { webGainsRef.current._masterUnsub = masterVolume.subscribe((m) => { try { if (webGainsRef.current.master) webGainsRef.current.master.gain.setValueAtTime(m, audioCtxRef.current.currentTime); } catch (e) {} }); } catch (e) {}
    }
    catch (e)
    {
      // fail silently, keep HTMLAudio fallback
      console.warn('WebAudio preload failed', e);
      webLoadedRef.current = false;
    }
  }, []);

  const startWebAudioLoop = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || !webLoadedRef.current) return false;
    if (webSrcRef.current.base) return true; // already started

    try
    {
      const now = ctx.currentTime;
      const startAt = now + 0.05;

      // restore master volume since i forgor to do that earlier when user comes back to homepage
      // this is to hopefully fix dumb sequence audio transition
      try
      {
        const master = webGainsRef.current.master;
        if (master && typeof masterVolume.getMasterVolume === 'function')
        {
          const mv = masterVolume.getMasterVolume();
          master.gain.cancelScheduledValues(now);
          master.gain.setValueAtTime(mv, now);
        }
      }
      catch (e) {}

      const makeSource = (buffer, gainNode) =>
      {
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        src.connect(gainNode);
        src.start(startAt);
        return src;
      };

      if (webBuffersRef.current.base) webSrcRef.current.base = makeSource(webBuffersRef.current.base, webGainsRef.current.base);
      if (webBuffersRef.current.h1) webSrcRef.current.h1 = makeSource(webBuffersRef.current.h1, webGainsRef.current.h1);
      if (webBuffersRef.current.h2) webSrcRef.current.h2 = makeSource(webBuffersRef.current.h2, webGainsRef.current.h2);

      // make sure audio is at 0.5 volume when starting
      try { webGainsRef.current.base.gain.setValueAtTime(0.5, startAt); } catch (e) {}
      return true;
    }
    catch (e) { console.warn('startWebAudioLoop failed', e); return false; }
  }, []);

  const stopWebAudioLoop = useCallback((duration = 0) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !webLoadedRef.current) return;
    try
    {
      const master = webGainsRef.current.master;
      const now = ctx.currentTime;
      if (duration > 0)
      {
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(0, now + duration / 1000);
      }
      const stopAfter = now + (duration ? duration / 1000 + 0.02 : 0.02);
      setTimeout(() =>
      {
        ['base','h1','h2'].forEach((k) =>
        {
          try { if (webSrcRef.current[k]) { webSrcRef.current[k].stop(); webSrcRef.current[k].disconnect(); webSrcRef.current[k] = null; } } catch (e) {}
        });
      }, (stopAfter - ctx.currentTime) * 1000 + 10);
    } catch (e) {}
  }, []);

  // audio fade control refs
  const fadeRafRef = useRef(null);
  const desiredVolumeRef = useRef(0.5);
  const allowPlayOnFadeRef = useRef(false);
  const playedSinceFadeRef = useRef(false);

  const playLoopImmediate = React.useCallback(async () =>
  {
    try
    {
      // I JUST FIXED THIS SHIT WHY DID IT BREAK
      if (!introDone) return;
      // prefer WebAudio gapless playback when buffers are loaded
      try
      {
        if (webLoadedRef.current && audioCtxRef.current)
        {
          // resume shit if it was suspended
          try { if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume(); } catch (e) {}
          const started = startWebAudioLoop();
          if (started) { setAutoplayBlocked(false); playedSinceFadeRef.current = true; return; }
        }
      } catch (e) {}

      const a = getOrCreateAudio();
      // restore base volume for playback and apply master multiplier
      try { a._baseVolume = desiredVolumeRef.current; } catch (e) {}
      try { masterVolume.applyToElement(a); } catch (e) {}
      try { a.currentTime = 0; } catch (e) {}

      const toPlay = [a.play && a.play()];
      // attempt to play hover variants as well, should start muted
      const h1 = hover1Ref.current;
      const h2 = hover2Ref.current;
      if (h1)
      {
        try { h1.currentTime = 0; } catch (e) {}
        toPlay.push(h1.play && h1.play());
      }
      if (h2)
      {
        try { h2.currentTime = 0; } catch (e) {}
        toPlay.push(h2.play && h2.play());
      }

      const results = await Promise.allSettled(toPlay);
      const anySucceeded = results.some(r => r.status === 'fulfilled');
      if (!anySucceeded)
      {
        console.warn('Autoplay blocked when attempting immediate play (all tracks)', results);
        setAutoplayBlocked(true);
        setRequireEnable(true);
      }
      else
      {
        setAutoplayBlocked(false);
        playedSinceFadeRef.current = true;
      }
    }
    catch (err)
    {
      console.warn('Start sequence failed', err);
      setAutoplayBlocked(true);
      setRequireEnable(true);
    }
  }, [getOrCreateAudio, introDone]);

  // fade audio to 0 over duration, then pause and reset currentTime
  const fadeOutAndStopAudio = React.useCallback((duration = 400) => {
    // prefer WebAudio stop for gapless playback
    try
    {
      if (audioCtxRef.current && webLoadedRef.current)
      {
        stopWebAudioLoop(duration);
        return;
      }
    } catch (e) {}

    const audio = audioRef.current;
    if (!audio) return;
    // cancel any weird shit going on 
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
          // keep hover tracks playing (even at volume 0) to avoid playback delays
          // restore base volume for the next time we start playback and apply master multiplier
          try { audio._baseVolume = desiredVolumeRef.current; } catch (e) {}
          try { masterVolume.applyToElement(audio); } catch (e) {}
        }
        catch (e) {}
      }
    };
    fadeRafRef.current = requestAnimationFrame(step);
  }, []);

  // start audio and try to play only after intro has completed
  useEffect(() =>
  {
  if (!introDone) return;
  // if audio already exists (preloaded during fade), reuse it
  const audio = getOrCreateAudio();

    let triedMp3 = false;

    // only preload here. Actual playback should only start when the
    // visual UI fade starts (fadeStarted) so we do not call play() here
    const onError = () =>
    {
      console.warn('Audio element error for', audio.src);
      if (!triedMp3)
      {
        triedMp3 = true;
        audio.src = '/loop.mp3';
        // no auto-play here, just update src for future shit
      }
    };

    audio.addEventListener('error', onError);

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
        try { audioRef.current.pause(); } catch (e) {}
        try { audioRef.current.src = ''; } catch (e) {}
        audioRef.current = null;
      }
      if (hover1Ref.current)
      {
        try { if (hover1Ref.current._hoverGainRaf) cancelAnimationFrame(hover1Ref.current._hoverGainRaf); } catch (e) {}
        try { if (hover1Ref.current._masterUnsub) hover1Ref.current._masterUnsub(); } catch (e) {}
        try { hover1Ref.current.pause(); } catch (e) {}
        try { hover1Ref.current.src = ''; } catch (e) {}
        hover1Ref.current = null;
      }
      if (hover2Ref.current)
      {
        try { if (hover2Ref.current._hoverGainRaf) cancelAnimationFrame(hover2Ref.current._hoverGainRaf); } catch (e) {}
        try { if (hover2Ref.current._masterUnsub) hover2Ref.current._masterUnsub(); } catch (e) {}
        try { hover2Ref.current.pause(); } catch (e) {}
        try { hover2Ref.current.src = ''; } catch (e) {}
        hover2Ref.current = null;
      }
      // stop and cleanup WebAudio if present
      try { if (webLoadedRef.current) stopWebAudioLoop(0); } catch (e) {}
      try { if (webGainsRef.current && webGainsRef.current._masterUnsub) webGainsRef.current._masterUnsub(); } catch (e) {}
      try { if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch(e){} audioCtxRef.current = null; } } catch (e) {}
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
      if (skipMainHideRef.current)
      {
        // special condition: return from RGL — restore background and show only /main UI
        skipMainHideRef.current = false;
        if (!mountSpace) setMountSpace(true);
        // wait a frame then start fade-in
        requestAnimationFrame(() => requestAnimationFrame(() => setFadeStarted(true)));
        // ensure header and Ari are NOT shown cuz /main has its own UI
        setHeaderMounted(false);
        setAriMounted(false);
        setHeaderVisible(false);
        setAriVisible(false);
        return;
      }
      // entering main: fade out header, fade audio out, then unmount
      setHeaderVisible(false);
      // fade out Ari then unmount after same delay as header
      setAriVisible(false);
      // start audio fade-out when the UI is called to fade out
      fadeOutAndStopAudio(420);
      // allow the fade to finish then unmount
	const t = setTimeout(() => setHeaderMounted(false), 500);
	setTimeout(() => setAriMounted(false), 520); // notice ari lags a bit behind, what a guy
	return () => clearTimeout(t);
    }
    else if (currentPath === '/')
    {
      // returning to rootn
      setHeaderMounted(true);
      setAriMounted(true);
      // small timeout to allow mount before fade in
    	const t = setTimeout(() => { if (introDone) setHeaderVisible(true); }, 40);
    	setTimeout(() => { if (introDone) setAriVisible(true); }, 60);
      // ensure space mounted and preload webaudio so playback can start quickly
      if (!mountSpace) setMountSpace(true);
      try { preloadWebAudio(); } catch (e) {}
      // trigger the UI fade only if the intro has already completed
      if (introDone)
      {
        requestAnimationFrame(() => requestAnimationFrame(() => setFadeStarted(true)));
      }
      return () => clearTimeout(t);
    }
    else if (currentPath === '/RGL')
    {
      // entering the RGL sequence: hide all UI, fade audio, and remove background
      setHeaderVisible(false);
      setAriVisible(false);
      fadeOutAndStopAudio(420);
      // fade the space/background out then unmount it
      setFadeStarted(false);
      setTimeout(() => setMountSpace(false), SPACE_FADE_MS + 40);
      setHeaderMounted(false);
      setAriMounted(false);
    }
    else
    {
      // any other subpage ensure header + Ari are not visible or mounted
      setHeaderVisible(false);
      setAriVisible(false);
      setHeaderMounted(false);
      setAriMounted(false);
    }
  }, [currentPath, getOrCreateAudio, fadeOutAndStopAudio]);

  // play or stop/fade audio when header becomes visible/invisible
  useEffect(() =>
  {
    // awful shit right here, im loosing my mind #2
  }, [headerVisible]);

  // when the visual fade starts, only auto-play loop on the root UI (/)
  // not on subpages. Subpages should never start loop on fade other wise im killing myself
  useEffect(() =>
  {
    if (!fadeStarted) return;
    if (currentPath === '/' && !playedSinceFadeRef.current)
    {
      playLoopImmediate();
    }
  }, [fadeStarted, currentPath, playLoopImmediate]);

  // ensure that when header shows again (UI being called to fade back in),
  // we play the loop from the start if we haven't already for this cycle.
  useEffect(() =>
  {
    if (headerVisible)
    {
      // only start when UI visual has already been enabled (not during intro bc shit kept breaking on this condition)
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
    // AA
    if (!mountSpace) setMountSpace(true);
    // preload audio but don't play yet
    try
    {
      getOrCreateAudio();
      try { preloadWebAudio(); } catch (e) {}
    }
    catch (e) {}
  };

  // used to request overlay to try playback under a user gesture, whatever that does
  const [playRequestedKey, setPlayRequestedKey] = useState(0);

  const handleIntroComplete = useCallback(() =>
  {
    // remove shit by IntroOverlay
    setIntroDone(true);
    // no playback here. playback will begin when the UI visual
    // fade starts! the loop does not play while the intro video is visible

    // I FUCKING FORGOT TO MOUNT THIS SHIT
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
    try
    {
      allowPlayOnFadeRef.current = true;
      setPlayRequestedKey((k) => k + 1);
      if (fadeStarted && headerVisible)
      {
        // prefer WebAudio start if its available
        try {
          if (webLoadedRef.current && audioCtxRef.current) {
            try { if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume(); } catch (e) {}
            startWebAudioLoop();
            setAutoplayBlocked(false);
            if (!videoAutoplayBlocked) setRequireEnable(false);
            return;
          }
        }
        catch (e) {}
        const audio = getOrCreateAudio();
        // try to play main + hover tracks under the user gesture
        const toPlay = [];
        try { toPlay.push(audio.play && audio.play()); } catch (e) {}
        if (hover1Ref.current) try { toPlay.push(hover1Ref.current.play && hover1Ref.current.play()); } catch (e) {}
        if (hover2Ref.current) try { toPlay.push(hover2Ref.current.play && hover2Ref.current.play()); } catch (e) {}
        try { await Promise.allSettled(toPlay); } catch (e) {}
        // mute state is not tracked in the UI
        setAutoplayBlocked(false);
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

  

  // if we're on a mobile device, skip the intro video entirely and
  // immediately mount the space UI, start the fade transition, and
  // attempt to start the loop audio (this will still respect autoplay
  // policies and surface the enable modal if blocked).
  // support for mobile will have to wait
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
  // bring the background in immediately.

  // for some reason this fucking broke while adding new audio files and changing transition sequence
  // this code can be so fucking lame for no reason
  useEffect(() =>
  {
    const path = window.location.pathname || '/';
    if (path === '/') return; // keep intro on home
    // skip intro on subpages, should only be played on root page
    setIntroDone(true);
    setMountSpace(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setFadeStarted(true)));
    if (path === '/main')
    {
      setHeaderMounted(false);
      setHeaderVisible(false);
    }
  // run once on mount
  }, []);

  // hover audio control for the Start button: raise hover tracks to full, should be scaled by master volume
  const handleStartHoverEnter = React.useCallback(() =>
  {
    try
    {
      // if WebAudio is available use smooth param ramps on gain nodes
      const ctx = audioCtxRef.current;
      if (ctx && webGainsRef.current && webGainsRef.current.h1)
      {
        try
        {
          const dur = .6;
          const now = ctx.currentTime;
          // base volume per hover track is 0.5, dont forget
          webGainsRef.current.h1.gain.cancelScheduledValues(now);
          webGainsRef.current.h1.gain.setValueAtTime(webGainsRef.current.h1.gain.value || 0, now);
          webGainsRef.current.h1.gain.linearRampToValueAtTime(0.5, now + dur);
          webGainsRef.current.h2.gain.cancelScheduledValues(now);
          webGainsRef.current.h2.gain.setValueAtTime(webGainsRef.current.h2.gain.value || 0, now);
          webGainsRef.current.h2.gain.linearRampToValueAtTime(0.5, now + dur);
          return;
        } catch (e) {}
      }
      // fallback for elements or things
      const fade = (el, toGain, duration = 600) =>
      {
        if (!el) return;
        try { if (el._hoverGainRaf) cancelAnimationFrame(el._hoverGainRaf); } catch (e) {}
        const start = performance.now();
        const from = typeof el._hoverGain === 'number' ? el._hoverGain : 0;
        const step = (now) =>
        {
          const t = Math.min(1, (now - start) / duration);
          const v = from + (toGain - from) * t;
          el._hoverGain = v;
          try { const m = masterVolume.getMasterVolume(); el.volume = Math.max(0, Math.min(1, (el._baseVolume || 1.0) * m * v)); } catch (e) {}
          if (t < 1)
          {
            el._hoverGainRaf = requestAnimationFrame(step);
          }
          else
          {
            el._hoverGainRaf = null;
          }
        };
        el._hoverGainRaf = requestAnimationFrame(step);
      };
      fade(hover1Ref.current, 1.0);
      fade(hover2Ref.current, 1.0);
    }
    catch (e) {}
  }, []);

  const handleStartHoverLeave = React.useCallback(() =>
  {
    try
    {
      const ctx = audioCtxRef.current;
      if (ctx && webGainsRef.current && webGainsRef.current.h1)
      {
        try
        {
          const dur = 0.6;
          const now = ctx.currentTime;
          webGainsRef.current.h1.gain.cancelScheduledValues(now);
          webGainsRef.current.h1.gain.setValueAtTime(webGainsRef.current.h1.gain.value || 0, now);
          webGainsRef.current.h1.gain.linearRampToValueAtTime(0.0, now + dur);
          webGainsRef.current.h2.gain.cancelScheduledValues(now);
          webGainsRef.current.h2.gain.setValueAtTime(webGainsRef.current.h2.gain.value || 0, now);
          webGainsRef.current.h2.gain.linearRampToValueAtTime(0.0, now + dur);
          return;
        } catch (e) {}
      }
      const fadeOut = (el, duration = 600) =>
      {
        if (!el) return;
        try { if (el._hoverGainRaf) cancelAnimationFrame(el._hoverGainRaf); } catch (e) {}
        const start = performance.now();
        const from = typeof el._hoverGain === 'number' ? el._hoverGain : 0;
        const step = (now) =>
        {
          const t = Math.min(1, (now - start) / duration);
          const v = from + (0 - from) * t;
          el._hoverGain = v;
          try { const m = masterVolume.getMasterVolume(); el.volume = Math.max(0, Math.min(1, (el._baseVolume || 1.0) * m * v)); } catch (e) {}
          if (t < 1)
          {
            el._hoverGainRaf = requestAnimationFrame(step);
          }
          else
          {
            el._hoverGainRaf = null;
            try { el.volume = 0; } catch (e) {}
          }
        };
        el._hoverGainRaf = requestAnimationFrame(step);
      };
      fadeOut(hover1Ref.current);
      fadeOut(hover2Ref.current);
    }
    catch (e) {}
  }, []);

  const spaceDotsRef = useRef(null);
  const originalSpaceSpeedRef = useRef(0.6); // matches SpaceDots speedFactor
  const navigatingRef = useRef(false);
  const rglPreloadRef = useRef({});
  const skipMainHideRef = useRef(false);

  // listen for RGL trigger event fired from other components
  useEffect(() =>
  {
    const onEnter = () => { handleRGLSequence(); };
    window.addEventListener('enter-rgl', onEnter);
    return () => window.removeEventListener('enter-rgl', onEnter);
  }, []);

  // listen for RGL open-complete to restore UI and navigate back to /main
  useEffect(() =>
  {
    const onOpenFinished = () =>
    {
      // mark that we should NOT run the default '/main' hide behavior
      skipMainHideRef.current = true;
      // navigate to /main and useEffect for currentPath will consult skipMainHideRef
      navigate('/main');
    };
    window.addEventListener('rgl-open-finished', onOpenFinished);
    return () => window.removeEventListener('rgl-open-finished', onOpenFinished);
  }, []);

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
        sfx._baseVolume = 0.9;
        try { sfx.volume = sfx._baseVolume * masterVolume.getMasterVolume(); } catch (e) {}
        try { masterVolume.applyToElement(sfx); } catch (e) {}
        sfx.play().catch(err =>
        {
          // try mp3 fallback, will prob remove this later
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

  const handleRGLSequence = async () =>
  {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    try
    {
      // preload RGL videos to avoid wait time on navigation
      try
      {
        const p = rglPreloadRef.current || {};
        if (!p.close)
        {
          const vClose = document.createElement('video');
          vClose.preload = 'auto';
          vClose.src = '/Video/TF2_CompDoors-CLOSE.mp4';
          try { vClose._baseVolume = 1.0; } catch(e){}
          try { masterVolume.applyToElement(vClose); } catch(e){}
          try { vClose.load(); } catch(e){}
          p.close = vClose;
        }
        if (!p.open)
        {
          const vOpen = document.createElement('video');
          vOpen.preload = 'auto';
          vOpen.src = '/Video/TF2_CompDoors-OPEN.mp4';
          try { vOpen._baseVolume = 1.0; } catch(e){}
          try { masterVolume.applyToElement(vOpen); } catch(e){}
          try { vOpen.load(); } catch(e){}
          p.open = vOpen;
        }
        rglPreloadRef.current = p;
      }
      catch (e) { /* preload best-effort — ignore errors */ }

      // preload RGL icon PNG and XML atlas so the icon shows immediately
      try
      {
        const p = rglPreloadRef.current || {};
        if (!p.icon)
        {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = '/RGL-Icon.png';
          p.icon = img;
        }
        if (!p.iconXML)
        {
          // fetch xml atlas and cache text
          fetch('/RGL-Icon.xml').then(r => r.text()).then((txt) => { try { p.iconXML = txt; rglPreloadRef.current = p; } catch(e){} }).catch(()=>{});
          // HAHA THIS SHIT WORKS I CAN ADD CUSTOM ANIMATIONS LIKE FNF
        }
        rglPreloadRef.current = p;
      }
      catch (e) { /* ignore */ }

      // hide header and ari immediately
      setHeaderVisible(false);
      setAriVisible(false);
      // start audio fade
      fadeOutAndStopAudio(420);
      // trigger space/background fade out
      setFadeStarted(false);
      // wait for the fade to complete then unmount background and navigate
      setTimeout(() =>
      {
        setMountSpace(false);
        setHeaderMounted(false);
        setAriMounted(false);
        navigate('/RGL');
      }, SPACE_FADE_MS + 40);
    }
    catch (e)
    {
      console.warn('RGL sequence failed', e);
      navigate('/RGL');
    }
    finally
    {
      // unlock after a short grace (do not block forever)
      setTimeout(() => { navigatingRef.current = false; }, SPACE_FADE_MS + 120);
    }
  };

  const mainAudioRef = useRef(null);

  const playMainLoop = useCallback(async () =>
    {
    // choose winter variant when current month is December
    let desiredSrc = '/Audio/Main-Loop.ogg';
    try
    {
      const monthStr = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', month: 'numeric' }).format(new Date());
      const month = parseInt(monthStr, 10);
      if (month === 12) desiredSrc = '/Audio/Main-Loop_WINTER.ogg';
    }
    catch (e) { /* fallback to default */ }

    if (!mainAudioRef.current)
    {
      mainAudioRef.current = createAudioElement(desiredSrc);
    }
    const mainAudio = mainAudioRef.current;
    // if audio already exists but src differs from desired, switch to desired
    try
    {
      if (mainAudio && mainAudio.src && !mainAudio.src.includes(desiredSrc))
      {
        mainAudio.src = desiredSrc;
        try { mainAudio.currentTime = 0; } catch (e) {}
      }
    }
    catch (e) {}
    try
    {
      // set per-file base volume and apply master multiplier
      mainAudio._baseVolume = 0.35;
      try { masterVolume.applyToElement(mainAudio); } catch (e) {}
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

        {/* This shit controls for the spaceDots shown in the background!!
            SpaceDots should be visible on all pages, while the main
            header and Ari only appear on root and /main. */}
        {(mountSpace || introDone) && (
        <div style=
        {{
          opacity: fadeStarted ? 1 : 0,
          transition: `opacity ${SPACE_FADE_MS}ms ease`,
          pointerEvents: introDone ? 'auto' : 'none',
        }}>
          <SpaceDots ref={spaceDotsRef} count={140} color="#d4d4d4" minSize={0.9} maxSize={3.0} speedFactor={originalSpaceSpeedRef.current} />
          {currentPath === '/' && ariMounted && (
            <div style={{ opacity: ariVisible ? 1 : 0, transition: 'opacity 360ms ease' }}>
              <FloatingImages src={'/AriFloats.png'} count={1} speed={0.08} scaleMin={0.6} scaleMax={1.1} />
            </div>
          )}
          {currentPath === '/' && headerMounted && (
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
                    style=
                    {{
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
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#ffffff25'; try{ handleStartHoverEnter(); } catch (err){} }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff10'; e.currentTarget.style.transform = 'scale(1)'; try{ handleStartHoverLeave(); } catch (err){} }}
                  >
                    Start
                  </button>
                </div>
              </div>
              <div className="copyright-line">
                © Arielwolf24 2018 - 2025. <span style={{ textDecoration: 'underline' }}>All rights reserved.</span>
              </div>
              </header>
            </div>
          )}

          {(autoplayBlocked || enableError) && (
            <div style={{ position: 'fixed', bottom: 12, right: 12, background: 'rgba(255,255,255,0.95)', padding: 8, borderRadius: 8, zIndex: 9999, minWidth: 180 }}>
              {autoplayBlocked && <div style={{ fontSize: 12, color: '#444', marginTop: 6 }}>Autoplay blocked — sound will start when allowed</div>}
              {enableError && <div style={{ fontSize: 13, color: '#a00', marginTop: 6 }}>{enableError}</div>}
            </div>
          )}

          {/* requireEnable modal removed from here rendered at top-level so it overlays the intro video */}
          {/* keep background mounted above routes so SpaceDots stays persistent */}
          <Router>
            <Route path="/">
              {/* Root content is already the header area above. Nothing extra needed. */}
            </Route>
            <Route path="/main">
              <div style={{ position: 'relative', zIndex: 2 }}>
                <Main />
              </div>
            </Route>
            <Route path="/discord">
              <SubpageFade>
                <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>
                  <div style={{ textAlign: 'center', color: '#fff', padding: 24 }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 4 }}>
                      <strong>Arielwolf24</strong>
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 600, opacity: 0.9, marginBottom: 24 }}>
                      <strong>Arielwolf24#7169</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/main')}
                      style={{ padding: '10px 18px', borderRadius: 8, background: '#ffffff10', border: '1px solid #ffffff40', color: '#fff', cursor: 'pointer' }}
                    >
                      Back to /main
                    </button>
                  </div>
                </div>
              </SubpageFade>
            </Route>
            <Route path="/FurAffinityWarning">
              {/*hidden & scaled up for 1s, then snaps in and eases to normal scale*/}
              <FurAffinityWarningSequence />
            </Route>
          </Router>
          {/* RGL route removed here so video remains mounted when background unmounts. */}
        </div>
      )}
        {/* Render RGL route outside background block so video persists during fade */}
        <Router>
          <Route path="/RGL">
            <div style={{ position: 'fixed', inset: 0, zIndex: 10000, pointerEvents: 'auto' }}>
              <RGL />
            </div>
          </Route>
        </Router>

        {/*fixed bottom-left across the site*/}
      <div style={{ position: 'fixed', left: 12, bottom: 12, zIndex: 40000, pointerEvents: 'auto' }}>
        <div style={{ transform: 'scale(1)', transformOrigin: 'bottom left', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6, background: 'transparent' }}>
          <VolumeControl size={220} />
        </div>
      </div>
    </div>
  );
}

function FurAffinityWarningSequence()
{
  const [phase, setPhase] = React.useState('hidden'); // 'hidden' -> 'jump' -> 'settle'
  const warningAudioRef = React.useRef(null);
  const [vignetteVisible, setVignetteVisible] = React.useState(false);

  React.useEffect(() =>
  {
    const t1 = setTimeout(() => setPhase('jump'), 1000); // wait 1s hidden
    const t2 = setTimeout(() => setPhase('settle'), 1120); // quick snap towards normal
    // create audio element but don't play until UI appears
    const audio = new Audio('/Audio/WarningLoop.ogg');
    audio.loop = true;
    audio._baseVolume = 0.6;
    try { audio.volume = audio._baseVolume * masterVolume.getMasterVolume(); } catch (e) {}
    warningAudioRef.current = audio;
    try { masterVolume.applyToElement(audio); } catch (e) {}
    return () =>
    {
      clearTimeout(t1);
      clearTimeout(t2);
      if (warningAudioRef.current)
      {
        try
        {
          warningAudioRef.current.pause();
          warningAudioRef.current.currentTime = 0;
        }
        catch (e) {}
        warningAudioRef.current = null;
      }
    };
  }, []);

  // start warning loop when the UI actually appears (phase !== 'hidden')
  React.useEffect(() =>
  {
    if (phase === 'hidden') return;
    const audio = warningAudioRef.current;
    if (!audio) return;
    audio.play().catch(() => {});
  }, [phase]);

  // control vignette: appear instantly with UI, then fade out after 0.3s
  React.useEffect(() =>
  {
    if (phase === 'hidden') return;
    setVignetteVisible(true);
    const t = setTimeout(() => setVignetteVisible(false), 10);
    return () => clearTimeout(t);
  }, [phase]);

  let scale = 1;
  let opacity = 1;
  let transition = 'transform 420ms cubic-bezier(0.21, 1.02, 0.35, 1.0)';

  if (phase === 'hidden')
  {
    scale = 1.18; // slightly larger while hidden
    opacity = 0;
    transition = 'none';
  }
  else if (phase === 'jump')
  {
    scale = 1.02;
    opacity = 1;
    transition = 'transform 90ms cubic-bezier(0.05, 0.9, 0.3, 1.3), opacity 60ms linear';
  }
  else // settle
  {
    scale = 1;
    opacity = 1;
  }

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>
      {/* Full-screen vignette background tinted dark red, scales with viewport */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.02) 35%, rgba(120,0,0,0.85) 100%)',
          mixBlendMode: 'screen',
          opacity: vignetteVisible ? 1 : 0,
          transition: vignetteVisible ? 'none' : 'opacity 300ms ease-out',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          maxWidth: 640,
          padding: 24,
          background: 'rgba(0,0,0,0.7)',
          borderRadius: 12,
          color: '#fff',
          textAlign: 'center',
          fontSize: '1.05rem',
          transform: `scale(${scale})`,
          opacity,
          transformOrigin: 'center',
          transition,
          zIndex: 1,
        }}
      >
                    <h1 style={{ marginTop: 0, marginBottom: 16 }}>FurAffinity Content Warning</h1>
                    <p>
                      Fur Affinity is a website that contains Adult Content otherwise Sensitive Content.<br />
                      This site is not suitable for underage users!<br />
                      <span style={{ display: 'inline-block', marginTop: 10, fontSize: '1.2rem', fontWeight: 800 }}>
                        YOU HAVE BEEN WARNED
                      </span>
                    </p>
                    <p style={{ marginTop: 20 }}>Do you want to continue?</p>
                    <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
                      <a
                        href="https://www.furaffinity.net/user/arielwolf24" 
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '10px 18px',
                          borderRadius: 8,
                          background: '#c62828',
                          color: '#fff',
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        I know what I'm doing, take me there!
                      </a>
                      <button
                        type="button"
                        onClick={() => navigate('/main')}
                        style={{
                          padding: '10px 18px',
                          borderRadius: 8,
                          background: 'transparent',
                          border: '1px solid #fff',
                          color: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        FUCK GO BACK
                      </button>
                    </div>
                  </div>
                </div>
  );
}

export default App;

