import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import Providers from "@/components/Providers";
import AppShell from "@/components/AppShell";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0c1a2e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "POSTLAIN — Store Manager",
  description: "Hệ thống quản lý cửa hàng POSTLAIN",
  applicationName: "POSTLAIN",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192x192.png",  sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png",  sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png",  sizes: "180x180", type: "image/png" },
      { url: "/icon-167x167.png",      sizes: "167x167", type: "image/png" },
      { url: "/icon-152x152.png",      sizes: "152x152", type: "image/png" },
    ],
    shortcut: "/favicon-32x32.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "POSTLAIN",
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        {/* Apple PWA — explicit link tags required, metadata API not enough for iOS */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icon-167x167.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-152x152.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="manifest" href="/manifest.json" />

        {/* iOS PWA meta — required for "Add to Home Screen" */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="POSTLAIN" />
        <meta name="apple-touch-fullscreen" content="yes" />

        {/* iOS splash screens — all major iPhone/iPad sizes */}
        {/* iPhone 15 Pro Max / 14 Pro Max (430×932 @3x) */}
        <link rel="apple-touch-startup-image"
          media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          href="/splash/splash-1290x2796.png" />
        {/* iPhone 15 Pro / 14 Pro (393×852 @3x) */}
        <link rel="apple-touch-startup-image"
          media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          href="/splash/splash-1179x2556.png" />
        {/* iPhone 14 / 13 / 12 (390×844 @3x) */}
        <link rel="apple-touch-startup-image"
          media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          href="/splash/splash-1170x2532.png" />
        {/* iPhone 14 Plus / 13 Pro Max (428×926 @3x) */}
        <link rel="apple-touch-startup-image"
          media="screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          href="/splash/splash-1284x2778.png" />
        {/* iPhone 11 Pro / X / XS (375×812 @3x) */}
        <link rel="apple-touch-startup-image"
          media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          href="/splash/splash-1125x2436.png" />
        {/* iPhone 11 / XR / XS Max (414×896 @2x) */}
        <link rel="apple-touch-startup-image"
          media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
          href="/splash/splash-828x1792.png" />
        {/* iPhone 8 / 7 / 6s (375×667 @2x) */}
        <link rel="apple-touch-startup-image"
          media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
          href="/splash/splash-750x1334.png" />
        {/* iPhone SE 1st gen (320×568 @2x) */}
        <link rel="apple-touch-startup-image"
          media="screen and (device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
          href="/splash/splash-640x1136.png" />
      </head>
      <body className={`${montserrat.variable} font-sans antialiased`}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
