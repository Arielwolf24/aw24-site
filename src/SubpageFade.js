import React, { useEffect, useState } from 'react';

//generic fade-in/fade-out wrapper for subpages
//so i dont have to repeat this code a million times

export default function SubpageFade({ children, duration = 360 })
{
  const [visible, setVisible] = useState(false);

  useEffect(() =>
  {
    const t = setTimeout(() => setVisible(true), 20);
    return () =>
    {
      clearTimeout(t);
      setVisible(false);
    };
  }, []);

  return (
    <div
      style=
      {{
        opacity: visible ? 1 : 0,
        transition: `opacity ${duration}ms ease`,
        position: 'relative',
        zIndex: 3000,
      }}
    >
      {children}
    </div>
  );
}
