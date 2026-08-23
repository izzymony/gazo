import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import Script from "next/script";
import RootLayoutClient from "./rootLayoutClient";
import "../styles/globals.css";
import { Toaster } from "sonner";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-dm-sans",
});

// Note: Switzer font is loaded via CDN in the head section below

export const metadata: Metadata = {
  title: "Vibaar - Sell Smarter on Instagram & TikTok",
  description: "Create your free online store in minutes. Accept payments, manage orders, and grow your business on social media. Built for Nigerian entrepreneurs.",
  generator: "Next.js",
  manifest: "/manifest.json",
  keywords: ["online store", "ecommerce", "instagram selling", "tiktok shop", "nigeria", "social commerce", "vibaar"],
  authors: [
    {
      name: "Vibaar",
      url: "https://vibaar.com",
    },
  ],
  metadataBase: new URL('https://vibaar.com'),
  openGraph: {
    title: "Vibaar - Sell Smarter on Instagram & TikTok",
    description: "Create your free online store in minutes. Accept payments, manage orders, and grow your business on social media.",
    url: 'https://vibaar.com',
    siteName: 'Vibaar',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Vibaar - Your Social Commerce Platform',
      },
    ],
    locale: 'en_NG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Vibaar - Sell Smarter on Instagram & TikTok",
    description: "Create your free online store in minutes. Accept payments, manage orders, and grow your business on social media.",
    images: ['/og-image.png'],
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1.2,
    minimumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en" className={dmSans.variable}>
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
      <body className={dmSans.className}>
        <RootLayoutClient>{children}</RootLayoutClient>
        <Toaster position="top-right"/>
      </body>
    </html>
  );
}
