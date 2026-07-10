import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/context/auth-context'
import { CartProvider } from '@/context/cart-context'
import { FavoritesProvider } from '@/context/favorites-context'
import { CartDrawer } from '@/components/cart-drawer'
import { ScrollRestoration } from '@/components/scroll-restoration'
import { PageTracker } from '@/components/page-tracker'
import { EditOverlay } from '@/components/edit-overlay'
import { CookieConsent } from '@/components/cookie-consent'
import { PixelManager } from '@/components/pixel-manager'
import { SmoothScroll } from '@/components/smooth-scroll'
import { PageTransition } from '@/components/page-transition'
import { LeadPopup } from '@/components/lead-popup'
import { CartSync } from '@/components/cart-sync'
import { FilmGrain } from '@/components/editorial/film-grain'
import Script from 'next/script'
import './globals.css'

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-sans',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: '--font-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://clichecolombia.com'),
  title: {
    default: 'Cliché Colombia — Aromas que Transforman tu Espacio',
    template: '%s | Cliché Colombia',
  },
  description: 'Aromas artesanales para el hogar y la ropa. Difusores, esencias y kits de aromaterapia 100% naturales. Fabricados en Colombia. Envío gratis en compras mayores a $300.000 COP.',
  keywords: ['aromas hogar', 'difusor aromas', 'aromaterapia Colombia', 'esencias naturales', 'marketing olfativo', 'cliché aromas', 'cliché colombia'],
  authors: [{ name: 'Cliché Colombia' }],
  creator: 'Cliché Colombia',
  publisher: 'Cliché Colombia',
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: '/',
    siteName: 'Cliché Colombia',
    title: 'Cliché Colombia — Aromas que Transforman tu Espacio',
    description: 'Aromas artesanales para el hogar y la ropa. 100% naturales, fabricados en Colombia.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Cliché Colombia — Aromas Artesanales Colombianos',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cliché Colombia — Aromas que Transforman tu Espacio',
    description: 'Aromas artesanales para el hogar y la ropa. 100% naturales, fabricados en Colombia.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  generator: 'Next.js',
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-cliche.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-cliche.png',
  },
}

// Meta Pixel, GA4 y TikTok se cargan desde PixelManager (client) según consent
const PROOFFACTOR_SITE_ID = process.env.NEXT_PUBLIC_PROOFFACTOR_SITE_ID

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.variable} ${playfair.variable} bg-background`}>
      <head>
        {/* Prooffactor — social proof notifications (no datos personales, no requiere consent) */}
        {PROOFFACTOR_SITE_ID && (
          <Script id="prooffactor" strategy="afterInteractive">
            {`
              (function(w,d,s,o,f,js,fjs){
                w['ProofFactor']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
                js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
                js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
              }(window,document,'script','pf','https://cdn.prooffactor.com/script.min.js'));
              pf('init', '${PROOFFACTOR_SITE_ID}');
            `}
          </Script>
        )}
      </head>
      <body className="font-sans antialiased">
        <SmoothScroll />
        <ScrollRestoration />
        <PageTracker />
        <AuthProvider>
        <CartProvider>
          <FavoritesProvider>
            {children}
            <CartDrawer />
            <LeadPopup />
            <CartSync />
          </FavoritesProvider>
        </CartProvider>
        </AuthProvider>
        <FilmGrain />
        <PageTransition />
        <EditOverlay />
        <CookieConsent />
        <PixelManager />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
