import React, { useEffect, useState } from 'react';

// Very small client-side router to avoid adding react-router-dom dependency.
// Uses the browser history API and listens for popstate. Routes are simple
// path strings like '/main'. This component renders the child whose
// `path` prop matches the current location.pathname.
export function Route({ path, children })
{
  const [match, setMatch] = useState(window.location.pathname === path);

  useEffect(() =>
  {
    const onPop = () => setMatch(window.location.pathname === path);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [path]);

  return match ? <>{children}</> : null;
}

export function navigate(to)
{
  if (window.location.pathname === to) return;
  window.history.pushState({}, '', to);
  // dispatch event so listeners update
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export default function Router({ children })
{
  // simple wrapper that re-renders on popstate so Route components update
  const [, setTick] = useState(0);
  useEffect(() =>
  {
    const onPop = () => setTick((t) => t + 1);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return <>{children}</>;
}
