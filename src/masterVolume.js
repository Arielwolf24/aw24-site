// global master volume controller
// exports functions to get/set master volume, apply master to HTMLMediaElements
// and subscribe to changes

const STORAGE_KEY = 'aw24_master_volume_v1';

let volume = 1.0;
try
{
  const v = parseFloat(localStorage.getItem(STORAGE_KEY));
  if (!Number.isNaN(v)) volume = Math.max(0, Math.min(1, v));
} catch (e) {}

const subscribers = new Set();
const tracked = new WeakSet();

function clamp(v) { return Math.max(0, Math.min(1, v)); }

export function getMasterVolume() { return volume; }

export function setMasterVolume(v)
{
  let next = Number.isFinite(v) ? v : parseFloat(v) || 0;
  next = clamp(next);
  // 10% steps so changes are always in increments of 0.1
  next = Math.round(next * 10) / 10;
  if (next === volume) return;
  volume = next;
  try { localStorage.setItem(STORAGE_KEY, String(volume)); } catch (e) {}
  // notify subs n shit
  subscribers.forEach((cb) => { try { cb(volume); } catch (e) {} });
  // what kinf of monster are you that changes master volume and expects
  // existing elements to update automatically without being told?
}

export function subscribe(cb)
{
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

// you blatant idiot, of course you have to call this on the element you want to apply master volume to
export function applyToElement(el)
{
  if (!el || typeof el !== 'object') return;
  // remember original base volume if not set, idiot
  if (typeof el._baseVolume === 'undefined')
  {
    try { el._baseVolume = Number.isFinite(el.volume) ? el.volume : 1.0; } catch (e) { el._baseVolume = 1.0; }
  }
  // adjust audible volume dumb motherfucker
  try { el.volume = clamp(el._baseVolume * volume); } catch (e) {}

  // updaate and track for future updates
  if (!tracked.has(el))
  {
    tracked.add(el);
    const unsub = subscribe(() =>
    {
      try { el.volume = clamp(el._baseVolume * volume); } catch (e) {}
      //  element is removed, we can't easily detect that, so just unsubscribe when we error out
    });
    // ewwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww
    try { el._masterVolumeUnsub = unsub; } catch (e) {}
  }
}

// do master volume to all existing media elements on the page
// ensure that audio/video tags created outside of helpers still honor the
// persisted master volume when the user revisits the site
export function applyToAllMedia()
{
  if (typeof document === 'undefined') return;
  try
  {
    const els = Array.from(document.querySelectorAll('audio,video'));
    els.forEach((el) =>
    {
      try
      {
        if (typeof el._baseVolume === 'undefined')
        {
          el._baseVolume = Number.isFinite(el.volume) ? el.volume : 1.0;
        }
        applyToElement(el);
      }
      catch (e){}
    });
  }
  catch (e){}
}

const masterVolumeAPI =
{
  getMasterVolume,
  setMasterVolume,
  applyToElement,
  subscribe, // subscribe to pewdiepie!!!1!1
};

export default masterVolumeAPI;
