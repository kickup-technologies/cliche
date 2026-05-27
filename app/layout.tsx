import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { CartProvider } from '@/context/cart-context'
import { FavoritesProvider } from '@/context/favorites-context'
import { CartDrawer } from '@/components/cart-drawer'
import { ScrollRestoration } from '@/components/scroll-restoration'
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://cliche-nine.vercel.app'),
  title: {
    default: 'Bienestar by Cliché — Aromas que Transforman tu Espacio',
    template: '%s | Bienestar by Cliché',
  },
  description: 'Aromas artesanales para el hogar y la ropa. Difusores, esencias y kits de aromaterapia 100% naturales. Fabricados en Colombia. Envío gratis en compras mayores a $300.000 COP.',
  keywords: ['aromas hogar', 'difusor aromas', 'aromaterapia Colombia', 'esencias naturales', 'marketing olfativo', 'cliché aromas', 'bienestar aromas'],
  authors: [{ name: 'Bienestar by Cliché' }],
  creator: 'Bienestar by Cliché',
  publisher: 'Bienestar by Cliché',
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: '/',
    siteName: 'Bienestar by Cliché',
    title: 'Bienestar by Cliché — Aromas que Transforman tu Espacio',
    description: 'Aromas artesanales para el hogar y la ropa. 100% naturales, fabricados en Colombia.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Bienestar by Cliché — Aromas Artesanales Colombianos',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bienestar by Cliché — Aromas que Transforman tu Espacio',
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
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '2074090273450880'
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID
const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID
const PROOFFACTOR_SITE_ID = process.env.NEXT_PUBLIC_PROOFFACTOR_SITE_ID

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.variable} ${playfair.variable} bg-background`}>
      <head>
        {/* Meta Pixel */}
        {META_PIXEL_ID && (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${META_PIXEL_ID}');
              fbq('track', 'PageView');
            `}
          </Script>
        )}

        {/* TikTok Pixel */}
        {TIKTOK_PIXEL_ID && (
          <Script id="tiktok-pixel" strategy="afterInteractive">
            {`
              !function (w, d, t) {
                w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
                ttq.load('${TIKTOK_PIXEL_ID}');
                ttq.page();
              }(window, document, 'ttq');
            `}
          </Script>
        )}
        {/* Prooffactor — social proof notifications */}
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
        {/* GA4 */}
        {GA4_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA4_ID}');
              `}
            </Script>
          </>
        )}

        <ScrollRestoration />
        <CartProvider>
          <FavoritesProvider>
            {children}
            <CartDrawer />
          </FavoritesProvider>
        </CartProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
