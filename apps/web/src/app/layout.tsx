import type { Metadata, Viewport } from "next";
import Script from "next/script";
import RootLayoutClient from "./rootLayoutClient";
import "../styles/globals.css";
import AppToaster from "@vibaar/ui/common/AppToaster";
import { outfit } from "./fonts";

// One self-hosted brand face (see ./fonts): Outfit, for display and body alike.

export const metadata: Metadata = {
  title: "Vibaar — Turn your attention into income",
  description: "Turn social attention into real, paid, trackable orders — a storefront for Instagram and TikTok sellers that takes payment and tracks delivery.",
  generator: "Next.js",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  keywords: ["online store", "ecommerce", "instagram selling", "tiktok shop", "nigeria", "social commerce", "vibaar"],
  authors: [
    {
      name: "Vibaar",
      url: "https://vibaar.com",
    },
  ],
  metadataBase: new URL('https://vibaar.com'),
  openGraph: {
    title: "Vibaar — Turn your attention into income",
    description: "Turn social attention into real, paid, trackable orders — a storefront for Instagram and TikTok sellers that takes payment and tracks delivery.",
    url: 'https://vibaar.com',
    siteName: 'Vibaar',
    images: [
      {
        url: '/og/og-default.jpg',
        width: 1200,
        height: 630,
        alt: 'Vibaar — turn your attention into income',
      },
    ],
    locale: 'en_NG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Vibaar — Turn your attention into income",
    description: "Turn social attention into real, paid, trackable orders — a storefront for Instagram and TikTok sellers that takes payment and tracks delivery.",
    images: ['/og/og-default.jpg'],
  },
};

// P/Tier4: Next 14 wants viewport in its own export, not inside `metadata`
// (the build warned on this). Behaviour is identical.
export const viewport: Viewport = {
  themeColor: "#FFE500",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1.2,
  minimumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en" className={outfit.variable}>
      <head>
        {/* Google Analytics */}
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}
      </head>
      <body className={outfit.className}>
        <RootLayoutClient>{children}</RootLayoutClient>
        <AppToaster />
      </body>
    </html>
  );
}
