import React, { useEffect, useState } from 'react';
import { navigate } from './Router';

export default function Main()
{
  const [visible, setVisible] = useState(false);

  useEffect(() =>
{
    // fade in when mounted
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, pointerEvents: 'auto' }}>
      <div style={{ textAlign: 'center', color: '#fff', opacity: visible ? 1 : 0, transition: 'opacity 360ms ease', padding: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.6rem' }}>/main is empty for now</h1>
        <div style={{ marginTop: 16 }}>
          <button onClick={() => navigate('/')} style={{ padding: '8px 14px' }}>Go back</button>
        </div>
      </div>
    </div>
  );
}
