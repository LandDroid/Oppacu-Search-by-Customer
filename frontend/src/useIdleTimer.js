// ✅ VALID JavaScript (.js file)
import { useEffect, useRef } from 'react';

export function useIdleTimer({ idleTime = 30 * 60 * 1000, onIdle }) {
  const timer = useRef(null);

  const reset = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(onIdle, idleTime);
  };

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, reset));
    reset();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [idleTime, onIdle]);
}
