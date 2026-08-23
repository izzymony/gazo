import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const dmSans = DM_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "myInstaShop Admin Portal",
  description: "Comprehensive backoffice administration system for myInstaShop platform",
  keywords: "admin, backoffice, ecommerce, nigeria, myinstashop, management",
  authors: [{ name: "myInstaShop Development Team" }],
  creator: "myInstaShop",
  publisher: "myInstaShop",
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
    title: "myInstaShop Admin Portal",
    description: "Comprehensive backoffice administration system for myInstaShop platform",
    url: "https://admin.myinstashop.com",
    siteName: "myInstaShop Admin",
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
    <html lang="en" suppressHydrationWarning>
      <body className={dmSans.className}>
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