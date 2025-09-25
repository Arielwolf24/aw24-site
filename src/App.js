import React, { useEffect, useRef, useState } from 'react';
import './App.css';

function useTyping(words, typingSpeed = 100, pause = 800, deletingSpeed = 40) {
  const [text, setText] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timeout;
    const currentWord = words[wordIndex % words.length];

    if (!isDeleting) {
      timeout = setTimeout(() => {
        setText((current) => current + currentWord.charAt(current.length));
      }, typingSpeed);

      if (text === currentWord) {
        timeout = setTimeout(() => setIsDeleting(true), pause);
      }
    } else {
      timeout = setTimeout(() => {
        setText((current) => current.slice(0, -1));
      }, deletingSpeed);

      if (text === '') {
        setIsDeleting(false);
        setWordIndex((i) => i + 1);
      }
    }

    return () => clearTimeout(timeout);
  }, [text, isDeleting, wordIndex, words, typingSpeed, pause, deletingSpeed]);

  return text;
}

function App() {
  const messages = [
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
    'Welp, back to it',
  ];

  const typed = useTyping(messages, 60, 700, 30);
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [requireEnable, setRequireEnable] = useState(true);
  const [enableError, setEnableError] = useState('');

  useEffect(() => {
    const audio = new Audio('/loop.ogg');
    audio.loop = true;
    audio.volume = 0.5;
    audio.muted = false;
    audioRef.current = audio;

    let triedMp3 = false;
    let mounted = true;

    const tryPlay = async () => {
      if (!mounted) return;
      try {
        await audio.play();
        if (!mounted) return;
        setIsPlaying(true);
        setIsMuted(audio.muted);
        setAutoplayBlocked(false);
      } catch (err) {
        console.warn('Autoplay/play failed for', audio.src, err);
        if (!triedMp3) {
          triedMp3 = true;
          audio.src = '/loop.mp3';
          tryPlay();
        } else {
          if (!mounted) return;
          setIsPlaying(false);
          setAutoplayBlocked(true);
        }
      }
    };

    const onError = () => {
      console.warn('Audio element error for', audio.src);
      if (!triedMp3) {
        triedMp3 = true;
        audio.src = '/loop.mp3';
        tryPlay();
      }
    };

    audio.addEventListener('error', onError);
    tryPlay();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') tryPlay();
    };
    const onFocus = () => tryPlay();
    const onLoad = () => tryPlay();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    window.addEventListener('load', onLoad);

    return () => {
      mounted = false;
      audio.removeEventListener('error', onError);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('load', onLoad);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  const handlePause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
  };

  const handleEnableMedia = async () => {
    setEnableError('');
    // Try to (re)initialize and play audio on user gesture
    try {
      // If audio not created, create it here
      if (!audioRef.current) {
        const audio = new Audio('/loop.ogg');
        audio.loop = true;
        audio.volume = 0.5;
        audio.muted = false;
        audioRef.current = audio;
      }
      const audio = audioRef.current;
      // Try play; if it fails, try mp3 fallback
      try {
        await audio.play();
        setIsPlaying(true);
        setIsMuted(audio.muted);
        setAutoplayBlocked(false);
        setRequireEnable(false);
      } catch (err) {
        // switch to mp3 if available
        audio.src = '/loop.mp3';
        await audio.play();
        setIsPlaying(true);
        setIsMuted(audio.muted);
        setAutoplayBlocked(false);
        setRequireEnable(false);
      }
    } catch (err) {
      console.error('Enable media failed', err);
      setEnableError('Playback failed. Please allow audio/video and try again.');
      setRequireEnable(true);
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
  };

  return (
    <div className="App">
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
      </header>

      {/* small floating controls for audio (only Pause remains) */}
      <div style={{ position: 'fixed', bottom: 12, right: 12, background: 'rgba(255,255,255,0.85)', padding: 8, borderRadius: 8, zIndex: 9999 }}>
        {isPlaying && <button onClick={handlePause} aria-label="Pause background sound">Pause</button>}
        {autoplayBlocked && <div style={{ fontSize: 12, color: '#444', marginTop: 6 }}>Autoplay blocked — sound will start when allowed</div>}
      </div>
      {requireEnable && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ maxWidth: 480, padding: 24, background: '#111', borderRadius: 8, textAlign: 'center' }} role="dialog" aria-modal="true">
            <h2 style={{ marginTop: 0 }}>Enable audio & video</h2>
            <p>To continue, you must enable audio and video playback. Click the button below to allow media playback.</p>
            {enableError && <div style={{ color: '#f99', marginBottom: 8 }}>{enableError}</div>}
            <button onClick={handleEnableMedia} style={{ marginTop: 12, padding: '8px 16px' }}>Enable audio & video</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

