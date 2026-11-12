// Phase 1 (theme): Royal Marriage Garden palette (Burgundy, Gold, Ivory, Wine, Brown, Success) mapped on old color names; Playfair serif; card and lift shadows.
import type { Config } from 'tailwindcss';

// Royal Marriage Garden palette (Phase 1 theme). Purane naam (navy, gold, maroon, champagne, ivory)
// ab isi palette par map hain, taaki venues page bhi same look mein rahe.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        burgundy: { DEFAULT: '#720F26', deep: '#400817', soft: '#8C1A33' },
        wine: '#400817',
        gold: { DEFAULT: '#D8B45A', light: '#E9CF8C', line: 'rgba(216,180,90,0.55)' },
        ivory: '#FFF5E6',
        cream: '#FFFFFF',
        brown: '#30201D',
        success: '#23834D',
        // purane naam: venues page aur bache hue pages ke liye alias
        navy: '#720F26',
        maroon: { DEFAULT: '#720F26', deep: '#400817', soft: '#8C1A33' },
        champagne: '#D8B45A',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', '"Iowan Old Style"', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 10px 28px -14px rgba(64,8,23,0.28), 0 2px 6px -2px rgba(64,8,23,0.10)',
        lift: '0 18px 40px -18px rgba(64,8,23,0.45)',
      },
    },
  },
  plugins: [],
};
export default config;
