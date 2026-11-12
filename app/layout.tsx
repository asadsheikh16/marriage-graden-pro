// Phase 1 (theme): root layout — splash, fonts aur metadata. Garden ka naam garden layout se aata hai.
import type { Metadata, Viewport } from 'next';
// Phase 1: Playfair Display (headings) aur Inter (body) — local font files, kisi remote CDN se nahi.
import '@fontsource/playfair-display/400.css';
import '@fontsource/playfair-display/600.css';
import '@fontsource/playfair-display/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './globals.css';
import { Splash } from '@/components/Splash';
import { DEFAULT_BRAND_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: DEFAULT_BRAND_NAME,
  description: 'Marriage garden booking, calendar, enquiry aur payment ka hisaab',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#720F26' };

// Har page request par chalta hai (login aur garden data live rehta hai)
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi">
      <body className="min-h-screen antialiased">
        <Splash />
        {children}
      </body>
    </html>
  );
}
