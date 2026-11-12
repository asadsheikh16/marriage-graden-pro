// Phase 1 (splash): sirf pehli visit par, 1.2 second, RM crown monogram aur tagline. Koi fake status bar ya clock nahi. Change: timing 1.2s; localStorage flag.
'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand';

const SEEN_KEY = 'rmg-splash-seen'; // localStorage: pehli visit par ek baar
const SHOW_MS = 1200; // 1.5 second se chhota

// Phase 1 (splash): sirf pehli visit par, 1.2 second, koi fake status bar ya clock nahi.
// Splash: sirf pehli baar (is browser mein). Server par hamesha dikhta hai, client par
// agar pehle dekha hai to turant hat jaata hai, taaki hydration na toote.
export function Splash() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(SEEN_KEY) === '1'; } catch { seen = false; }
    if (seen) { setVisible(false); return; }
    // Storage tab likhte hain jab splash band ho (StrictMode ke double-effect se bachne ke liye)
    const fade = setTimeout(() => setLeaving(true), SHOW_MS - 250);
    const gone = setTimeout(() => {
      try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* storage band ho to bhi chalega */ }
      setVisible(false);
    }, SHOW_MS);
    return () => { clearTimeout(fade); clearTimeout(gone); };
  }, []);

  if (!visible) return null;
  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 text-center transition-opacity duration-300 ${leaving ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'radial-gradient(120% 90% at 50% 20%, #8C1A33 0%, #720F26 40%, #400817 100%)' }}
    >
      <div className="rmg-splash-in flex flex-col items-center">
        <svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label="RM monogram">
          <defs>
            <linearGradient id="rmg-gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F2DDA0" />
              <stop offset="100%" stopColor="#B88F3A" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r="56" fill="none" stroke="url(#rmg-gold)" strokeWidth="2" />
          <circle cx="60" cy="60" r="49" fill="none" stroke="#D8B45A" strokeOpacity="0.5" strokeWidth="1" />
          <path d="M34 42 L44 30 L52 40 L60 26 L68 40 L76 30 L86 42 L86 48 L34 48 Z" fill="url(#rmg-gold)" />
          <text x="60" y="84" textAnchor="middle" fontFamily="Georgia, serif" fontSize="34" fontWeight="700" fill="url(#rmg-gold)">RM</text>
        </svg>
        <h1 className="rmg-title mt-5 text-2xl font-semibold" style={{ color: '#FFF5E6' }}>{DEFAULT_BRAND_NAME}</h1>
        <span className="mt-3 block h-px w-24" style={{ background: 'linear-gradient(90deg, transparent, #D8B45A, transparent)' }} />
        <p className="mt-3 text-base" style={{ color: '#E9CF8C' }}>{BRAND_TAGLINE}</p>
      </div>
    </div>
  );
}
