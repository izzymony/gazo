import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { outfit } from "./fonts";

export const metadata: Metadata = {
  title: "Vibaar Admin Portal",
  description: "Comprehensive backoffice administration system for Vibaar platform",
  keywords: "admin, backoffice, ecommerce, nigeria, vibaar, management",
  authors: [{ name: "Vibaar Development Team" }],
  creator: "Vibaar",
  publisher: "Vibaar",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "Vibaar Admin Portal",
    description: "Comprehensive backoffice administration system for Vibaar platform",
    url: "https://admin.vibaar.com",
    siteName: "Vibaar Admin",
    locale: "en_NG",
    type: "website",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <body className={outfit.className}>
        {children}
        <Toaster 
          richColors 
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--background)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
            },
          }}
        />
      </body>
    </html>
  );
}