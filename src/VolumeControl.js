import React, { useEffect, useState } from 'react';
import { getMasterVolume, setMasterVolume, subscribe } from './masterVolume';

function formatIndex(v)
{
  // shits so annying why is this so complicated
  // frame assets are named VolumeBar0001.png .. VolumeBar0011.png
  const idx = Math.round(v * 10); // 0..10
  const num = idx + 1; // 1..11
  return String(num).padStart(4, '0');
}

export default function VolumeControl({ size = 80 })
{
  const [vol, setVol] = useState(getMasterVolume());
  const [visible, setVisible] = useState(false);
  const hideTimerRef = React.useRef(null);

  useEffect(() =>
  {
    const unsub = subscribe((v) => setVol(v));
    return () => unsub();
  }, []);

  // show the bar temporarily when the user changes volume
  const showTemporarily = React.useCallback(() =>
  {
    // clear timer
    if (hideTimerRef.current)
    {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setVisible(true);
    // hide after 2 seconds of inactivity
    hideTimerRef.current = setTimeout(() =>
    {
      setVisible(false);
      hideTimerRef.current = null;
    }, 2000);
  }, []);

  // keyboard handling: '-' to decrease, '=' to increase by 10%
  useEffect(() =>
  {
    const handleKey = (e) =>
    {
      // ignore if input/textarea/contenteditable focused
      const tag = (e.target && e.target.tagName) || '';
      const editable = e.target && (e.target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT');
      if (editable) return;

      if (e.key === '-' || e.key === '_')
      {
        e.preventDefault();
        const next = Math.max(0, Math.round(getMasterVolume() * 10) - 1);
        setMasterVolume(next / 10);
        showTemporarily();
      }
      else if (e.key === '=' || e.key === '+')
      {
        e.preventDefault();
        const next = Math.min(10, Math.round(getMasterVolume() * 10) + 1);
        setMasterVolume(next / 10);
        showTemporarily();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showTemporarily]);

  const imgIndex = formatIndex(vol);
  const src = `/Volume/VolumeBar${imgIndex}.png`;

  // when hidden, move left by the control width + padding
  // extra offset so the control hides further off-screen
  const EXTRA_HIDE_OFFSET = 120; // pixels to hide beyond the control width to hide better
  const hiddenTranslate = `-${Math.round(size + 20 + EXTRA_HIDE_OFFSET)}px`;
  const wrapperStyle =
  {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(0,0,0,0.35)',
    padding: 6,
    borderRadius: 10,
    transform: visible ? 'translateX(0)' : `translateX(${hiddenTranslate})`,
    transition: 'transform 260ms cubic-bezier(0.2, 0.9, 0.2, 1)',
    willChange: 'transform',
    pointerEvents: visible ? 'auto' : 'none',
  };

  return (
    <div title="Use '-' and '=' keys to change volume" style={wrapperStyle}>
      <img src={src} alt={`Volume ${Math.round(vol * 100)}%`} style={{ width: size, height: 'auto', display: 'block' }} />
    </div>
  );
}
